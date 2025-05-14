import { NextResponse } from 'next/server';
import { initializeExchanges, testSymbolAvailability, MAIN_SYMBOLS, SUPPORTED_EXCHANGES } from '@/services/exchangeService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 从URL获取交易所ID和交易对
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get('exchange');
    const symbol = searchParams.get('symbol');
    
    // 初始化交易所
    const exchanges = initializeExchanges();
    
    // 如果没有指定交易所，返回所有支持的交易所
    if (!exchangeId) {
      return NextResponse.json({
        success: true,
        supported_exchanges: SUPPORTED_EXCHANGES,
        main_symbols: MAIN_SYMBOLS
      });
    }
    
    // 如果指定了交易所但不在支持列表中
    if (!SUPPORTED_EXCHANGES.includes(exchangeId)) {
      return NextResponse.json({
        success: false,
        error: `交易所 ${exchangeId} 不在支持列表中`
      }, { status: 400 });
    }
    
    // 如果没有指定交易对，测试所有主要交易对
    if (!symbol) {
      const results = {};
      const priceData = {};
      const testPromises = MAIN_SYMBOLS.map(async (s) => {
        const result = await testSymbolAvailability(exchangeId, s);
        results[s] = result;
        
        // 如果测试成功，添加价格数据到单独的对象中
        if (result.success && result.bid && result.ask) {
          priceData[s] = {
            symbol: s,
            bid: result.bid,
            ask: result.ask,
            spread: parseFloat((result.ask - result.bid).toFixed(8)),
            spreadPercentage: parseFloat((((result.ask - result.bid) / result.bid) * 100).toFixed(4))
          };
        }
      });
      
      await Promise.all(testPromises);
      
      return NextResponse.json({
        success: true,
        exchange: exchangeId,
        results,
        prices: priceData,
        timestamp: Date.now()
      });
    }
    
    // 测试指定的交易对
    const result = await testSymbolAvailability(exchangeId, symbol);
    
    // 构建更详细的响应
    let response = {
      success: true,
      exchange: exchangeId,
      symbol,
      result
    };
    
    // 如果测试成功，添加更详细的价格信息
    if (result.success && result.bid && result.ask) {
      response = {
        ...response,
        priceData: {
          symbol: symbol,
          bid: result.bid,
          ask: result.ask,
          spread: parseFloat((result.ask - result.bid).toFixed(8)),
          spreadPercentage: parseFloat((((result.ask - result.bid) / result.bid) * 100).toFixed(4))
        },
        timestamp: Date.now()
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('测试交易所API时出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
} 