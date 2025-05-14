import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Select, SelectItem } from "@nextui-org/react";
import { ArbitrageOpportunity } from '@/services/exchangeService';

// 引入 sankey 图表类型
import 'echarts/lib/chart/sankey';

interface SankeyChartProps {
  opportunities: ArbitrageOpportunity[];
  height?: number;
  title?: string;
}

const SankeyChart: React.FC<SankeyChartProps> = ({ 
  opportunities,
  height = 400,
  title = ''
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  
  // 从机会数据中提取所有可用的交易对
  const availableSymbols = ['all', ...Array.from(new Set(opportunities.map(opp => opp.symbol)))];

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

  useEffect(() => {
    if (!chartInstance.current) return;

    // 过滤选定的交易对的机会
    const filteredOpportunities = selectedSymbol === 'all' 
      ? opportunities 
      : opportunities.filter(opp => opp.symbol === selectedSymbol);

    if (filteredOpportunities.length === 0) {
      // 如果没有数据，显示空图表
      chartInstance.current.setOption({
        title: {
          text: '暂无套利数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#e6e6e6'
          }
        },
        series: []
      });
      return;
    }

    // ======== 使用有向无环图(DAG)方法处理套利流向 ========
    
    // 1. 收集所有唯一的交易所
    const exchanges = new Set<string>();
    filteredOpportunities.forEach(opp => {
      exchanges.add(opp.buyExchange);
      exchanges.add(opp.sellExchange);
    });
    
    // 2. 计算交易所间的净流量，确保不会出现循环
    const netFlows: Record<string, Record<string, number>> = {};
    
    // 初始化净流量矩阵
    exchanges.forEach(source => {
      netFlows[source] = {};
      exchanges.forEach(target => {
        if (source !== target) {
          netFlows[source][target] = 0;
        }
      });
    });
    
    // 计算每对交易所之间的净流量
    filteredOpportunities.forEach(opp => {
      const { buyExchange, sellExchange, estimatedProfit } = opp;
      if (buyExchange !== sellExchange) {
        netFlows[buyExchange][sellExchange] += estimatedProfit;
      }
    });
    
    // 3. 创建节点列表
    const nodes = Array.from(exchanges).map(exchange => ({ name: exchange }));
    
    // 4. 创建有向边，确保只有净流量为正的边
    const links: { source: string; target: string; value: number }[] = [];
    
    exchanges.forEach(source => {
      exchanges.forEach(target => {
        if (source !== target) {
          const sourceToTarget = netFlows[source][target] || 0;
          const targetToSource = netFlows[target][source] || 0;
          
          // 确定净流量方向
          if (sourceToTarget > targetToSource) {
            links.push({
              source,
              target,
              value: Math.max(0.01, sourceToTarget - targetToSource) // 确保值为正且不为零
            });
          }
        }
      });
    });
    
    // 5. 为了增强可视化效果，根据流量大小对节点排序
    const nodeValues: Record<string, number> = {};
    links.forEach(link => {
      if (!nodeValues[link.source]) nodeValues[link.source] = 0;
      if (!nodeValues[link.target]) nodeValues[link.target] = 0;
      nodeValues[link.source] += link.value;
      nodeValues[link.target] += link.value;
    });
    
    // 6. 创建自定义的力导向图
    try {
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
          trigger: 'item',
          triggerOn: 'mousemove',
          formatter: function(params: any) {
            if (params.dataType === 'edge') {
              const { source, target, value } = params.data;
              return `${source} → ${target}<br/>净流量: $${value.toFixed(2)}`;
            } else {
              const { name } = params.data;
              // 计算与此节点相关的所有套利机会数量
              const relatedOpportunities = filteredOpportunities.filter(
                opp => opp.buyExchange === name || opp.sellExchange === name
              );
              return `${name}<br/>相关套利机会: ${relatedOpportunities.length}个`;
            }
          }
        },
        series: [{
          type: 'graph',
          layout: 'force',
          data: nodes.map(node => ({
            name: node.name,
            symbolSize: Math.max(30, Math.min(60, (nodeValues[node.name] || 0) * 5 + 30)),
            itemStyle: {
              color: echarts.color.modifyAlpha('#1a6eff', 0.8)
            },
            label: {
              show: true,
              color: '#fff',
              position: 'inside',
              formatter: function(params: any) {
                return params.name;
              }
            }
          })),
          links: links.map(link => ({
            source: link.source,
            target: link.target,
            value: link.value,
            lineStyle: {
              width: Math.max(1, Math.min(7, Math.sqrt(link.value) * 0.5)),
              color: echarts.color.modifyAlpha('#aaa', 0.6),
              curveness: 0.3
            }
          })),
          force: {
            repulsion: 350,
            edgeLength: 120,
            gravity: 0.1
          },
          roam: true,
          focusNodeAdjacency: true,
          emphasis: {
            focus: 'adjacency',
            lineStyle: {
              width: 5
            }
          }
        }]
      };
      
      chartInstance.current.setOption(option);
    } catch (error) {
      console.error('设置图表选项时出错:', error);
      // 备用选项，显示简单文本信息
      chartInstance.current.setOption({
        title: {
          text: '图表渲染失败',
          subtext: '请尝试选择不同的交易对',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#e6e6e6'
          },
          subtextStyle: {
            color: '#aaa'
          }
        }
      });
    }
    
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
  }, [opportunities, selectedSymbol, title]);

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
          {availableSymbols.map((symbol) => (
            <SelectItem key={symbol} value={symbol}>
              {symbol === 'all' ? '所有交易对' : symbol}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
    </div>
  );
};

export default SankeyChart; 