import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Input, 
  Button, 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell, 
  Chip, 
  Tabs, 
  Tab, 
  Spinner,
  Divider
} from "@nextui-org/react";
import { MAIN_SYMBOLS, SUPPORTED_EXCHANGES } from '@/services/exchangeService';

// 定义价格比较结果的类型
type PriceResult = {
  exchange: string;
  symbol?: string;
  bid?: number;
  ask?: number;
  spread?: number;
  spreadPercentage?: number;
  success?: boolean;
  error?: string;
};

type PriceAnalysis = {
  lowestAsk: { exchange: string; price: number };
  highestBid: { exchange: string; price: number };
  maxSpread: { exchanges: string; difference: number; percentageDifference: number };
  potentialArbitrage: Array<{
    buyExchange: string;
    buyPrice: number;
    sellExchange: string;
    sellPrice: number;
    priceDifference: number;
    percentageDifference: number;
  }>;
};

type PriceComparisonResponse = {
  success: boolean;
  symbol: string;
  exchanges: string[];
  results: Record<string, PriceResult>;
  analysis: PriceAnalysis;
  timestamp: number;
  error?: string;
};

export default function MultiExchangePriceComparison() {
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>(SUPPORTED_EXCHANGES);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PriceComparisonResponse | null>(null);
  const [activeTab, setActiveTab] = useState('prices');

  // 处理交易对更改
  const handleSymbolChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSymbol(event.target.value.toUpperCase());
  };

  // 处理交易所选择变更
  const handleExchangeToggle = (exchangeId: string) => {
    setSelectedExchanges(prev => {
      if (prev.includes(exchangeId)) {
        return prev.filter(id => id !== exchangeId);
      } else {
        return [...prev, exchangeId];
      }
    });
  };

  // 发起价格查询
  const fetchPriceComparison = async () => {
    if (!symbol.trim()) {
      showToast("错误", "请输入有效的交易对");
      return;
    }

    if (selectedExchanges.length === 0) {
      showToast("错误", "请至少选择一个交易所");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/multi-exchange-price?symbol=${symbol}&exchanges=${selectedExchanges.join(',')}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data);
        setActiveTab('prices');
      } else {
        showToast("请求失败", data.error || "获取价格数据时出错");
      }
    } catch (error) {
      showToast("请求错误", error instanceof Error ? error.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  // 简易提示函数（替代useToast）
  const showToast = (title: string, message: string) => {
    console.error(`${title}: ${message}`);
    // 在实际应用中这里可以使用 window.alert 或其他方式显示提示
    alert(`${title}: ${message}`);
  };

  // 切换全选/全不选所有交易所
  const toggleAllExchanges = () => {
    if (selectedExchanges.length === SUPPORTED_EXCHANGES.length) {
      setSelectedExchanges([]);
    } else {
      setSelectedExchanges([...SUPPORTED_EXCHANGES]);
    }
  };

  // 格式化价格显示
  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'N/A';
    return price < 0.01 ? price.toFixed(8) : price.toFixed(2);
  };

  // 格式化百分比显示
  const formatPercentage = (percentage: number | undefined) => {
    if (percentage === undefined) return 'N/A';
    return `${percentage.toFixed(4)}%`;
  };

  // 渲染价格表格
  const renderPricesTable = () => {
    if (!results || !results.results) return null;

    return (
      <div className="overflow-x-auto">
        <Table aria-label="价格对比表格" className="min-w-full">
          <TableHeader>
            <TableColumn>交易所</TableColumn>
            <TableColumn>交易对</TableColumn>
            <TableColumn>买入价(Bid)</TableColumn>
            <TableColumn>卖出价(Ask)</TableColumn>
            <TableColumn>价差</TableColumn>
            <TableColumn>价差百分比</TableColumn>
            <TableColumn>状态</TableColumn>
          </TableHeader>
          <TableBody>
            {Object.entries(results.results).map(([exchangeId, result]) => (
              <TableRow key={exchangeId}>
                <TableCell className="font-medium">{exchangeId}</TableCell>
                <TableCell>{result.symbol || '-'}</TableCell>
                <TableCell>{formatPrice(result.bid)}</TableCell>
                <TableCell>{formatPrice(result.ask)}</TableCell>
                <TableCell>{formatPrice(result.spread)}</TableCell>
                <TableCell>{formatPercentage(result.spreadPercentage)}</TableCell>
                <TableCell>
                  {result.success === false ? (
                    <Chip color="danger" variant="flat">失败</Chip>
                  ) : (
                    <Chip color="success" variant="flat">成功</Chip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // 渲染分析结果
  const renderAnalysisResults = () => {
    if (!results || !results.analysis) return null;

    const { lowestAsk, highestBid, maxSpread, potentialArbitrage } = results.analysis;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm font-medium">最低卖出价 (Lowest Ask)</h4>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold">
                {formatPrice(lowestAsk.price)}
              </div>
              <p className="text-xs text-default-500 mt-1">
                交易所: {lowestAsk.exchange || 'N/A'}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm font-medium">最高买入价 (Highest Bid)</h4>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold">
                {formatPrice(highestBid.price)}
              </div>
              <p className="text-xs text-default-500 mt-1">
                交易所: {highestBid.exchange || 'N/A'}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm font-medium">最大价差</h4>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold">
                {formatPercentage(maxSpread.percentageDifference)}
              </div>
              <p className="text-xs text-default-500 mt-1">
                交易所对比: {maxSpread.exchanges || 'N/A'}
              </p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h4 className="text-large font-bold">潜在套利机会</h4>
          </CardHeader>
          <CardBody>
            {potentialArbitrage.length > 0 ? (
              <Table aria-label="套利机会表格">
                <TableHeader>
                  <TableColumn>买入交易所</TableColumn>
                  <TableColumn>买入价格</TableColumn>
                  <TableColumn>卖出交易所</TableColumn>
                  <TableColumn>卖出价格</TableColumn>
                  <TableColumn>价差</TableColumn>
                  <TableColumn>收益率</TableColumn>
                </TableHeader>
                <TableBody>
                  {potentialArbitrage.map((opportunity, index) => (
                    <TableRow key={index}>
                      <TableCell>{opportunity.buyExchange}</TableCell>
                      <TableCell>{formatPrice(opportunity.buyPrice)}</TableCell>
                      <TableCell>{opportunity.sellExchange}</TableCell>
                      <TableCell>{formatPrice(opportunity.sellPrice)}</TableCell>
                      <TableCell>{formatPrice(opportunity.priceDifference)}</TableCell>
                      <TableCell className="font-bold text-success">
                        {formatPercentage(opportunity.percentageDifference)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4">
                <p className="text-default-500">当前没有发现套利机会</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h4 className="text-large font-bold">多交易所价格对比</h4>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="symbol" className="block text-sm font-medium mb-1">
                  交易对
                </label>
                <Input
                  id="symbol"
                  placeholder="例如: BTC/USDT"
                  value={symbol}
                  onChange={handleSymbolChange}
                />
              </div>
              <div className="flex-none">
                <label className="block text-sm font-medium mb-1">
                  &nbsp;
                </label>
                <Button
                  onClick={fetchPriceComparison}
                  isDisabled={isLoading}
                  className="w-full"
                  color="primary"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      加载中...
                    </>
                  ) : (
                    "查询价格"
                  )}
                </Button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  选择交易所
                </label>
                <Button
                  variant="bordered"
                  size="sm"
                  onClick={toggleAllExchanges}
                >
                  {selectedExchanges.length === SUPPORTED_EXCHANGES.length ? "取消全选" : "全选"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_EXCHANGES.map((exchange) => (
                  <Chip
                    key={exchange}
                    color={selectedExchanges.includes(exchange) ? "primary" : "default"}
                    variant={selectedExchanges.includes(exchange) ? "solid" : "bordered"}
                    className="cursor-pointer"
                    onClick={() => handleExchangeToggle(exchange)}
                  >
                    {exchange}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {results && (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex justify-between items-center">
              <h4 className="text-large font-bold">结果</h4>
              <div className="text-xs text-default-500">
                查询时间: {new Date(results.timestamp).toLocaleString()}
              </div>
            </div>
            <Tabs
              aria-label="查询结果标签页"
              selectedKey={activeTab}
              onSelectionChange={(key) => setActiveTab(key as string)}
              className="mt-2"
            >
              <Tab key="prices" title="价格对比" />
              <Tab key="analysis" title="分析结果" />
            </Tabs>
          </CardHeader>
          <CardBody className="pt-4">
            {activeTab === 'prices' && renderPricesTable()}
            {activeTab === 'analysis' && renderAnalysisResults()}
          </CardBody>
        </Card>
      )}
    </div>
  );
} 