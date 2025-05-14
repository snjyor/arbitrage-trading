/**
 * 交易所API配置文件
 * 
 * 本文件包含所有支持的交易所的API配置，您可以根据需要修改这些配置
 * 参考来源: CCXT 文档 (https://docs.ccxt.com)
 */

// 交易所API基础配置
export interface ExchangeConfig {
  // API基础URL
  baseUrl?: string;
  // WebSocket基础URL
  wsUrl?: string;
  // API请求超时时间(毫秒)
  timeout?: number;
  // 启用请求限流 
  enableRateLimit?: boolean;
  // 其他特定交易所的配置选项
  options?: Record<string, any>;
}

// 所有交易所的配置
export const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  'binance': {
    baseUrl: 'https://api.binance.com',
    wsUrl: 'wss://stream.binance.com:9443/stream',
    timeout: 30000,
    enableRateLimit: true,
    options: {
      adjustForTimeDifference: true,
      recvWindow: 10000,
    }
  },
  'bitfinex': {
    baseUrl: 'https://api.bitfinex.com',
    wsUrl: 'wss://api-pub.bitfinex.com/ws/2',
    timeout: 30000,
    enableRateLimit: true,
  },
  'bitget': {
    baseUrl: 'https://api.bitget.com',
    wsUrl: 'wss://ws.bitget.com/spot/v1/stream',
    timeout: 30000,
    enableRateLimit: true,
    options: {
      defaultType: 'spot'
    }
  },
  'bybit': {
    baseUrl: 'https://api.bybit.com',
    wsUrl: 'wss://stream.bybit.com/v5/public/spot',
    timeout: 30000,
    enableRateLimit: true,
    options: {
      recvWindow: 10000,
    }
  },
  'coinbase': {
    baseUrl: 'https://api.exchange.coinbase.com',
    wsUrl: 'wss://ws-feed.exchange.coinbase.com',
    timeout: 30000,
    enableRateLimit: true,
  },
  'gate': {
    baseUrl: 'https://api.gateio.ws/api/v4',
    wsUrl: 'wss://api.gateio.ws/ws/v4/',
    timeout: 30000,
    enableRateLimit: true,
  },
  'kraken': {
    baseUrl: 'https://api.kraken.com',
    wsUrl: 'wss://ws.kraken.com',
    timeout: 30000,
    enableRateLimit: true,
  },
  'okx': {
    baseUrl: 'https://api.okx.com',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    timeout: 60000,
    enableRateLimit: true,
    options: {
      defaultType: 'spot',
      fetchMarkets: {
        method: 'GET',
      },
      adjustForTimeDifference: true,
      recvWindow: 10000,
      retry: {
        enabled: true,
        attempts: 3
      }
    }
  },
};

// 交易对映射配置
// 有些交易所使用不同的交易对格式，这里定义映射关系
export const SYMBOL_MAPPINGS: Record<string, Record<string, string>> = {
  'coinbase': {
    'BTC/USDT': 'BTC-USDT',
    'ETH/USDT': 'ETH-USDT',
    'SOL/USDT': 'SOL-USDT',
    'XRP/USDT': 'XRP-USDT',
    'ADA/USDT': 'ADA-USDT',
    'DOT/USDT': 'DOT-USDT',
    'DOGE/USDT': 'DOGE-USDT',
    'AVAX/USDT': 'AVAX-USDT',
    'MATIC/USDT': 'MATIC-USDT',
    'LINK/USDT': 'LINK-USDT',
  },
  'kraken': {
    'BTC/USDT': 'BTC/USDT',
    'ETH/USDT': 'ETH/USDT',
    'XRP/USDT': 'XRP/USDT',
    'ADA/USDT': 'ADA/USDT',
    'DOT/USDT': 'DOT/USDT',
    'DOGE/USDT': 'DOGE/USDT',
    'SOL/USDT': 'SOL/USDT',
    'AVAX/USDT': 'AVAX/USDT',
    'MATIC/USDT': 'MATIC/USDT',
    'LINK/USDT': 'LINK/USDT',
  },
  'bitget': {
    'MATIC/USDT': 'MATICUSDT',
  },
  'bybit': {
    'MATIC/USDT': 'MATICUSDT',
  },
  'okx': {
    'BTC/USDT': 'BTC-USDT-SPOT',
    'ETH/USDT': 'ETH-USDT-SPOT',
    'SOL/USDT': 'SOL-USDT-SPOT',
    'XRP/USDT': 'XRP-USDT-SPOT',
    'ADA/USDT': 'ADA-USDT-SPOT',
    'DOT/USDT': 'DOT-USDT-SPOT',
    'DOGE/USDT': 'DOGE-USDT-SPOT',
    'AVAX/USDT': 'AVAX-USDT-SPOT',
    'MATIC/USDT': 'MATIC-USDT-SPOT',
    'LINK/USDT': 'LINK-USDT-SPOT',
  },
  'gate': {
    'MATIC/USDT': 'MATIC_USDT',
  }
};

// 代理设置（如果需要）
export const PROXY_CONFIG = {
  enabled: false,
  host: 'localhost',
  port: 7890,
};

// 请求限流设置
export const RATE_LIMIT_CONFIG = {
  // 全局请求间隔（毫秒）
  globalRateLimit: 1000,
  // 每个交易所的请求最大并发数
  maxConcurrentRequests: 3,
  // 在触发限流后等待的时间（毫秒）
  rateLimitWaitTime: 5000,
};

// 定义不可用的交易对，避免系统尝试请求
export const UNAVAILABLE_PAIRS: Record<string, string[]> = {
  'kraken': [],
  'bitget': ['MATIC/USDT'],
  'bybit': ['MATIC/USDT'],
  'okx': [],
  'gate': []
};

// WebSocket重连设置
export const WS_RECONNECT_CONFIG = {
  // 重连次数
  maxRetries: 10,
  // 初始重连延迟（毫秒）
  initialDelay: 1000,
  // 最大重连延迟（毫秒）
  maxDelay: 30000,
  // 重连延迟增长因子
  factor: 1.5,
}; 