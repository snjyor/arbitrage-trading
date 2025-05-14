import { NextResponse } from 'next/server';
import { 
  initializeExchanges, 
  fetchAllOrderBooks, 
  findArbitrageOpportunities, 
  priceCache,
  arbitrageOpportunities,
  SUPPORTED_EXCHANGES,
  MAIN_SYMBOLS
} from '@/services/exchangeService';

// 初始化交易所实例
const exchanges = initializeExchanges();

export async function GET() {
  try {
    // 将超时时间增加到60秒，并移除全局Promise.race
    // 因为fetchAllOrderBooks内部已有错误处理，不需要整体超时
    const fetchResult = await fetchAllOrderBooks(exchanges, MAIN_SYMBOLS);
    
    console.log(`成功获取交易所数据，获取到 ${fetchResult.length} 条价格数据`);
    
    // 即使某些交易所数据获取失败，只要有任何数据，就计算套利机会
    // 基于获取到的数据计算套利机会
    const opportunities = findArbitrageOpportunities();
    
    // 构建响应数据
    const responseData = {
      success: true,
      updatedAt: new Date().toISOString(),
      prices: priceCache,
      opportunities,
      dataSource: 'real',
      exchangeCount: Object.keys(priceCache).reduce((count, symbol) => 
        count + Object.keys(priceCache[symbol]).length, 0
      )
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('API 错误:', error);
    
    // 当无法获取数据时，返回当前缓存中的数据（如果有）
    const cachedOpportunities = arbitrageOpportunities.length > 0 ? 
      arbitrageOpportunities : [];
    
    // 返回错误信息和任何可能的缓存数据
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date().toISOString(),
      prices: priceCache,
      opportunities: cachedOpportunities,
      dataSource: 'cached',
      message: '无法获取最新数据，请稍后再试'
    }, { status: 503 }); // Service Unavailable
  }
} 