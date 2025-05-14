import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface CircularProgressProps {
  value: number;
  max?: number;
  title?: string;
  subtitle?: string;
  height?: number;
  color?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  title,
  subtitle,
  height = 200,
  color = '#3366FF'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 计算百分比值
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

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
      series: [
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          radius: '90%',
          pointer: {
            show: false
          },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: color
                  },
                  {
                    offset: 1,
                    color: echarts.color.modifyAlpha(color, 0.7)
                  }
                ]
              },
              shadowColor: echarts.color.modifyAlpha(color, 0.2),
              shadowBlur: 10
            }
          },
          axisLine: {
            lineStyle: {
              width: 15,
              color: [[1, 'rgba(80, 160, 255, 0.1)']]
            }
          },
          splitLine: {
            show: false
          },
          axisTick: {
            show: false
          },
          axisLabel: {
            show: false
          },
          data: [
            {
              value: percentage,
              name: subtitle || '',
              title: {
                offsetCenter: ['0%', '20%'],
                color: '#a1a1aa',
                fontSize: 12
              },
              detail: {
                offsetCenter: ['0%', '0%'],
                formatter: function() {
                  return `{value|${value.toFixed(0)}}{unit|${max ? '/' + max : '%'}}`;
                },
                rich: {
                  value: {
                    color: '#e6e6e6',
                    fontSize: 28,
                    fontWeight: 'bold',
                    padding: [0, 5, 0, 0]
                  },
                  unit: {
                    color: '#a1a1aa',
                    fontSize: 14
                  }
                }
              }
            }
          ]
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
  }, [percentage, value, max, subtitle, color]);

  return (
    <div className="flex flex-col items-center">
      {title && <div className="text-sm text-blue-100 mb-2">{title}</div>}
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </div>
  );
};

export default CircularProgress; 