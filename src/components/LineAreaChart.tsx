import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface LineAreaChartProps {
  data: {
    categories: string[];
    series: Array<{
      name: string;
      data: number[];
      color: string;
      areaColor?: string;
    }>;
  };
  height?: number;
  title?: string;
}

const LineAreaChart: React.FC<LineAreaChartProps> = ({ 
  data, 
  height = 260, 
  title = ''
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

    const option: echarts.EChartsOption = {
      title: title ? {
        text: title,
        textStyle: {
          color: '#e6e6e6',
          fontSize: 14,
        },
        left: 10,
        top: 10,
      } : undefined,
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
        }
      },
      legend: {
        data: data.series.map(item => item.name),
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
        top: title ? '15%' : '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.categories,
        axisLine: {
          lineStyle: {
            color: 'rgba(80, 160, 255, 0.3)'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#a1a1aa'
        }
      },
      yAxis: {
        type: 'value',
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
      series: data.series.map(series => ({
        name: series.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        sampling: 'average',
        itemStyle: {
          color: series.color
        },
        lineStyle: {
          width: 2,
          color: series.color
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: series.areaColor || echarts.color.modifyAlpha(series.color, 0.4)
            },
            {
              offset: 1,
              color: series.areaColor ? echarts.color.modifyAlpha(series.areaColor, 0.1) : 'transparent'
            }
          ])
        },
        data: series.data
      }))
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
  }, [data, title]);

  return <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />;
};

export default LineAreaChart; 