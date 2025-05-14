import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { ArbitrageOpportunity } from '@/services/exchangeService';

interface TimeSeriesChartProps {
  opportunities: ArbitrageOpportunity[];
  height?: number;
  title?: string;
  timeRange?: '1h' | '4h' | '12h' | '24h' | '7d';
}

// 历史套利机会数据缓存
const opportunityHistoryCache: {
  timestamp: number;
  count: number;
}[] = [];

// 最大历史数据点数量
const MAX_DATA_POINTS = 200;

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ 
  opportunities,
  height = 350,
  title = '套利机会数量趋势',
  timeRange = '24h'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  
  // 根据时间范围设置间隔时间（分钟）
  const getIntervalMinutes = () => {
    switch(timeRange) {
      case '1h': return 5; // 每5分钟一个点
      case '4h': return 15; // 每15分钟一个点
      case '12h': return 30; // 每30分钟一个点
      case '24h': return 60; // 每60分钟一个点
      case '7d': return 360; // 每6小时一个点
      default: return 60;
    }
  };
  
  // 将毫秒转换为相应的时间范围
  const getTimeRangeInMs = () => {
    switch(timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '12h': return 12 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  };

  useEffect(() => {
    // 初始化图表
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // 清理函数
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  // 更新历史机会缓存
  useEffect(() => {
    if (!opportunities || opportunities.length === 0) return;

    const now = Date.now();
    
    // 如果距离上次更新不足一分钟，则不更新
    if (now - lastUpdateTime < 60 * 1000) return;
    
    // 更新时间戳
    setLastUpdateTime(now);
    
    // 添加当前时间点的机会数量
    const currentOpportunityCount = opportunities.filter(opp => 
      // 只统计10分钟内的机会，以代表"当前"的机会数量
      opp.timestamp > now - 10 * 60 * 1000
    ).length;
    
    // 添加到历史缓存
    opportunityHistoryCache.push({
      timestamp: now,
      count: currentOpportunityCount
    });
    
    // 限制历史数据量
    if (opportunityHistoryCache.length > MAX_DATA_POINTS) {
      opportunityHistoryCache.splice(0, opportunityHistoryCache.length - MAX_DATA_POINTS);
    }
  }, [opportunities, lastUpdateTime]);

  useEffect(() => {
    if (!chartInstance.current) return;
    
    // 如果没有历史数据且当前无机会，显示提示信息
    if (opportunityHistoryCache.length === 0 && opportunities.length === 0) {
      chartInstance.current.setOption({
        title: {
          text: '暂无套利机会数据',
          textStyle: { color: '#e6e6e6' },
          left: 'center',
          top: 'center'
        },
        series: []
      });
      return;
    }

    // 获取时间间隔（分钟）和时间范围（毫秒）
    const timeRangeMs = getTimeRangeInMs();
    
    // 当前时间
    const now = Date.now();
    
    // 创建时间段，从现在往前推timeRange
    const startTime = now - timeRangeMs;
    
    // 过滤出时间范围内的历史数据
    const filteredHistory = opportunityHistoryCache.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= now
    );
    
    // 格式化时间标签
    const formatTimeLabel = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    };
    
    // 准备数据
    const timeLabels = filteredHistory.map(entry => formatTimeLabel(entry.timestamp));
    const countData = filteredHistory.map(entry => entry.count);
    
    // 如果没有历史数据但有当前机会，添加当前时间点
    if (filteredHistory.length === 0 && opportunities.length > 0) {
      timeLabels.push(formatTimeLabel(now));
      countData.push(opportunities.length);
    }
    
    // 设置图表选项
    const option: echarts.EChartsOption = {
      title: {
        text: title,
        textStyle: {
          color: '#e6e6e6',
          fontSize: 14,
        },
        left: 10,
        top: 10,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderColor: 'rgba(80, 160, 255, 0.3)',
        textStyle: {
          color: '#fff'
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(80, 160, 255, 0.3)'
          }
        },
        formatter: function(params: any) {
          return `${params[0].name}<br/>套利机会: ${params[0].value} 个`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timeLabels,
        axisLine: {
          lineStyle: {
            color: 'rgba(80, 160, 255, 0.3)'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#a1a1aa',
          interval: Math.max(1, Math.floor(timeLabels.length / 8)), // 控制显示的标签数量
          rotate: timeLabels.length > 12 ? 45 : 0
        }
      },
      yAxis: {
        type: 'value',
        name: '套利机会数量',
        nameTextStyle: {
          color: '#a1a1aa'
        },
        min: 0,
        splitLine: {
          lineStyle: {
            color: 'rgba(80, 160, 255, 0.1)'
          }
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#a1a1aa'
        }
      },
      series: [{
        name: '套利机会',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        sampling: 'average',
        itemStyle: {
          color: '#3366FF'
        },
        lineStyle: {
          width: 2,
          color: '#3366FF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: echarts.color.modifyAlpha('#3366FF', 0.4)
            },
            {
              offset: 1,
              color: 'transparent'
            }
          ])
        },
        data: countData
      }]
    };

    chartInstance.current.setOption(option);
    
    // 响应窗口大小变化
    function handleResize() {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    }
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [opportunities, title, timeRange, lastUpdateTime]);

  return <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />;
};

export default TimeSeriesChart; 