import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardBody, CardHeader, Divider, Chip, Tooltip } from "@nextui-org/react";
import { ArbitrageOpportunity } from '@/services/exchangeService';
import { CircularProgress } from '@/components';

interface ArbitrageStats24hProps {
  opportunities: ArbitrageOpportunity[];
}

// 用于存储的键名
const STORAGE_KEYS = {
  TOTAL_COUNT: 'arbitrage_total_opportunities',
  RESET_TIME: 'arbitrage_reset_time',
  PROCESSED_IDS: 'arbitrage_processed_ids'
};

const ArbitrageStats24h: React.FC<ArbitrageStats24hProps> = ({ opportunities }) => {
  // 状态：累计的套利机会总数
  const [cumulativeTotalCount, setCumulativeTotalCount] = useState<number>(0);
  
  // 引用：跟踪已处理的机会ID和下次重置时间
  const processedOpportunityIds = useRef<Set<string>>(new Set());
  const nextResetTime = useRef<number>(0);
  
  // 初始化：从localStorage加载持久化数据
  useEffect(() => {
    // 加载累计总数
    const savedCount = localStorage.getItem(STORAGE_KEYS.TOTAL_COUNT);
    if (savedCount) {
      setCumulativeTotalCount(parseInt(savedCount, 10));
    }
    
    // 加载下次重置时间
    const savedResetTime = localStorage.getItem(STORAGE_KEYS.RESET_TIME);
    if (savedResetTime) {
      nextResetTime.current = parseInt(savedResetTime, 10);
    } else {
      // 如果没有保存的重置时间，设置为下一个凌晨
      nextResetTime.current = getNextMidnight();
      localStorage.setItem(STORAGE_KEYS.RESET_TIME, nextResetTime.current.toString());
    }
    
    // 加载已处理的ID
    const savedProcessedIds = localStorage.getItem(STORAGE_KEYS.PROCESSED_IDS);
    if (savedProcessedIds) {
      try {
        processedOpportunityIds.current = new Set(JSON.parse(savedProcessedIds));
      } catch (e) {
        console.error('无法解析已处理的ID', e);
        processedOpportunityIds.current = new Set();
      }
    }
  }, []);
  
  // 处理新机会：计算新的机会，并更新累计总数
  useEffect(() => {
    if (!opportunities || opportunities.length === 0) return;
    
    // 当前时间戳
    const now = Date.now();
    // 24 小时前的时间戳
    const past24h = now - 24 * 60 * 60 * 1000;
    
    // 筛选 24 小时内的套利机会
    const opportunities24h = opportunities.filter(
      opp => opp.timestamp >= past24h && opp.timestamp <= now
    );
    
    // 查找新的机会（之前未处理过的）
    let newOpportunitiesCount = 0;
    
    opportunities24h.forEach(opp => {
      // 为每个机会创建唯一ID
      const opportunityId = `${opp.buyExchange}-${opp.sellExchange}-${opp.symbol}-${opp.timestamp}`;
      
      // 如果这个机会之前未处理过，增加计数并标记为已处理
      if (!processedOpportunityIds.current.has(opportunityId)) {
        newOpportunitiesCount++;
        processedOpportunityIds.current.add(opportunityId);
      }
    });
    
    // 只有在有新机会时更新累计总数
    if (newOpportunitiesCount > 0) {
      const newTotal = cumulativeTotalCount + newOpportunitiesCount;
      setCumulativeTotalCount(newTotal);
      
      // 更新localStorage
      localStorage.setItem(STORAGE_KEYS.TOTAL_COUNT, newTotal.toString());
      localStorage.setItem(
        STORAGE_KEYS.PROCESSED_IDS, 
        JSON.stringify(Array.from(processedOpportunityIds.current))
      );
    }
  }, [opportunities, cumulativeTotalCount]);
  
  // 重置检查：每分钟检查一次是否到了重置时间
  useEffect(() => {
    const checkResetTime = () => {
      const now = Date.now();
      
      // 如果当前时间已经超过重置时间，执行重置
      if (now >= nextResetTime.current) {
        // 重置累计总数
        setCumulativeTotalCount(0);
        processedOpportunityIds.current.clear();
        
        // 设置下一次重置时间（第二天凌晨）
        nextResetTime.current = getNextMidnight();
        
        // 更新localStorage
        localStorage.setItem(STORAGE_KEYS.TOTAL_COUNT, '0');
        localStorage.setItem(STORAGE_KEYS.RESET_TIME, nextResetTime.current.toString());
        localStorage.setItem(STORAGE_KEYS.PROCESSED_IDS, JSON.stringify([]));
        
        console.log('重置套利机会累计数，下次重置时间:', new Date(nextResetTime.current).toLocaleString());
      }
    };
    
    // 立即检查一次
    checkResetTime();
    
    // 设置定时器，每分钟检查一次
    const intervalId = setInterval(checkResetTime, 60000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // 计算下一个凌晨的时间戳
  function getNextMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }
  
  // 计算 24 小时内的数据
  const stats24h = useMemo(() => {
    // 当前时间戳
    const now = Date.now();
    // 24 小时前的时间戳
    const past24h = now - 24 * 60 * 60 * 1000;
    
    // 筛选 24 小时内的套利机会
    const opportunities24h = opportunities.filter(
      opp => opp.timestamp >= past24h && opp.timestamp <= now
    );
    
    // 使用累计总数代替当前机会数量
    const totalOpportunities = cumulativeTotalCount;
    
    // 总计预估利润 - 累加所有24小时内机会的利润
    const totalProfit = opportunities24h.reduce(
      (sum, opp) => sum + opp.estimatedProfit, 0
    );
    
    // 平均利润率
    const avgProfitPercentage = opportunities24h.length > 0
      ? opportunities24h.reduce((sum, opp) => sum + opp.percentageDifference, 0) / opportunities24h.length
      : 0;
    
    // 按币种统计套利机会数量
    const opportunitiesBySymbol: Record<string, number> = {};
    opportunities24h.forEach(opp => {
      if (!opportunitiesBySymbol[opp.symbol]) {
        opportunitiesBySymbol[opp.symbol] = 0;
      }
      opportunitiesBySymbol[opp.symbol]++;
    });
    
    // 找出最活跃的交易对（套利机会最多的）
    const mostActiveSymbol = Object.entries(opportunitiesBySymbol)
      .sort((a, b) => b[1] - a[1])
      .shift();
    
    // 24 小时内的活跃交易所（参与套利的交易所）
    const activeExchanges = new Set<string>();
    opportunities24h.forEach(opp => {
      activeExchanges.add(opp.buyExchange);
      activeExchanges.add(opp.sellExchange);
    });
    
    // 重新定义套利覆盖率：24小时内有套利机会的15分钟时间段占比
    // 将24小时划分为15分钟的时间段（共96个时间段）
    const intervalCount = 96; // 24小时 × 4（每小时4个15分钟时间段）
    const intervalDuration = 15 * 60 * 1000; // 15分钟，单位毫秒
    
    // 初始化时间段数组
    const timeIntervals: boolean[] = Array(intervalCount).fill(false);
    
    // 标记有套利机会的时间段
    opportunities24h.forEach(opp => {
      // 计算当前机会所在的时间段索引
      const timeSincePast24h = opp.timestamp - past24h;
      const intervalIndex = Math.floor(timeSincePast24h / intervalDuration);
      
      // 确保索引在有效范围内
      if (intervalIndex >= 0 && intervalIndex < intervalCount) {
        timeIntervals[intervalIndex] = true;
      }
    });
    
    // 统计有套利机会的时间段数量
    const intervalsWithOpportunities = timeIntervals.filter(Boolean).length;
    
    // 计算覆盖率
    const coveragePercentage = (intervalsWithOpportunities / intervalCount) * 100;
    
    // 距离下次重置的时间
    const timeToReset = nextResetTime.current - now;
    const hoursToReset = Math.floor(timeToReset / (60 * 60 * 1000));
    const minutesToReset = Math.floor((timeToReset % (60 * 60 * 1000)) / (60 * 1000));
    
    return {
      totalOpportunities,
      currentWindowOpportunities: opportunities24h.length,
      totalProfit,
      avgProfitPercentage,
      mostActiveSymbol,
      activeExchangesCount: activeExchanges.size,
      coveragePercentage,
      uniqueSymbolsCount: Object.keys(opportunitiesBySymbol).length,
      intervalsWithOpportunities,
      totalIntervals: intervalCount,
      resetTimeInfo: `${hoursToReset}小时${minutesToReset}分钟后重置`
    };
  }, [opportunities, cumulativeTotalCount]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="bg-black/80 border border-blue-500/30 shadow-lg">
        <CardBody className="p-4">
          <div className="flex justify-between">
            <div>
              <div className="text-xs text-zinc-400">24小时累计套利机会</div>
              <div className="text-xl font-bold text-blue-100 mt-1">{stats24h.totalOpportunities}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
            </div>
          </div>
          <Divider className="my-3" />
          <div className="flex justify-between text-xs text-zinc-400">
            <div>重置倒计时</div>
            <div className="font-medium text-amber-400">
              <Tooltip content="每天凌晨自动重置计数器" placement="bottom">
                <span>{stats24h.resetTimeInfo}</span>
              </Tooltip>
            </div>
          </div>
        </CardBody>
      </Card>
      
      <Card className="bg-black/80 border border-blue-500/30 shadow-lg">
        <CardBody className="p-4">
          <div className="flex justify-between">
            <div>
              <div className="text-xs text-zinc-400">预估总利润</div>
              <div className="text-xl font-bold text-blue-100 mt-1">
                $ {stats24h.totalProfit.toFixed(2)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
          </div>
          <Divider className="my-3" />
          <div className="flex justify-between text-xs text-zinc-400">
            <div>交易所数量</div>
            <div className="font-medium">{stats24h.activeExchangesCount}</div>
          </div>
        </CardBody>
      </Card>
      
      <Card className="bg-black/80 border border-blue-500/30 shadow-lg">
        <CardBody className="p-4">
          <div className="flex justify-between">
            <div>
              <div className="text-xs text-zinc-400">监控交易对数量</div>
              <div className="text-xl font-bold text-blue-100 mt-1">{stats24h.uniqueSymbolsCount}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"></path><line x1="12" y1="10" x2="12" y2="16"></line><line x1="9" y1="13" x2="15" y2="13"></line></svg>
            </div>
          </div>
          <Divider className="my-3" />
          <div className="flex justify-between text-xs text-zinc-400">
            <div>最活跃交易对</div>
            <div className="font-medium">
              {stats24h.mostActiveSymbol ? stats24h.mostActiveSymbol[0] : '-'}
            </div>
          </div>
        </CardBody>
      </Card>
      
      <Card className="bg-black/80 border border-blue-500/30 shadow-lg">
        <CardBody className="p-4">
          <div className="flex justify-between">
            <div>
              <div className="text-xs text-zinc-400">
                <span>套利覆盖率</span>
                <Tooltip content="套利覆盖率表示24小时内有套利机会的15分钟时间段占比">
                  <span className="ml-1 cursor-help">ⓘ</span>
                </Tooltip>
              </div>
              <div className="text-xl font-bold text-blue-100 mt-1">
                <div className="flex items-center">
                  <div className="mr-2">{stats24h.coveragePercentage.toFixed(2)}%</div>
                  <Tooltip content={`有套利机会的15分钟时间段数: ${stats24h.intervalsWithOpportunities}/${stats24h.totalIntervals}`}>
                    <Chip size="sm" color="success">24h</Chip>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <CircularProgress 
                value={stats24h.coveragePercentage} 
                max={100} 
                height={60}
                color="#3366FF" 
              />
            </div>
          </div>
          <Divider className="my-3" />
          <div className="flex justify-between text-xs text-zinc-400">
            <div>数据更新于</div>
            <div className="font-medium">{new Date().toLocaleTimeString()}</div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ArbitrageStats24h; 