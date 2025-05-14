import React, { useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts';
import { ExchangePriceData, MAIN_SYMBOLS } from '@/services/exchangeService';
import { Select, SelectItem } from "@nextui-org/react";

interface CryptoPriceChartProps {
  priceData: Record<string, Record<string, ExchangePriceData>>;
  height?: number;
  title?: string;
}

// 历史价格数据缓存，用于存储每个交易对和交易所的历史价格
const priceHistoryCache: Record<string, Record<string, { timestamp: number; price: number }[]>> = {};

// 最多保留的历史数据点数
const MAX_HISTORY_POINTS = 50;

const EXCHANGE_COLORS: Record<string, string> = {
  'binance': '#F0B90B',
  'bitfinex': '#16B157',
  'bitget': '#00F2FE',
  'bybit': '#F9A900',
  'coinbase': '#0052FF',
  'gate': '#2684FF',
  'kraken': '#5841D8',
  'okx': '#121212',
  'default': '#3366FF'
};

const CryptoPriceChart: React.FC<CryptoPriceChartProps> = ({ 
  priceData,
  height = 350,
  title = '交易所价格比较'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(MAIN_SYMBOLS[0]);
  
  // 处理交易对选择变化
  const handleSymbolChange = (value: string) => {
    setSelectedSymbol(value);
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

  // 更新历史价格缓存
  useEffect(() => {
    if (!priceData || !selectedSymbol || !priceData[selectedSymbol]) return;

    const now = Date.now();
    const symbolData = priceData[selectedSymbol];
    const availableExchanges = Object.keys(symbolData);

    // 为每个交易所更新历史价格
    availableExchanges.forEach(exchange => {
      if (!priceHistoryCache[selectedSymbol]) {
        priceHistoryCache[selectedSymbol] = {};
      }
      
      if (!priceHistoryCache[selectedSymbol][exchange]) {
        priceHistoryCache[selectedSymbol][exchange] = [];
      }
      
      // 添加新价格点
      const currentPrice = symbolData[exchange].price;
      
      // 检查是否有重复的时间戳，如果有则更新价格而不是添加新点
      const lastEntry = priceHistoryCache[selectedSymbol][exchange][priceHistoryCache[selectedSymbol][exchange].length - 1];
      if (lastEntry && now - lastEntry.timestamp < 1000) { // 1秒内的更新视为同一个点
        lastEntry.price = currentPrice;
      } else {
        // 添加新数据点
        priceHistoryCache[selectedSymbol][exchange].push({
          timestamp: now,
          price: currentPrice
        });
      }
      
      // 限制历史数据量
      if (priceHistoryCache[selectedSymbol][exchange].length > MAX_HISTORY_POINTS) {
        // 移除最老的数据点
        priceHistoryCache[selectedSymbol][exchange] = priceHistoryCache[selectedSymbol][exchange].slice(
          priceHistoryCache[selectedSymbol][exchange].length - MAX_HISTORY_POINTS
        );
      }
    });
  }, [priceData, selectedSymbol]);

  useEffect(() => {
    if (!chartInstance.current || !priceData[selectedSymbol]) return;

    // 获取当前选定交易对的价格数据
    const symbolData = priceData[selectedSymbol];
    
    // 确认哪些交易所有数据
    const availableExchanges = Object.keys(symbolData);
    
    // 如果没有交易所数据，显示提示信息
    if (availableExchanges.length === 0) {
      chartInstance.current.setOption({
        title: {
          text: `暂无${selectedSymbol}的交易所价格数据`,
          textStyle: { color: '#e6e6e6' },
          left: 'center',
          top: 'center'
        },
        series: []
      });
      return;
    }
    
    // 从历史缓存中获取数据
    const timeLabels: string[] = [];
    const exchangeData: Record<string, Array<number | null>> = {};
    
    // 获取所有交易所中最早的时间点的索引，以保证所有线条对齐
    let earliestTimestampIndex = 0;
    
    // 初始化交易所数据数组
    availableExchanges.forEach(exchange => {
      exchangeData[exchange] = [];
    });
    
    // 检查历史缓存是否有数据
    if (priceHistoryCache[selectedSymbol]) {
      // 获取所有时间戳并去重排序
      const allTimestamps: number[] = [];
      availableExchanges.forEach(exchange => {
        if (priceHistoryCache[selectedSymbol][exchange]) {
          priceHistoryCache[selectedSymbol][exchange].forEach(entry => {
            if (!allTimestamps.includes(entry.timestamp)) {
              allTimestamps.push(entry.timestamp);
            }
          });
        }
      });
      
      // 排序时间戳（从旧到新）
      allTimestamps.sort((a, b) => a - b);
      
      // 为每个时间戳生成标签和数据点
      allTimestamps.forEach(timestamp => {
        const date = new Date(timestamp);
        const timeLabel = date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        timeLabels.push(timeLabel);
        
        // 为每个交易所在该时间点找到价格
        availableExchanges.forEach(exchange => {
          if (priceHistoryCache[selectedSymbol][exchange]) {
            // 查找最接近的时间点
            const priceEntry = priceHistoryCache[selectedSymbol][exchange].find(entry => entry.timestamp === timestamp);
            
            if (priceEntry) {
              exchangeData[exchange].push(priceEntry.price);
            } else {
              // 如果没有该时间点的数据，使用null表示数据缺失
              exchangeData[exchange].push(null);
            }
          } else {
            exchangeData[exchange].push(null);
          }
        });
      });
    } else {
      // 如果没有历史缓存，只使用当前价格
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      timeLabels.push(timeLabel);
      
      availableExchanges.forEach(exchange => {
        exchangeData[exchange] = [symbolData[exchange].price];
      });
    }
    
    // 根据可用交易所生成系列数据
    const series = availableExchanges.map(exchange => ({
      name: exchange,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      connectNulls: true,  // 连接空值点
      itemStyle: {
        color: EXCHANGE_COLORS[exchange] || EXCHANGE_COLORS['default']
      },
      lineStyle: {
        width: 2,
        color: EXCHANGE_COLORS[exchange] || EXCHANGE_COLORS['default']
      },
      data: exchangeData[exchange]
    }));
    
    // 设置图表选项
    const option = {
      title: {
        text: `${title} - ${selectedSymbol}`,
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
          let tooltipContent = `<div style="margin: 0px 0 0; line-height:1;">${params[0].axisValue}</div>`;
          
          params.forEach((param: any) => {
            const exchange = param.seriesName;
            const price = param.value;
            const color = EXCHANGE_COLORS[exchange] || EXCHANGE_COLORS['default'];
            
            tooltipContent += `<div style="margin: 10px 0 0; line-height:1;">
              <div style="margin: 0px 0 0; line-height:1;">
                <span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>
                <span style="font-size:14px;color:#666;font-weight:400;margin-left:2px">${exchange}:</span>
                <span style="float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900">$${price !== null ? price.toFixed(2) : 'N/A'}</span>
              </div>
            </div>`;
          });
          
          return tooltipContent;
        }
      },
      legend: {
        data: availableExchanges,
        right: 10,
        top: 10,
        textStyle: {
          color: '#e6e6e6'
        },
        icon: 'circle'
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
          rotate: timeLabels.length > 15 ? 45 : 0,
          interval: Math.max(1, Math.floor(timeLabels.length / 10)) // 控制显示的标签数量
        }
      },
      yAxis: {
        type: 'value',
        scale: true, // 按比例显示
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
          color: '#a1a1aa',
          formatter: function(value: number) {
            // 根据代币类型格式化金额显示
            if (value >= 1000) {
              return `$${value.toFixed(0)}`;
            } else if (value >= 1) {
              return `$${value.toFixed(2)}`;
            } else {
              return `$${value.toFixed(6)}`;
            }
          }
        }
      },
      series: series
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
  }, [priceData, selectedSymbol, title]);

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-blue-100">{title}</div>
        <Select 
          size="sm"
          className="max-w-xs"
          selectedKeys={[selectedSymbol]}
          onChange={(e) => handleSymbolChange(e.target.value)}
          aria-label="选择交易对"
        >
          {MAIN_SYMBOLS.map((symbol) => (
            <SelectItem key={symbol} value={symbol}>
              {symbol}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </div>
  );
};

export default CryptoPriceChart; 