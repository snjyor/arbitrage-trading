import { NextResponse } from 'next/server';
import { 
  initializeExchanges, 
  MAIN_SYMBOLS, 
  fetchAllOrderBooks, 
  findArbitrageOpportunities,
  priceCache,
  arbitrageOpportunities,
  initializeWebSockets
} from '@/services/exchangeService';
import { UNAVAILABLE_PAIRS } from '@/config/exchanges';

// 初始化交易所
const exchanges = initializeExchanges();

// 存储上次的更新时间
let lastUpdateTime = 0;

// 记录已经报告过的错误，避免刷屏
const reportedErrors = new Set<string>();

// 定期清除错误记录
function clearReportedErrors() {
  const now = Date.now();
  // 每小时清除一次错误记录
  if (now % 3600000 < 10000) {
    console.log('清除错误记录');
    reportedErrors.clear();
  }
}

// 初始化WebSocket连接
let wsInitialized = false;
function setupWebSockets() {
  if (wsInitialized) return;
  
  try {
    // 初始化WebSocket连接
    initializeWebSockets((data) => {
      try {
        // WebSocket数据更新后，寻找套利机会
        const opportunities = findArbitrageOpportunities();
        console.log(`WebSocket更新：找到 ${opportunities.length} 个套利机会`);
      } catch (error) {
        // 避免重复记录相同错误
        const errorKey = `ws-update-${error instanceof Error ? error.message : 'unknown'}`;
        if (!reportedErrors.has(errorKey)) {
          console.error('WebSocket更新套利机会时出错:', error);
          reportedErrors.add(errorKey);
        }
      }
    });
    
    wsInitialized = true;
    console.log('WebSocket连接成功初始化');
  } catch (error) {
    const errorKey = `ws-init-${error instanceof Error ? error.message : 'unknown'}`;
    if (!reportedErrors.has(errorKey)) {
      console.error('初始化WebSocket时出错:', error);
      reportedErrors.add(errorKey);
    }
  }
}

// 启动数据更新
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // 在实际应用中，这里会初始化WebSocket连接
    return NextResponse.json({
      success: true,
      message: 'WebSocket service initialized',
      status: 'active',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('WebSocket API 错误:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 