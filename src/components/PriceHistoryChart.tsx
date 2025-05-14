import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Select, SelectItem, Spinner } from "@nextui-org/react";
import { SUPPORTED_EXCHANGES, MAIN_SYMBOLS } from '@/services/exchangeService';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart, 
  AreaChart
} from 'recharts';

// 定义组件属性
type PriceHistoryChartProps = {
  symbol?: string;
  timeRange?: string;
  onSymbolChange?: (symbol: string) => void;
  onRangeChange?: (range: string) => void;
};

// 定义价格历史记录类型
type PriceRecord = {
  timestamp: number;
  exchange: string;
  price: number;
};

type ChartData = {
  symbol: string;
  timeRange: string;
  data: PriceRecord[];
  exchanges: string[];
  minPrice: number;
  maxPrice: number;
  lastUpdated: number;
};

// 模拟API端点 - 实际项目中应替换为真实API端点
const API_ENDPOINT = '/api/price-history';

export default function PriceHistoryChart({ 
  symbol = 'BTC/USDT', 
  timeRange = '1h',
  onSymbolChange,
  onRangeChange
}: PriceHistoryChartProps) {
  const [currentSymbol, setCurrentSymbol] = useState(symbol);
  const [currentRange, setCurrentRange] = useState(timeRange);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 选择的交易所
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(
    SUPPORTED_EXCHANGES.slice(0, 4)
  );

  // 时间范围选项
  const timeRanges = [
    { value: '15m', label: '15分钟' },
    { value: '1h', label: '1小时' },
    { value: '4h', label: '4小时' },
    { value: '1d', label: '1天' },
    { value: '1w', label: '1周' }
  ];

  // 获取价格历史数据
  const fetchPriceHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 构建请求参数
      const params = new URLSearchParams({
        symbol: currentSymbol,
        timeRange: currentRange,
        exchanges: selectedExchanges.join(',')
      });
      
      // 发起API请求获取真实数据
      const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '获取数据失败');
      }
      
      setChartData({
        symbol: data.symbol,
        timeRange: data.timeRange,
        data: data.data,
        exchanges: data.exchanges,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        lastUpdated: data.lastUpdated
      });
    } catch (error) {
      console.error('获取价格历史数据时出错:', error);
      setError(error instanceof Error ? error.message : '获取数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 当符号或时间范围变化时获取数据
  useEffect(() => {
    fetchPriceHistory();
  }, [currentSymbol, currentRange, selectedExchanges]);

  // 处理符号变更
  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCurrentSymbol(value);
    if (onSymbolChange) {
      onSymbolChange(value);
    }
  };

  // 处理时间范围变更
  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCurrentRange(value);
    if (onRangeChange) {
      onRangeChange(value);
    }
  };

  // 处理交易所选择
  const handleExchangeToggle = (exchange: string) => {
    setSelectedExchanges(prev => {
      if (prev.includes(exchange)) {
        return prev.filter(e => e !== exchange);
      } else {
        return [...prev, exchange];
      }
    });
  };

  // 准备图表数据
  const prepareChartData = () => {
    if (!chartData) return [];
    
    // 将数据按时间戳分组
    const groupedByTimestamp: Record<number, {time: number, formattedTime: string, [key: string]: any}> = {};
    
    chartData.data.forEach(record => {
      if (!groupedByTimestamp[record.timestamp]) {
        groupedByTimestamp[record.timestamp] = {
          time: record.timestamp,
          formattedTime: format(new Date(record.timestamp), getTimeFormat())
        };
      }
      
      // 为每个交易所添加价格数据
      groupedByTimestamp[record.timestamp][record.exchange] = record.price;
    });
    
    return Object.values(groupedByTimestamp).sort((a, b) => a.time - b.time);
  };
  
  // 基于时间范围获取适当的时间格式
  const getTimeFormat = () => {
    switch (currentRange) {
      case '15m':
      case '1h':
        return 'HH:mm';
      case '4h':
        return 'HH:mm';
      case '1d':
        return 'MM-dd HH:mm';
      case '1w':
        return 'MM-dd';
      default:
        return 'HH:mm';
    }
  };
  
  // 获取每个交易所的唯一颜色
  const getExchangeColor = (exchange: string) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', 
      '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
    ];
    
    const index = SUPPORTED_EXCHANGES.indexOf(exchange) % colors.length;
    return colors[index];
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full mb-4">
        <h4 className="text-large font-bold">价格历史趋势</h4>
        <div className="flex flex-col sm:flex-row gap-2 mt-2 md:mt-0">
          <Select
            label="交易对"
            className="w-[140px]"
            selectedKeys={[currentSymbol]}
            onChange={handleSymbolChange}
          >
            {MAIN_SYMBOLS.slice(0, 5).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </Select>
          
          <Select
            label="时间范围"
            className="w-[100px]"
            selectedKeys={[currentRange]}
            onChange={handleRangeChange}
          >
            {timeRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
            ))}
          </Select>

          <Button
            size="sm"
            variant="flat"
            onClick={fetchPriceHistory}
            isDisabled={isLoading}
          >
            {isLoading ? "加载中..." : "刷新"}
          </Button>
        </div>
      </div>
      
      <div className="mb-4 flex flex-wrap gap-1">
        {SUPPORTED_EXCHANGES.slice(0, 6).map((exchange) => (
          <Button
            key={exchange}
            size="sm"
            variant={selectedExchanges.includes(exchange) ? "solid" : "flat"}
            onClick={() => handleExchangeToggle(exchange)}
            className="text-xs"
          >
            {exchange}
          </Button>
        ))}
      </div>
      
      <Card className="w-full shadow-md overflow-hidden">
        <CardBody className="px-2 py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <Spinner label="加载中..." />
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-danger">{error}</p>
            </div>
          ) : chartData ? (
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={prepareChartData()}
                  margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f5f5f5"
                  />
                  <XAxis
                    dataKey="formattedTime"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[chartData.minPrice, chartData.maxPrice]}
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => {
                      // 根据价格范围格式化Y轴标签
                      if (value >= 1000) {
                        return `$${(value / 1000).toFixed(1)}k`;
                      } else if (value >= 1) {
                        return `$${value.toFixed(2)}`;
                      } else {
                        return `$${value.toFixed(4)}`;
                      }
                    }}
                  />
                  <RechartTooltip
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(value >= 1 ? 2 : 4)}`,
                      name
                    ]}
                    labelFormatter={(label) => `时间: ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span style={{ color: getExchangeColor(value), marginLeft: '10px' }}>{value}</span>}
                  />
                  
                  {selectedExchanges.map((exchange) => (
                    <Line
                      key={exchange}
                      type="monotone"
                      dataKey={exchange}
                      name={exchange}
                      stroke={getExchangeColor(exchange)}
                      dot={false}
                      strokeWidth={2}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-default-500">暂无数据</p>
            </div>
          )}
          
          {chartData && (
            <div className="text-xs text-default-500 text-right mt-4 px-2">
              更新时间: {format(chartData.lastUpdated, 'yyyy-MM-dd HH:mm:ss')}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
} 