import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { ArbitrageOpportunity } from '@/services/exchangeService';

interface OpportunitiesByCoinProps {
  opportunities: ArbitrageOpportunity[];
  height?: number;
  title?: string;
}

const OpportunitiesByCoin: React.FC<OpportunitiesByCoinProps> = ({ 
  opportunities,
  height = 350,
  title = '币种套利机会分布'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

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

  useEffect(() => {
    if (!chartInstance.current) return;

    // 如果没有数据，显示提示信息
    if (!opportunities || opportunities.length === 0) {
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

    // 按币种分组统计套利机会数量
    const coinStats: Record<string, { count: number, profit: number }> = {};
    
    // 当前时间
    const now = Date.now();
    // 24小时前的时间戳
    const past24h = now - 24 * 60 * 60 * 1000;
    
    // 只使用24小时内的数据，确保数据的实时性
    const recentOpportunities = opportunities.filter(
      opp => opp.timestamp >= past24h && opp.timestamp <= now
    );
    
    if (recentOpportunities.length === 0) {
      // 如果没有近期数据，显示提示信息
      chartInstance.current.setOption({
        title: {
          text: '暂无24小时内套利机会数据',
          textStyle: { color: '#e6e6e6' },
          left: 'center',
          top: 'center'
        },
        series: []
      });
      return;
    }
    
    recentOpportunities.forEach(opp => {
      if (!coinStats[opp.symbol]) {
        coinStats[opp.symbol] = { count: 0, profit: 0 };
      }
      coinStats[opp.symbol].count += 1;
      // 直接使用真实的估算利润数据
      coinStats[opp.symbol].profit += opp.estimatedProfit;
    });
    
    // 转换为数组并排序
    const statsArray = Object.entries(coinStats)
      .map(([symbol, stats]) => ({
        symbol,
        count: stats.count,
        profit: stats.profit
      }))
      .sort((a, b) => b.count - a.count);
    
    // 准备图表数据
    const categories = statsArray.map(item => item.symbol);
    const countData = statsArray.map(item => item.count);
    const profitData = statsArray.map(item => item.profit);
    
    // 颜色数组
    const colors = [
      '#3366FF', '#F759AB', '#52C41A', '#FAAD14', '#EB2F96', 
      '#1890FF', '#13C2C2', '#FA541C', '#722ED1', '#2F54EB'
    ];
    
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
          type: 'shadow'
        }
      },
      legend: {
        data: ['套利机会数量', '预估总利润'],
        right: 10,
        top: 10,
        textStyle: {
          color: '#e6e6e6'
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
        data: categories,
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
          interval: 0,
          rotate: categories.length > 5 ? 45 : 0
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '套利机会数量',
          nameTextStyle: {
            color: '#a1a1aa'
          },
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
        {
          type: 'value',
          name: '预估总利润',
          nameTextStyle: {
            color: '#a1a1aa'
          },
          splitLine: {
            show: false
          },
          axisLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            color: '#a1a1aa',
            formatter: function(value: number) {
              return '$' + value.toFixed(2);
            }
          }
        }
      ],
      series: [
        {
          name: '套利机会数量',
          type: 'bar' as 'bar',
          barWidth: '40%',
          itemStyle: {
            color: function(params: any) {
              return colors[params.dataIndex % colors.length];
            },
            borderRadius: [4, 4, 0, 0]
          },
          data: countData
        },
        {
          name: '预估总利润',
          type: 'line' as 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#F759AB'
          },
          lineStyle: {
            width: 3,
            color: '#F759AB'
          },
          data: profitData
        }
      ]
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
  }, [opportunities, title]);

  return <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />;
};

export default OpportunitiesByCoin; 