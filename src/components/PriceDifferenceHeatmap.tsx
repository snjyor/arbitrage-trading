import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Select, SelectItem, Spinner } from "@nextui-org/react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/react";
import { SUPPORTED_EXCHANGES } from '@/services/exchangeService';

// 定义属性类型
type PriceDifferenceHeatmapProps = {
  symbol?: string;
  onSymbolChange?: (symbol: string) => void;
};

// 定义数据类型
type PriceDiffData = {
  exchange1: string;
  exchange2: string;
  askDiff: number;
  bidDiff: number;
  percentageDiff: number;
  potentialArbitrage: boolean;
};

type HeatmapData = {
  exchanges: string[];
  differenceMatrix: Record<string, Record<string, PriceDiffData>>;
  timestamp: number;
};

export default function PriceDifferenceHeatmap({ symbol = 'BTC/USDT', onSymbolChange }: PriceDifferenceHeatmapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState(symbol);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [view, setView] = useState<'percentage' | 'absolute'>('percentage');

  // 获取热力图数据
  const fetchHeatmapData = async () => {
    setIsLoading(true);
    try {
      // 请求所有交易所的价格数据
      const response = await fetch(`/api/multi-exchange-price?symbol=${currentSymbol}&exchanges=${SUPPORTED_EXCHANGES.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        // 处理数据生成热力图矩阵
        const exchanges = Object.keys(data.results).filter(
          exchangeId => data.results[exchangeId].success !== false
        );
        
        const differenceMatrix: Record<string, Record<string, PriceDiffData>> = {};
        
        // 计算每对交易所之间的价格差异
        for (let i = 0; i < exchanges.length; i++) {
          const exchange1 = exchanges[i];
          if (!differenceMatrix[exchange1]) {
            differenceMatrix[exchange1] = {};
          }
          
          for (let j = 0; j < exchanges.length; j++) {
            const exchange2 = exchanges[j];
            
            // 不计算自己与自己的差异
            if (exchange1 === exchange2) {
              differenceMatrix[exchange1][exchange2] = {
                exchange1,
                exchange2,
                askDiff: 0,
                bidDiff: 0,
                percentageDiff: 0,
                potentialArbitrage: false
              };
              continue;
            }
            
            const data1 = data.results[exchange1];
            const data2 = data.results[exchange2];
            
            if (data1.success === false || data2.success === false) {
              continue;
            }
            
            // 计算买卖价差异
            const askDiff = data1.ask - data2.ask;
            const bidDiff = data1.bid - data2.bid;
            
            // 计算百分比差异（基于较低价格）
            const baseAskPrice = Math.min(data1.ask, data2.ask);
            const askPercentageDiff = (Math.abs(askDiff) / baseAskPrice) * 100;
            
            const baseBidPrice = Math.min(data1.bid, data2.bid);
            const bidPercentageDiff = (Math.abs(bidDiff) / baseBidPrice) * 100;
            
            // 使用两个差异的平均值
            const percentageDiff = (askPercentageDiff + bidPercentageDiff) / 2;
            
            // 检测潜在套利
            const potentialArbitrage = (data1.bid > data2.ask) || (data2.bid > data1.ask);
            
            differenceMatrix[exchange1][exchange2] = {
              exchange1,
              exchange2,
              askDiff,
              bidDiff,
              percentageDiff,
              potentialArbitrage
            };
          }
        }
        
        setHeatmapData({
          exchanges,
          differenceMatrix,
          timestamp: data.timestamp
        });
      }
    } catch (error) {
      console.error('获取热力图数据时出错:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 符号变化时更新数据
  useEffect(() => {
    if (currentSymbol) {
      fetchHeatmapData();
    }
  }, [currentSymbol]);

  // 处理符号变更
  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCurrentSymbol(value);
    if (onSymbolChange) {
      onSymbolChange(value);
    }
  };

  // 计算热力图单元格的颜色
  const getCellColor = (diff: number, isPercentage: boolean) => {
    // 对于百分比差异
    if (isPercentage) {
      if (diff <= 0.01) return 'bg-gray-50';
      if (diff <= 0.1) return 'bg-blue-50';
      if (diff <= 0.25) return 'bg-blue-100';
      if (diff <= 0.5) return 'bg-blue-200';
      if (diff <= 1.0) return 'bg-blue-300';
      if (diff <= 2.0) return 'bg-green-300';
      if (diff <= 3.0) return 'bg-green-400';
      if (diff <= 5.0) return 'bg-yellow-300';
      return 'bg-red-400';
    } 
    // 对于绝对差异
    else {
      const absDiff = Math.abs(diff);
      if (absDiff <= 0.1) return 'bg-gray-50';
      if (absDiff <= 1) return 'bg-blue-50';
      if (absDiff <= 5) return 'bg-blue-100';
      if (absDiff <= 10) return 'bg-blue-200';
      if (absDiff <= 50) return 'bg-blue-300';
      if (absDiff <= 100) return 'bg-green-300';
      if (absDiff <= 500) return 'bg-green-400';
      if (absDiff <= 1000) return 'bg-yellow-300';
      return 'bg-red-400';
    }
  };

  // 格式化差异数值
  const formatDiff = (diff: number, isPercentage: boolean) => {
    if (isPercentage) {
      return `${diff.toFixed(4)}%`;
    } else {
      if (Math.abs(diff) < 0.01) {
        return diff.toFixed(6);
      } else if (Math.abs(diff) < 1) {
        return diff.toFixed(4);
      } else {
        return diff.toFixed(2);
      }
    }
  };

  // 渲染热力图
  const renderHeatmap = () => {
    if (!heatmapData || heatmapData.exchanges.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-default-500">
            {isLoading ? '加载中...' : '暂无数据'}
          </p>
        </div>
      );
    }

    const { exchanges, differenceMatrix } = heatmapData;

    // 创建表头列
    const columns = [
      <TableColumn key="exchange" className="w-[100px]">交易所</TableColumn>,
      ...exchanges.map(exchange => (
        <TableColumn key={exchange} className="text-center">{exchange}</TableColumn>
      ))
    ];

    // 创建行数据
    const rows = exchanges.map(rowExchange => {
      // 创建每行的单元格
      const cells = [
        <TableCell key="exchange-name" className="font-medium">{rowExchange}</TableCell>,
        ...exchanges.map(colExchange => {
          const cellData = differenceMatrix[rowExchange][colExchange];
          
          if (!cellData) {
            return <TableCell key={colExchange} className="text-center">-</TableCell>;
          }
          
          const diffValue = view === 'percentage' 
            ? cellData.percentageDiff 
            : (rowExchange === colExchange ? 0 : (view === 'absolute' ? cellData.askDiff : 0));
          
          const cellClass = rowExchange === colExchange 
            ? 'bg-gray-100' 
            : getCellColor(
                view === 'percentage' ? cellData.percentageDiff : Math.abs(diffValue),
                view === 'percentage'
              );
          
          return (
            <TableCell 
              key={colExchange} 
              className={`text-center ${cellClass} ${cellData.potentialArbitrage ? 'font-bold' : ''}`}
            >
              {rowExchange === colExchange ? '-' : formatDiff(diffValue, view === 'percentage')}
            </TableCell>
          );
        })
      ];

      return (
        <TableRow key={rowExchange}>
          {cells}
        </TableRow>
      );
    });

    return (
      <div className="overflow-x-auto">
        <Table aria-label="价格差异热力图" className="min-w-full">
          <TableHeader>
            {columns}
          </TableHeader>
          <TableBody>
            {rows}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full">
          <h4 className="text-large font-bold">价格差异热力图</h4>
          <div className="flex flex-col sm:flex-row gap-2 mt-2 md:mt-0">
            <Select
              label="交易对"
              className="w-[140px]"
              selectedKeys={[currentSymbol]}
              onChange={handleSymbolChange}
            >
              <SelectItem key="BTC/USDT" value="BTC/USDT">BTC/USDT</SelectItem>
              <SelectItem key="ETH/USDT" value="ETH/USDT">ETH/USDT</SelectItem>
              <SelectItem key="SOL/USDT" value="SOL/USDT">SOL/USDT</SelectItem>
              <SelectItem key="XRP/USDT" value="XRP/USDT">XRP/USDT</SelectItem>
              <SelectItem key="DOGE/USDT" value="DOGE/USDT">DOGE/USDT</SelectItem>
            </Select>
            <div className="flex gap-1">
              <Button 
                variant={view === 'percentage' ? "solid" : "flat"} 
                size="sm"
                onClick={() => setView('percentage')}
                className="min-w-0 px-3"
              >
                百分比
              </Button>
              <Button 
                variant={view === 'absolute' ? "solid" : "flat"} 
                size="sm"
                onClick={() => setView('absolute')}
                className="min-w-0 px-3"
              >
                绝对值
              </Button>
            </div>
            <Button 
              variant="flat" 
              size="sm"
              onClick={fetchHeatmapData}
              isDisabled={isLoading}
            >
              {isLoading ? "加载中..." : "刷新"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner label="加载中..." />
          </div>
        ) : (
          renderHeatmap()
        )}
        {heatmapData && (
          <div className="text-xs text-default-500 text-right mt-2">
            更新时间: {new Date(heatmapData.timestamp).toLocaleString()}
          </div>
        )}
      </CardBody>
    </Card>
  );
} 