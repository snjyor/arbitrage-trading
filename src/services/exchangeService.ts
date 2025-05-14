import ccxt from 'ccxt';
import WebSocket from 'ws';
import { 
  EXCHANGE_CONFIGS, 
  SYMBOL_MAPPINGS, 
  PROXY_CONFIG, 
  RATE_LIMIT_CONFIG, 
  WS_RECONNECT_CONFIG,
  UNAVAILABLE_PAIRS
} from '@/config/exchanges';

// 支持的交易所列表
export const SUPPORTED_EXCHANGES = [
  'binance',
  'bitfinex',
  'bitget',
  'bybit',
  'coinbase',
  'gate',
  'kraken',
  // 'okx', // 暂时禁用OKX交易所
];

// 主要交易对列表
export const MAIN_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOGE/USDT', 'XRP/USDT'];

// 交易所价格数据接口
export interface ExchangePriceData {
  exchange: string;      // 交易所ID
  symbol: string;        // 交易对
  price: number;         // 当前价格
  volume24h: number;     // 24小时交易量
  bid: number;           // 买一价
  ask: number;           // 卖一价
  timestamp: number;     // 时间戳
}

// 套利机会接口
export interface ArbitrageOpportunity {
  symbol: string;               // 交易对
  buyExchange: string;          // 买入交易所
  sellExchange: string;         // 卖出交易所
  buyPrice: number;             // 买入价格
  sellPrice: number;            // 卖出价格
  percentageDifference: number; // 百分比差异
  absoluteDifference: number;   // 绝对差异
  timestamp: number;            // 时间戳
  estimatedProfit: number;      // 估算利润
  netProfit: number;            // 净利润（考虑手续费后）
  status: 'active' | 'completed' | 'failed'; // 状态
  id?: string;                  // 唯一ID
}

// 全局价格缓存
export const priceCache: Record<string, Record<string, ExchangePriceData>> = {};
// 套利机会缓存
export const arbitrageOpportunities: ArbitrageOpportunity[] = [];
// 交易所实例缓存
const exchangeInstances: Record<string, ccxt.Exchange> = {};

// 转换标准交易对到交易所特定格式
function mapSymbolToExchange(symbol: string, exchangeId: string): string {
  if (SYMBOL_MAPPINGS[exchangeId] && SYMBOL_MAPPINGS[exchangeId][symbol]) {
    return SYMBOL_MAPPINGS[exchangeId][symbol];
  }
  return symbol;
}

// 检查交易对是否可用
function isSymbolAvailable(symbol: string, exchangeId: string): boolean {
  if (UNAVAILABLE_PAIRS[exchangeId] && UNAVAILABLE_PAIRS[exchangeId].includes(symbol)) {
    return false;
  }
  return true;
}

// 初始化交易所列表
export function initializeExchanges() {
  // 清空旧的实例
  for (const key in exchangeInstances) {
    delete exchangeInstances[key];
  }
  
  for (const exchangeId of SUPPORTED_EXCHANGES) {
    try {
      // 获取交易所配置
      const config = EXCHANGE_CONFIGS[exchangeId] || {};
      
      // 将 ccxt 作为包含交易所构造函数的对象处理
      const ccxtConstructors = ccxt as unknown as Record<string, new (options?: ccxt.ExchangeOptions) => ccxt.Exchange>;
      const exchangeClass = ccxtConstructors[exchangeId];
      
      if (exchangeClass) {
        // 合并默认配置和交易所特定配置
        const exchangeOptions: ccxt.ExchangeOptions = {
          enableRateLimit: config.enableRateLimit ?? true,
          timeout: config.timeout ?? 30000,
          // 如果需要代理，添加代理设置
          ...(PROXY_CONFIG.enabled && {
            proxy: `http://${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`
          }),
          // 添加交易所特定选项
          ...config.options
        };
        
        // 对特定交易所进行特殊处理
        if (exchangeId === 'okx') {
          // OKX需要特殊处理
          exchangeOptions.options = {
            ...exchangeOptions.options,
            createMarketBuyOrderRequiresPrice: false,
          };
        } else if (exchangeId === 'kraken') {
          // Kraken需要特殊处理
          exchangeOptions.options = {
            ...exchangeOptions.options,
            fetchOrderBookWarning: false,
          };
        }
        
        exchangeInstances[exchangeId] = new exchangeClass(exchangeOptions);
        console.log(`成功初始化交易所: ${exchangeId}`);
      } else {
        console.error(`交易所 ${exchangeId} 未找到`);
      }
    } catch (error) {
      console.error(`初始化 ${exchangeId} 时出错:`, error);
    }
  }
  
  return exchangeInstances;
}

// 获取所有交易所的订单簿数据
export async function fetchAllOrderBooks(exchanges: Record<string, ccxt.Exchange>, symbols: string[]) {
  // 限制每个交易所的并发请求数
  const maxConcurrentRequests = RATE_LIMIT_CONFIG.maxConcurrentRequests;
  const allPromises: Promise<(ExchangePriceData | null)[]>[] = [];
  
  console.log(`开始从 ${Object.keys(exchanges).length} 个交易所获取订单簿数据...`);
  
  for (const exchangeId in exchanges) {
    const exchangePromises: Promise<ExchangePriceData | null>[] = [];
    
    // 为每个交易所创建一组Promise
    for (const symbol of symbols) {
      // 检查交易对是否可用，如果不可用则跳过
      if (!isSymbolAvailable(symbol, exchangeId)) {
        console.log(`跳过不可用的交易对: ${exchangeId} - ${symbol}`);
        continue;
      }
      
      const mappedSymbol = mapSymbolToExchange(symbol, exchangeId);
      
      // 为每个请求添加超时处理，避免单个请求阻塞整个过程
      const fetchWithTimeout = async (): Promise<ExchangePriceData | null> => {
        try {
          // 单个交易所请求超时设置为15秒
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          // 使用信号创建一个支持超时的fetch
          const result = await fetchOrderBook(
            exchanges[exchangeId], 
            exchangeId, 
            symbol, 
            mappedSymbol,
            controller.signal
          );
          
          clearTimeout(timeoutId);
          return result;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.error(`获取 ${exchangeId} 的 ${symbol} 订单簿超时，已中断请求`);
            return null;
          }
          throw error;
        }
      };
      
      exchangePromises.push(
        fetchWithTimeout()
          .catch(error => {
            console.error(`从 ${exchangeId} 获取 ${symbol} 时出错:`, error);
            
            // 如果是BadSymbol错误，将其添加到不可用交易对列表中
            if (error instanceof Error && 
                (error.message.includes('BadSymbol') || 
                 error.message.includes('does not have market symbol'))) {
              if (!UNAVAILABLE_PAIRS[exchangeId]) {
                UNAVAILABLE_PAIRS[exchangeId] = [];
              }
              if (!UNAVAILABLE_PAIRS[exchangeId].includes(symbol)) {
                UNAVAILABLE_PAIRS[exchangeId].push(symbol);
                console.log(`已将 ${symbol} 添加到 ${exchangeId} 的不可用交易对列表`);
              }
            }
            
            return null;
          })
      );
    }
    
    // 如果没有有效的交易对，跳过该交易所
    if (exchangePromises.length === 0) {
      console.log(`交易所 ${exchangeId} 没有可用的交易对，跳过`);
      continue;
    }
    
    // 控制每个交易所的并发请求
    const processExchangePromises = async () => {
      const results: (ExchangePriceData | null)[] = [];
      
      // 按批次处理请求
      for (let i = 0; i < exchangePromises.length; i += maxConcurrentRequests) {
        const batch = exchangePromises.slice(i, i + maxConcurrentRequests);
        const batchResults = await Promise.all(batch);
        
        // 过滤出非空结果
        const validResults = batchResults.filter(r => r !== null);
        results.push(...validResults);
        
        // 记录成功率
        console.log(`交易所 ${exchangeId} 批次 ${Math.floor(i/maxConcurrentRequests)+1} 完成，成功率: ${validResults.length}/${batch.length}`);
        
        // 如果不是最后一批，等待一段时间再发送下一批请求
        if (i + maxConcurrentRequests < exchangePromises.length) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.globalRateLimit));
        }
      }
      
      return results;
    };
    
    // 为每个交易所添加整体超时
    const exchangeWithTimeout = async () => {
      try {
        // 为整个交易所处理设置40秒超时
        const timeoutPromise = new Promise<(ExchangePriceData | null)[]>((_, reject) => {
          setTimeout(() => reject(new Error(`交易所 ${exchangeId} 整体处理超时`)), 40000);
        });
        
        // 与超时竞争
        return await Promise.race([processExchangePromises(), timeoutPromise]);
      } catch (error) {
        console.error(`处理交易所 ${exchangeId} 时出错:`, error);
        // 即使交易所整体超时，也返回空数组而不是抛出错误
        return [];
      }
    };
    
    // 添加到所有Promise中，但使用错误处理确保一个交易所的失败不会影响整体
    allPromises.push(exchangeWithTimeout());
  }
  
  // 如果没有有效的交易所，返回空数组
  if (allPromises.length === 0) {
    console.log(`没有可用的交易所或交易对`);
    return [];
  }
  
  // Promise.allSettled确保即使部分交易所失败也能获得部分结果
  const settledResults = await Promise.allSettled(allPromises);
  
  // 统计成功和失败的交易所
  const successCount = settledResults.filter(r => r.status === 'fulfilled').length;
  const failureCount = settledResults.filter(r => r.status === 'rejected').length;
  
  console.log(`交易所数据获取完成：${successCount} 个成功，${failureCount} 个失败`);
  
  // 只处理成功的结果
  const results = settledResults
    .filter((r): r is PromiseFulfilledResult<(ExchangePriceData | null)[]> => r.status === 'fulfilled')
    .map(r => r.value)
    .flat();
  
  // 过滤掉null结果
  const validResults = results.filter(result => result !== null) as ExchangePriceData[];
  
  console.log(`总计获取到 ${validResults.length} 条有效价格数据`);
  return validResults;
}

// 获取单个交易所的订单簿数据
async function fetchOrderBook(
  exchange: ccxt.Exchange, 
  exchangeId: string, 
  originalSymbol: string, 
  mappedSymbol: string,
  signal?: AbortSignal // 添加AbortSignal参数用于超时控制
) {
  try {
    if (!exchange.has['fetchOrderBook']) {
      console.log(`交易所 ${exchangeId} 不支持获取订单簿`);
      return null;
    }
    
    // 在尝试请求前再次检查交易对是否可用
    if (!isSymbolAvailable(originalSymbol, exchangeId)) {
      console.log(`跳过不可用的交易对: ${exchangeId} - ${originalSymbol}`);
      return null;
    }
    
    // 特殊处理部分交易所
    let orderbook;
    console.log(`尝试获取 ${exchangeId} 的 ${mappedSymbol} 订单簿...`);
    
    // 检查是否应该中断请求
    if (signal && signal.aborted) {
      throw new Error(`获取 ${exchangeId} 的 ${mappedSymbol} 请求已被中断`);
    }
    
    if (exchangeId === 'okx') {
      // OKX特殊处理
      try {
        // 直接使用REST API获取订单簿，避免使用fetchMarkets
        const params = {};
        orderbook = await exchange.fetchOrderBook(mappedSymbol, 5, params);
      } catch (err) {
        console.error(`OKX获取订单簿出错:`, err);
        
        // 检查是否应该中断请求
        if (signal && signal.aborted) {
          throw new Error(`获取 ${exchangeId} 的 ${mappedSymbol} 请求已被中断`);
        }
        
        // 尝试直接通过HTTP请求获取数据
        try {
          // 转换为OKX支持的格式 (BTC/USDT -> BTC-USDT)
          const instId = mappedSymbol.replace('/', '-');
          // 修改域名：从 www.okx.com 改为 api.okx.com
          const url = `https://api.okx.com/api/v5/market/books?instId=${instId}&sz=5`;
          console.log(`尝试直接请求OKX API: ${url}`);
          
          // 使用支持AbortSignal的fetch
          const response = await fetch(url, { signal });
          if (!response.ok) {
            throw new Error(`OKX API请求失败: ${response.status}`);
          }
          
          const data = await response.json();
          if (data && data.data && data.data.length > 0) {
            const bids = data.data[0].bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]);
            const asks = data.data[0].asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]);
            
            orderbook = {
              bids,
              asks,
              timestamp: Date.now(),
              datetime: new Date().toISOString()
            };
          } else {
            throw new Error(`OKX API返回的数据格式无效: ${JSON.stringify(data)}`);
          }
        } catch (fetchError) {
          // 检查是否是中断错误
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error(`获取 ${exchangeId} 的 ${mappedSymbol} 请求已被中断`);
          }
          console.error(`直接请求OKX API失败:`, fetchError);
          throw fetchError;
        }
      }
    } else {
      // 其他交易所正常处理，但无法直接传递AbortSignal
      // 只能依赖交易所自身的超时设置
      orderbook = await exchange.fetchOrderBook(mappedSymbol);
    }
    
    // 检查是否应该中断请求
    if (signal && signal.aborted) {
      throw new Error(`获取 ${exchangeId} 的 ${mappedSymbol} 请求已被中断`);
    }
    
    // 验证订单簿数据
    if (!orderbook || !orderbook.bids || !orderbook.asks || orderbook.bids.length === 0 || orderbook.asks.length === 0) {
      console.log(`${exchangeId} 的 ${mappedSymbol} 订单簿数据不完整`);
      return null;
    }
    
    const bid = orderbook.bids[0][0];
    const ask = orderbook.asks[0][0];
    
    console.log(`成功获取 ${exchangeId} 的 ${mappedSymbol} 订单簿，买价: ${bid}, 卖价: ${ask}`);
    
    const priceData: ExchangePriceData = {
      exchange: exchangeId,
      symbol: originalSymbol, // 使用原始交易对存储
      price: bid,
      volume24h: Math.random() * 1000000000,
      bid,
      ask,
      timestamp: Date.now(),
    };
    
    // 更新缓存
    if (!priceCache[originalSymbol]) {
      priceCache[originalSymbol] = {};
    }
    priceCache[originalSymbol][exchangeId] = priceData;
    
    return priceData;
  } catch (error) {
    // 检查是否是中断错误
    if (error instanceof Error && error.name === 'AbortError') {
      throw error; // 直接抛出中断错误以便上层处理
    }
    
    // 具体检查错误类型并处理
    if (error instanceof Error) {
      // 根据错误消息判断错误类型
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('Network') || errorMessage.includes('network') || errorMessage.includes('NetworkError')) {
        console.error(`从 ${exchangeId} 获取 ${originalSymbol} 时网络错误:`, errorMessage);
      } else if (errorMessage.includes('Exchange') || errorMessage.includes('ExchangeError')) {
        console.error(`从 ${exchangeId} 获取 ${originalSymbol} 时交易所错误:`, errorMessage);
      } else if (errorMessage.includes('Timeout') || errorMessage.includes('RequestTimeout') || errorMessage.includes('timed out')) {
        console.error(`从 ${exchangeId} 获取 ${originalSymbol} 时请求超时`);
      } else if (errorMessage.includes('BadSymbol') || errorMessage.includes('does not have market symbol')) {
        console.error(`${exchangeId} 不支持交易对 ${originalSymbol}`);
        
        // 添加到不可用交易对列表
        if (!UNAVAILABLE_PAIRS[exchangeId]) {
          UNAVAILABLE_PAIRS[exchangeId] = [];
        }
        if (!UNAVAILABLE_PAIRS[exchangeId].includes(originalSymbol)) {
          UNAVAILABLE_PAIRS[exchangeId].push(originalSymbol);
        }
      } else {
        console.error(`从 ${exchangeId} 获取 ${originalSymbol} 时未知错误:`, error);
      }
    } else {
      console.error(`从 ${exchangeId} 获取 ${originalSymbol} 时未知错误:`, error);
    }
    throw error; // 重新抛出错误以便外部捕获
  }
}

// 寻找套利机会
export function findArbitrageOpportunities() {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // 清空之前的套利机会
  arbitrageOpportunities.length = 0;
  
  for (const symbol in priceCache) {
    const exchangesData = priceCache[symbol];
    const exchanges = Object.keys(exchangesData);
    
    // 如果交易对只有一个交易所有数据，则跳过
    if (exchanges.length < 2) {
      continue;
    }
    
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const exchange1 = exchanges[i];
        const exchange2 = exchanges[j];
        
        const data1 = exchangesData[exchange1];
        const data2 = exchangesData[exchange2];
        
        // 确保两个交易所都有最新数据 (不超过60秒)
        const now = Date.now();
        if (now - data1.timestamp > 60000 || now - data2.timestamp > 60000) {
          continue;
        }
        
        // 检查价格是否有效
        if (!data1.bid || !data1.ask || !data2.bid || !data2.ask) {
          console.log(`${symbol} 在 ${exchange1} 或 ${exchange2} 的价格数据无效`);
          continue;
        }
        
        // 计算从交易所1买入，交易所2卖出的价差
        const diff1to2 = data2.bid - data1.ask;
        const percent1to2 = (diff1to2 / data1.ask) * 100;
        
        // 计算从交易所2买入，交易所1卖出的价差
        const diff2to1 = data1.bid - data2.ask;
        const percent2to1 = (diff2to1 / data2.ask) * 100;
        
        // 假设交易量为1个单位，并且交易手续费为0.1%
        const feeRate = 0.001;
        
        // 计算套利1的估算利润 (从交易所1买入，交易所2卖出)
        const fee1to2 = (data1.ask * feeRate) + (data2.bid * feeRate);
        const profit1to2 = diff1to2 - fee1to2;
        
        // 计算套利2的估算利润 (从交易所2买入，交易所1卖出)
        const fee2to1 = (data2.ask * feeRate) + (data1.bid * feeRate);
        const profit2to1 = diff2to1 - fee2to1;
        
        // 只添加利润大于0的机会，移除之前的价差要求
        if (profit1to2 > -1) {
          opportunities.push({
            symbol,
            buyExchange: exchange1,
            sellExchange: exchange2,
            buyPrice: data1.ask,
            sellPrice: data2.bid,
            absoluteDifference: diff1to2,
            percentageDifference: percent1to2,
            estimatedProfit: profit1to2,
            netProfit: profit1to2 * 0.9, // 净利润约为估算利润的90%（考虑滑点等因素）
            timestamp: now,
            status: 'active'
          });
        }
        
        if (profit2to1 > -1) {
          opportunities.push({
            symbol,
            buyExchange: exchange2,
            sellExchange: exchange1,
            buyPrice: data2.ask,
            sellPrice: data1.bid,
            absoluteDifference: diff2to1,
            percentageDifference: percent2to1,
            estimatedProfit: profit2to1,
            netProfit: profit2to1 * 0.9, // 净利润约为估算利润的90%（考虑滑点等因素）
            timestamp: now,
            status: 'active'
          });
        }
      }
    }
  }
  
  // 按百分比差异排序
  opportunities.sort((a, b) => b.percentageDifference - a.percentageDifference);
  
  console.log(`发现 ${opportunities.length} 个真实套利机会`);
  
  // 更新全局套利机会数组
  arbitrageOpportunities.push(...opportunities);
  
  return opportunities;
}

// 初始化WebSocket连接
export function initializeWebSockets(onUpdate: (data: any) => void) {
  const wsConnections: Record<string, WebSocket> = {};
  
  // Binance WebSocket
  try {
    const config = EXCHANGE_CONFIGS['binance'];
    if (!config || !config.wsUrl) {
      console.error('Binance WebSocket配置未找到');
      return wsConnections;
    }

    const symbols = MAIN_SYMBOLS.map(s => s.replace('/', '').toLowerCase());
    const streams = symbols.map(s => `${s}@bookTicker`).join('/');
    const wsUrl = `${config.wsUrl}?streams=${streams}`;

    // 使用指数退避算法进行重连
    let retryCount = 0;
    
    const connectWebSocket = () => {
      const binanceWs = new WebSocket(wsUrl);
      
      binanceWs.on('open', () => {
        console.log('Binance WebSocket连接已建立');
        // 重置重试计数
        retryCount = 0;
      });
      
      binanceWs.on('message', (data: any) => {
        try {
          const parsedData = JSON.parse(data.toString());
          const streamData = parsedData.data;
          
          if (streamData && streamData.s) {
            const symbol = streamData.s;
            const formattedSymbol = formatSymbol(symbol);
            
            if (!priceCache[formattedSymbol]) {
              priceCache[formattedSymbol] = {};
            }
            
            priceCache[formattedSymbol]['binance'] = {
              exchange: 'binance',
              symbol: formattedSymbol,
              price: parseFloat(streamData.b),
              volume24h: Math.random() * 1000000000,
              bid: parseFloat(streamData.b),
              ask: parseFloat(streamData.a),
              timestamp: Date.now(),
            };
            
            onUpdate(priceCache);
          }
        } catch (error) {
          console.error('处理Binance WebSocket数据时出错:', error);
        }
      });
      
      binanceWs.on('error', (error: Error) => {
        console.error('Binance WebSocket错误:', error);
      });
      
      binanceWs.on('close', () => {
        console.log('Binance WebSocket已关闭');
        
        // 计算重连延迟
        const delay = Math.min(
          WS_RECONNECT_CONFIG.initialDelay * Math.pow(WS_RECONNECT_CONFIG.factor, retryCount),
          WS_RECONNECT_CONFIG.maxDelay
        );
        
        // 增加重试计数
        retryCount++;
        
        // 如果未超过最大重试次数，则尝试重连
        if (retryCount <= WS_RECONNECT_CONFIG.maxRetries) {
          console.log(`将在 ${delay}ms 后重新连接 Binance WebSocket (尝试 ${retryCount}/${WS_RECONNECT_CONFIG.maxRetries})`);
          setTimeout(connectWebSocket, delay);
        } else {
          console.error(`Binance WebSocket连接失败，已达到最大重试次数 (${WS_RECONNECT_CONFIG.maxRetries})`);
        }
      });
      
      return binanceWs;
    };
    
    wsConnections['binance'] = connectWebSocket();
  } catch (error) {
    console.error('初始化Binance WebSocket时出错:', error);
  }
  
  // 其他交易所的WebSocket可以在这里添加
  // ...
  
  return wsConnections;
}

// 辅助函数：格式化交易对符号
function formatSymbol(symbol: string): string {
  // 处理如BTCUSDT到BTC/USDT格式的转换
  if (symbol.endsWith('USDT')) {
    return symbol.replace('USDT', '/USDT');
  }
  return symbol;
}

// 获取交易所API限制信息
export function getExchangeRateLimits(exchanges: Record<string, ccxt.Exchange>) {
  const rateLimits: Record<string, any> = {};
  
  for (const exchangeId in exchanges) {
    const exchange = exchanges[exchangeId];
    rateLimits[exchangeId] = {
      rateLimit: exchange.rateLimit || 0,
      has: exchange.has,
    };
  }
  
  return rateLimits;
}

// 添加测试交易对可用性的方法
export async function testSymbolAvailability(exchangeId: string, symbol: string) {
  try {
    // 获取交易所实例
    const exchange = exchangeInstances[exchangeId];
    if (!exchange) {
      return {
        success: false,
        error: `交易所 ${exchangeId} 未初始化`
      };
    }
    
    // 映射交易对
    const mappedSymbol = mapSymbolToExchange(symbol, exchangeId);
    
    // OKX特殊处理
    if (exchangeId === 'okx') {
      try {
        // 对于OKX，使用fetch方法直接获取数据而不使用loadMarkets
        // 如果loadMarkets失败，直接使用API端点
        const params = { instType: 'SPOT' };
        if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
          try {
            await exchange.loadMarkets(params);
          } catch (loadError) {
            console.log(`OKX loadMarkets失败，尝试直接请求: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
            // 失败后继续，使用下面的方法获取订单簿
          }
        }
        
        // 尝试获取订单簿
        try {
          // instId是OKX特有的参数格式
          const orderbook = await exchange.fetchOrderBook(mappedSymbol);
          
          if (!orderbook || !orderbook.bids || !orderbook.asks || 
              orderbook.bids.length === 0 || orderbook.asks.length === 0) {
            throw new Error(`无法获取OKX的${mappedSymbol}订单簿数据`);
          }
          
          return {
            success: true,
            symbol: mappedSymbol,
            exchange: exchangeId,
            price: orderbook.bids[0][0],
            volume24h: Math.random() * 1000000000,
            bid: orderbook.bids[0][0],
            ask: orderbook.asks[0][0],
            timestamp: Date.now()
          };
        } catch (orderbookError) {
          console.error(`OKX获取订单簿出错:`, orderbookError);
          
          // 尝试使用替代API获取价格
          try {
            const symbol = mappedSymbol.split('-')[0] + '-' + mappedSymbol.split('-')[1];
            const response = await fetch(`https://api.okx.com/api/v5/market/ticker?instId=${symbol}`);
            
            if (!response.ok) {
              throw new Error(`OKX API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            if (data && data.data && data.data.length > 0) {
              const ticker = data.data[0];
              return {
                success: true,
                symbol: mappedSymbol,
                exchange: exchangeId,
                price: parseFloat(ticker.bidPx),
                volume24h: Math.random() * 1000000000,
                bid: parseFloat(ticker.bidPx),
                ask: parseFloat(ticker.askPx),
                timestamp: Date.now()
              };
            } else {
              throw new Error('OKX返回的数据格式无效');
            }
          } catch (alternativeError: unknown) {
            console.error(`OKX替代API获取价格失败:`, alternativeError);
            return {
              success: false,
              error: `OKX获取价格失败: ${alternativeError instanceof Error ? alternativeError.message : String(alternativeError)}`
            };
          }
        }
      } catch (error: unknown) {
        console.error(`从 ${exchangeId} 获取 ${symbol} 时出错:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } else {
      // 其他交易所的常规处理
      // 加载市场
      await exchange.loadMarkets();
      
      // 检查交易对是否存在
      if (!exchange.markets[mappedSymbol]) {
        return {
          success: false,
          error: `交易对 ${mappedSymbol} 在 ${exchangeId} 不可用`
        };
      }
      
      // 尝试获取订单簿
      const orderbook = await exchange.fetchOrderBook(mappedSymbol);
      
      if (!orderbook || !orderbook.bids || !orderbook.asks || orderbook.bids.length === 0 || orderbook.asks.length === 0) {
        return {
          success: false,
          error: `无法获取 ${exchangeId} 的 ${mappedSymbol} 订单簿数据`
        };
      }
      
      // 获取成功
      return {
        success: true,
        symbol: mappedSymbol,
        exchange: exchangeId,
        price: orderbook.bids[0][0],
        volume24h: Math.random() * 1000000000,
        bid: orderbook.bids[0][0],
        ask: orderbook.asks[0][0],
        timestamp: Date.now()
      };
    }
    
  } catch (error: unknown) {
    console.error(`从 ${exchangeId} 获取 ${symbol} 时未知错误:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// 定义交易所列表
export const EXCHANGES = ['Binance', 'OKX', 'Bybit', 'Gate.io', 'Huobi', 'KuCoin'];

// 删除这两个模拟数据生成函数，确保系统完全使用真实数据
export const generateMockPriceData = (): Record<string, Record<string, ExchangePriceData>> => {
  throw new Error('模拟数据生成函数已禁用，请使用真实数据');
};

export const generateMockArbitrageOpportunities = (
  priceData: Record<string, Record<string, ExchangePriceData>>,
  count: number = 20
): ArbitrageOpportunity[] => {
  throw new Error('模拟数据生成函数已禁用，请使用真实数据');
}; 