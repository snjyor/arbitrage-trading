import { NextResponse } from 'next/server';
import { MAIN_SYMBOLS, ArbitrageOpportunity } from '@/services/exchangeService';

// 存储历史统计数据
let historicalStats: {
  totalOpportunities: number;
  maxProfitPercentage: number;
  avgProfitPercentage: number;
  lastUpdate: number;
} = {
  totalOpportunities: 0,
  maxProfitPercentage: 0,
  avgProfitPercentage: 0,
  lastUpdate: 0
};

// 初始化统计数据
if (historicalStats.lastUpdate === 0) {
  historicalStats.lastUpdate = Date.now();
}

// 计算变化率
function calculateChangeRate(current: number, previous: number) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

// 获取真实的币安24小时价格变化率
async function getBinance24hChange() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
    
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Binance API 请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    const changes: Record<string, number> = {};
    
    if (Array.isArray(data)) {
      // 转换标准交易对格式为Binance格式
      const symbolMap = MAIN_SYMBOLS.reduce((acc, symbol) => {
        acc[symbol.replace('/', '')] = symbol;
        return acc;
      }, {} as Record<string, string>);
      
      data.forEach(item => {
        const originalSymbol = symbolMap[item.symbol];
        if (originalSymbol) {
          changes[originalSymbol] = parseFloat(item.priceChangePercent);
        }
      });
    }
    
    return changes;
  } catch (error) {
    console.error('获取Binance 24小时变化率出错:', error);
    return {};
  }
}

export async function GET(request: Request) {
  try {
    // 解析URL参数中的机会数据
    const { searchParams } = new URL(request.url);
    const opportunitiesParam = searchParams.get('opportunities');
    
    if (!opportunitiesParam) {
      // 如果没有提供机会数据，返回错误信息
      return NextResponse.json(
        { 
          success: false, 
          error: '未提供套利机会数据参数',
          message: '请提供套利机会数据以计算统计信息'
        }, 
        { status: 400 }
      );
    }
    
    // 解析机会数据
    let opportunities: ArbitrageOpportunity[];
    try {
      opportunities = JSON.parse(opportunitiesParam);
    } catch (parseError) {
      console.error('解析机会数据时出错:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: '无效的套利机会数据格式',
          message: '请提供有效的JSON格式套利机会数据'
        },
        { status: 400 }
      );
    }
    
    // 计算当前统计数据
    const currentStats = {
      totalOpportunities: opportunities.length,
      maxProfitPercentage: opportunities.length > 0 
        ? Math.max(...opportunities.map(o => o.percentageDifference)) 
        : 0,
      avgProfitPercentage: opportunities.length > 0 
        ? opportunities.reduce((sum, o) => sum + o.percentageDifference, 0) / opportunities.length 
        : 0
    };
    
    // 计算变化率
    const changes = {
      opportunitiesChange: calculateChangeRate(
        currentStats.totalOpportunities, 
        historicalStats.totalOpportunities
      ),
      maxProfitChange: calculateChangeRate(
        currentStats.maxProfitPercentage, 
        historicalStats.maxProfitPercentage
      ),
      avgProfitChange: calculateChangeRate(
        currentStats.avgProfitPercentage, 
        historicalStats.avgProfitPercentage
      )
    };
    
    // 每小时更新一次历史数据，或者如果当前历史数据为空
    const now = Date.now();
    if (now - historicalStats.lastUpdate > 3600000 || historicalStats.totalOpportunities === 0) {
      historicalStats = {
        ...currentStats,
        lastUpdate: now
      };
      console.log('更新历史统计数据:', historicalStats);
    }
    
    return NextResponse.json({
      success: true,
      changes,
      stats: currentStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('处理统计API请求时出错:', error);
    
    // 当发生错误时，返回错误信息而不是模拟数据
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误',
        message: '计算统计数据时出错，请稍后再试'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 从请求体解析数据
    const requestData = await request.json();
    const { opportunities } = requestData;
    
    if (!opportunities || !Array.isArray(opportunities)) {
      // 如果没有提供机会数据，返回错误信息
      return NextResponse.json(
        { 
          success: false, 
          error: '未提供套利机会数据或格式不正确',
          message: '请提供套利机会数据以计算统计信息'
        }, 
        { status: 400 }
      );
    }
    
    // 计算当前统计数据
    const currentStats = {
      totalOpportunities: opportunities.length,
      maxProfitPercentage: opportunities.length > 0 
        ? Math.max(...opportunities.map((o: ArbitrageOpportunity) => o.percentageDifference)) 
        : 0,
      avgProfitPercentage: opportunities.length > 0 
        ? opportunities.reduce((sum: number, o: ArbitrageOpportunity) => sum + o.percentageDifference, 0) / opportunities.length 
        : 0
    };
    
    // 计算变化率
    const changes = {
      opportunitiesChange: calculateChangeRate(
        currentStats.totalOpportunities, 
        historicalStats.totalOpportunities
      ),
      maxProfitChange: calculateChangeRate(
        currentStats.maxProfitPercentage, 
        historicalStats.maxProfitPercentage
      ),
      avgProfitChange: calculateChangeRate(
        currentStats.avgProfitPercentage, 
        historicalStats.avgProfitPercentage
      )
    };
    
    // 每小时更新一次历史数据，或者如果当前历史数据为空
    const now = Date.now();
    if (now - historicalStats.lastUpdate > 3600000 || historicalStats.totalOpportunities === 0) {
      historicalStats = {
        ...currentStats,
        lastUpdate: now
      };
      console.log('更新历史统计数据:', historicalStats);
    }
    
    return NextResponse.json({
      success: true,
      changes,
      stats: currentStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('处理统计API POST请求时出错:', error);
    
    // 当发生错误时，返回错误信息而不是模拟数据
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误',
        message: '处理POST请求时出错，请稍后再试'
      },
      { status: 500 }
    );
  }
} 