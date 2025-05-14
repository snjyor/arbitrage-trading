import { NextResponse } from 'next/server';
import { initializeExchanges, testSymbolAvailability, MAIN_SYMBOLS, SUPPORTED_EXCHANGES } from '@/services/exchangeService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 从URL获取交易对参数
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    // 获取要查询的交易所，默认查询所有支持的交易所
    let exchanges = searchParams.get('exchanges');
    let targetExchanges = exchanges ? exchanges.split(',') : SUPPORTED_EXCHANGES;

    // 过滤有效的交易所
    targetExchanges = targetExchanges.filter(exchangeId => SUPPORTED_EXCHANGES.includes(exchangeId));

    // 初始化交易所
    initializeExchanges();

    // 如果没有指定交易对，返回错误
    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: '必须指定交易对参数',
        available_symbols: MAIN_SYMBOLS
      }, { status: 400 });
    }

    // 如果没有有效的交易所，返回错误
    if (targetExchanges.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未指定有效的交易所',
        supported_exchanges: SUPPORTED_EXCHANGES
      }, { status: 400 });
    }

    // 在多个交易所测试交易对
    const priceResults = {};
    const testPromises = targetExchanges.map(async (exchangeId) => {
      const result = await testSymbolAvailability(exchangeId, symbol);
      
      // 如果测试成功，格式化价格数据
      if (result.success && result.bid && result.ask) {
        priceResults[exchangeId] = {
          exchange: exchangeId,
          symbol: result.symbol,
          bid: result.bid,
          ask: result.ask,
          spread: parseFloat((result.ask - result.bid).toFixed(8)),
          spreadPercentage: parseFloat((((result.ask - result.bid) / result.bid) * 100).toFixed(4))
        };
      } else {
        priceResults[exchangeId] = {
          exchange: exchangeId,
          success: false,
          error: result.error
        };
      }
    });

    await Promise.all(testPromises);

    // 分析价格差异
    const priceAnalysis = analyzePriceDifferences(priceResults);

    return NextResponse.json({
      success: true,
      symbol,
      exchanges: targetExchanges,
      results: priceResults,
      analysis: priceAnalysis,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('查询多交易所价格时出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

// 分析不同交易所间的价格差异
function analyzePriceDifferences(priceResults: Record<string, any>) {
  const analysis = {
    lowestAsk: { exchange: '', price: Number.MAX_VALUE },
    highestBid: { exchange: '', price: 0 },
    maxSpread: { exchanges: '', difference: 0, percentageDifference: 0 },
    potentialArbitrage: []
  };

  const successfulExchanges = Object.keys(priceResults).filter(
    exchangeId => priceResults[exchangeId].success !== false
  );

  // 找出最低卖价和最高买价
  for (const exchangeId of successfulExchanges) {
    const data = priceResults[exchangeId];
    
    if (data.ask < analysis.lowestAsk.price) {
      analysis.lowestAsk = { exchange: exchangeId, price: data.ask };
    }
    
    if (data.bid > analysis.highestBid.price) {
      analysis.highestBid = { exchange: exchangeId, price: data.bid };
    }
  }

  // 计算交易所间的最大价差
  for (let i = 0; i < successfulExchanges.length; i++) {
    for (let j = i + 1; j < successfulExchanges.length; j++) {
      const exchange1 = successfulExchanges[i];
      const exchange2 = successfulExchanges[j];
      
      const data1 = priceResults[exchange1];
      const data2 = priceResults[exchange2];
      
      // 计算两个交易所间的价格差异
      const askDiff = Math.abs(data1.ask - data2.ask);
      const bidDiff = Math.abs(data1.bid - data2.bid);
      const maxDiff = Math.max(askDiff, bidDiff);
      
      // 计算百分比差异（基于较低价格）
      const baseLowPrice = Math.min(
        Math.min(data1.ask, data2.ask),
        Math.min(data1.bid, data2.bid)
      );
      const percentageDiff = (maxDiff / baseLowPrice) * 100;
      
      // 更新最大价差信息
      if (percentageDiff > analysis.maxSpread.percentageDifference) {
        analysis.maxSpread = {
          exchanges: `${exchange1} vs ${exchange2}`,
          difference: parseFloat(maxDiff.toFixed(8)),
          percentageDifference: parseFloat(percentageDiff.toFixed(4))
        };
      }
      
      // 检查潜在套利机会
      if (data1.bid > data2.ask) {
        // 在exchange1卖出，在exchange2买入的套利
        analysis.potentialArbitrage.push({
          buyExchange: exchange2,
          buyPrice: data2.ask,
          sellExchange: exchange1,
          sellPrice: data1.bid,
          priceDifference: parseFloat((data1.bid - data2.ask).toFixed(8)),
          percentageDifference: parseFloat((((data1.bid - data2.ask) / data2.ask) * 100).toFixed(4))
        });
      }
      
      if (data2.bid > data1.ask) {
        // 在exchange2卖出，在exchange1买入的套利
        analysis.potentialArbitrage.push({
          buyExchange: exchange1,
          buyPrice: data1.ask,
          sellExchange: exchange2,
          sellPrice: data2.bid,
          priceDifference: parseFloat((data2.bid - data1.ask).toFixed(8)),
          percentageDifference: parseFloat((((data2.bid - data1.ask) / data1.ask) * 100).toFixed(4))
        });
      }
    }
  }

  // 按百分比差异排序潜在套利机会
  analysis.potentialArbitrage.sort((a, b) => b.percentageDifference - a.percentageDifference);

  return analysis;
} 