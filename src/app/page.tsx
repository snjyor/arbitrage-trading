'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardBody, Spinner, Button, Tabs, Tab, Badge, Chip } from "@nextui-org/react";
import ArbitrageOpportunitiesTable from '@/components/ArbitrageOpportunitiesTable';
import { MAIN_SYMBOLS } from '@/services/exchangeService';
import { ExchangePriceData, ArbitrageOpportunity } from '@/services/exchangeService';
import { 
  DashboardCard, 
  LineAreaChart, 
  BarChart, 
  CircularProgress, 
  ArbitrageStats24h,
  TimeSeriesChart,
  CryptoPriceChart,
  SankeyChart,
  OpportunitiesByCoin
} from '@/components';

export default function Home() {
  // 状态管理
  const [selectedSymbol, setSelectedSymbol] = useState<string>(MAIN_SYMBOLS[0]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('1h');
  const [priceData, setPriceData] = useState<Record<string, Record<string, ExchangePriceData>>>({});
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [stats, setStats] = useState({
    opportunitiesChange: 0,
    maxProfitChange: 0,
    avgProfitChange: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // 初始化WebSocket和数据加载
  useEffect(() => {
    // 初始化WebSocket连接
    fetch('/api/ws')
      .then(res => res.json())
      .catch(error => {
        console.error('初始化WebSocket时出错:', error);
      });
    
    // 立即获取一次数据
    fetchData();
    
    // 设置定时器，每5秒获取一次数据，确保数据持续刷新
    const intervalId = setInterval(fetchData, 5000);
    
    // 组件卸载时清除定时器
    return () => clearInterval(intervalId);
  }, [retryCount]);

  // 修改 fetchData 函数
  const fetchData = async () => {
    // 设置请求超时的辅助函数
    const fetchWithTimeout = async (url: string, timeoutMs = 5000, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, { 
          signal: controller.signal,
          ...options 
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `请求失败，状态码: ${response.status}` }));
          throw new Error(errorData.error || errorData.message || `请求失败，状态码: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };
    
    // 带重试机制的 fetch
    const fetchWithRetry = async (url: string, retries = 2, timeoutMs = 5000, options = {}) => {
      let lastError;
      
      for (let i = 0; i <= retries; i++) {
        try {
          return await fetchWithTimeout(url, timeoutMs, options);
        } catch (error) {
          console.log(`请求失败 (${i+1}/${retries+1}): ${error instanceof Error ? error.message : 'Unknown error'}`);
          lastError = error;
          
          if (i < retries) {
            // 重试前等待 (i+1) * 1000 毫秒
            await new Promise(resolve => setTimeout(resolve, (i+1) * 1000));
          }
        }
      }
      
      throw lastError;
    };
    
    try {
      setError(null); // 清除之前的错误
      
      // 使用带重试机制的 fetch 请求获取套利机会数据，增加timeout以获取完整数据
      const data = await fetchWithRetry('/api/arbitrage', 2, 60000); // 增加超时时间到60秒
      
      if (!data.success) {
        throw new Error(data.error || data.message || '获取套利数据失败');
      }
      
      console.log(`成功获取套利数据，数据源: ${data.dataSource || 'unknown'}`);
      
      // 更新价格数据
      setPriceData(data.prices);
      
      // 保留现有机会，仅添加新机会到顶部
      const existingOpportunities = opportunities || [];
      const newOpportunities = data.opportunities || [];
      
      // 将新机会与现有机会合并，去重
      const uniqueIdsMap = new Map();
      [...newOpportunities, ...existingOpportunities].forEach(opp => {
        const id = `${opp.buyExchange}-${opp.sellExchange}-${opp.symbol}-${opp.timestamp}`;
        if (!uniqueIdsMap.has(id)) {
          uniqueIdsMap.set(id, opp);
        }
      });
      
      // 转换回数组并按时间戳排序（最新的在前面）
      const combinedOpportunities = Array.from(uniqueIdsMap.values())
        .sort((a, b) => b.timestamp - a.timestamp);
      // 不再限制显示数量，显示所有套利机会
      
      setOpportunities(combinedOpportunities);
      setLastUpdated(new Date(data.updatedAt));
      setIsLoading(false);
      
      // 获取统计数据变化
      const fetchStatsChange = async () => {
        try {
          // 使用 POST 请求代替 GET 请求，避免查询参数过大
          const statsData = await fetchWithRetry(
            `/api/stats`,
            1,
            3000,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                opportunities: combinedOpportunities
              })
            }
          );
          
          if (statsData.success) {
            // 使用API返回的真实变化率
            setStats({
              opportunitiesChange: statsData.changes.opportunitiesChange,
              maxProfitChange: statsData.changes.maxProfitChange,
              avgProfitChange: statsData.changes.avgProfitChange
            });
          } else {
            throw new Error(statsData.error || statsData.message || '获取统计数据失败');
          }
        } catch (error) {
          console.error('获取统计变化数据时出错:', error);
          // 不设置状态变化率，只记录错误
          setStats({
            opportunitiesChange: 0,
            maxProfitChange: 0,
            avgProfitChange: 0
          });
        }
      };
      
      fetchStatsChange();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('获取数据时出错:', errorMessage);
      setError(errorMessage);
      
      // 如果加载失败但已有数据，保持已有数据的显示
      if (opportunities.length === 0) {
        // 只在没有任何数据时显示错误状态
        setIsLoading(false);
      }
    }
  };

  // 重试按钮的处理函数
  const handleRetry = () => {
    setRetryCount(retryCount + 1);
    setIsLoading(true);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-[1440px] mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-100">各大交易所套利交易监控系统</h1>
            <div className="flex gap-3 items-center">
              <div className="text-xs text-zinc-400">
                {lastUpdated ? `更新时间: ${lastUpdated.toLocaleString()}` : '加载中...'}
              </div>
              <Chip color="primary" variant="flat" size="sm">实时数据</Chip>
              <a 
                href="https://twitter.com/intent/follow?screen_name=jinghui30" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
                title="访问我的推特"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.633 7.997c.013.175.013.349.013.523 0 5.325-4.053 11.461-11.46 11.461-2.282 0-4.402-.661-6.186-1.809.324.037.636.05.973.05a8.07 8.07 0 0 0 5.001-1.721 4.036 4.036 0 0 1-3.767-2.793c.249.037.499.062.761.062.361 0 .724-.05 1.061-.137a4.027 4.027 0 0 1-3.23-3.953v-.05c.537.299 1.16.486 1.82.511a4.022 4.022 0 0 1-1.796-3.354c0-.748.199-1.434.548-2.032a11.457 11.457 0 0 0 8.306 4.215c-.062-.3-.1-.599-.1-.898a4.026 4.026 0 0 1 4.028-4.028c1.16 0 2.207.486 2.943 1.272a7.957 7.957 0 0 0 2.556-.973 4.02 4.02 0 0 1-1.771 2.22 8.073 8.073 0 0 0 2.319-.624 8.645 8.645 0 0 1-2.019 2.083z"></path></svg>
              </a>
              <a 
                href="https://github.com/snjyor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white"
                title="访问我的GitHub"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
              </a>
            </div>
          </div>
        </header>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <Spinner size="lg" color="primary" />
          </div>
        ) : error && opportunities.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-96 gap-4">
            <div className="text-danger text-center max-w-md">
              <p className="text-xl font-bold mb-2">获取数据失败</p>
              <p className="mb-4">{error}</p>
              <Button 
                color="primary" 
                onClick={handleRetry}
                className="mt-2"
              >
                重试
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 顶部统计卡片 - 24小时套利统计 */}
            <ArbitrageStats24h opportunities={opportunities} />
            
            {/* 图表区域第一行 - 时间序列和价格走势 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <DashboardCard 
                title="套利机会时间趋势" 
                className="min-h-[360px]"
              >
                <TimeSeriesChart 
                  opportunities={opportunities}
                  height={300}
                />
              </DashboardCard>
              
              <DashboardCard 
                title="交易所价格走势对比" 
                className="min-h-[360px]"
              >
                <CryptoPriceChart 
                  priceData={priceData}
                  height={300}
                />
              </DashboardCard>
            </div>
            
            {/* 图表区域第二行 - 数据流图和币种分布 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <DashboardCard 
                title="交易所之间套利流向" 
                className="min-h-[360px]"
              >
                <SankeyChart 
                  opportunities={opportunities}
                  height={300}
                  title="交易所间套利机会流向"
                />
              </DashboardCard>
              
              <DashboardCard 
                title="币种套利机会分布" 
                className="min-h-[360px]"
              >
                <OpportunitiesByCoin 
                  opportunities={opportunities}
                  height={300}
                />
              </DashboardCard>
            </div>
            
            {/* 套利机会表格 */}
            <DashboardCard 
              title="套利机会列表" 
              className="mb-8"
              headerExtra={
                <div className="flex gap-2">
                  <Button size="sm" color="primary" variant="flat" onClick={fetchData}>刷新</Button>
                  <Button size="sm" color="default" variant="flat">过滤</Button>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <ArbitrageOpportunitiesTable opportunities={opportunities} />
              </div>
            </DashboardCard>
            
          </>
        )}
      </div>
    </div>
  );
}
