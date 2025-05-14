import { NextResponse } from 'next/server';
import { MAIN_SYMBOLS } from '@/services/exchangeService';

// 直接从OKX获取价格数据
async function getOkxPriceData(symbol: string) {
  try {
    // 转换为OKX的符号格式 (BTC/USDT -> BTC-USDT-SPOT 或 BTC-USDT)
    const okxSymbol = symbol.replace('/', '-');
    const simplifiedSymbol = okxSymbol; // 首选尝试不加SPOT后缀
    const spotSymbol = `${okxSymbol}-SPOT`; // 备选方案，加SPOT后缀
    
    // 首先尝试简化符号
    let response = await fetch(`https://api.okx.com/api/v5/market/ticker?instId=${simplifiedSymbol}`);
    
    // 如果失败，尝试带SPOT后缀的符号
    if (!response.ok) {
      console.log(`使用${simplifiedSymbol}获取OKX价格失败，尝试${spotSymbol}`);
      response = await fetch(`https://api.okx.com/api/v5/market/ticker?instId=${spotSymbol}`);
    }
    
    if (!response.ok) {
      throw new Error(`OKX API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data || !data.data || data.data.length === 0) {
      throw new Error('无效的OKX API响应');
    }
    
    const ticker = data.data[0];
    return {
      symbol,
      bid: parseFloat(ticker.bidPx),
      ask: parseFloat(ticker.askPx),
      last: parseFloat(ticker.last),
      timestamp: parseInt(ticker.ts),
      volume: parseFloat(ticker.vol24h)
    };
  } catch (error) {
    console.error('从OKX获取价格数据出错:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC/USDT';
    
    // 验证交易对
    if (!MAIN_SYMBOLS.includes(symbol)) {
      return NextResponse.json({
        success: false,
        error: '不支持的交易对',
        supportedSymbols: MAIN_SYMBOLS
      }, { status: 400 });
    }
    
    // 获取OKX价格数据
    const priceData = await getOkxPriceData(symbol);
    
    return NextResponse.json({
      success: true,
      exchange: 'okx',
      data: priceData,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('获取OKX价格数据时出错:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '内部服务器错误',
      timestamp: Date.now()
    }, { status: 500 });
  }
} 