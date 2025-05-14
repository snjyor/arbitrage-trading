"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardBody, 
  Select, 
  SelectItem, 
  Button, 
  Spinner, 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell,
  Chip,
  Divider,
  Input,
  Accordion,
  AccordionItem
} from '@nextui-org/react';
import { ArrowDownIcon, SearchIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';

// 测试结果接口
interface TestResult {
  success: boolean;
  symbol?: string;
  bid?: number;
  ask?: number;
  error?: string;
}

// 结果对象类型
type TestResults = Record<string, TestResult>;

export default function ExchangeTestPage() {
  // 状态管理
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [customSymbol, setCustomSymbol] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [testResults, setTestResults] = useState<TestResults>({});
  const [error, setError] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<boolean>(false);

  // 初始加载交易所和交易对
  useEffect(() => {
    async function fetchExchangesAndSymbols() {
      try {
        const response = await fetch('/api/test-exchange');
        if (!response.ok) {
          throw new Error(`请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          setExchanges(data.supported_exchanges || []);
          setSymbols(data.main_symbols || []);
        } else {
          setError(data.error || '获取交易所信息失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setIsFetching(false);
      }
    }
    
    fetchExchangesAndSymbols();
  }, []);

  // 测试单个交易所的所有交易对
  const testExchange = async () => {
    if (!selectedExchange) {
      setError('请选择交易所');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setTestResults({});
    
    try {
      // 如果选择了自定义交易对
      if (customSymbol) {
        const response = await fetch(`/api/test-exchange?exchange=${selectedExchange}&symbol=${customSymbol}`);
        const data = await response.json();
        
        if (data.success) {
          setTestResults({ 
            [customSymbol]: data.result 
          });
        } else {
          setError(data.error || '测试失败');
        }
      } 
      // 否则测试所有交易对
      else {
        const response = await fetch(`/api/test-exchange?exchange=${selectedExchange}`);
        const data = await response.json();
        
        if (data.success) {
          setTestResults(data.results || {});
        } else {
          setError(data.error || '测试失败');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 测试单个交易对
  const testSingleSymbol = async () => {
    if (!selectedExchange || (!selectedSymbol && !customSymbol)) {
      setError('请选择交易所和交易对');
      return;
    }
    
    const symbolToTest = customSymbol || selectedSymbol;
    
    setIsLoading(true);
    setError(null);
    setTestResults({});
    
    try {
      const response = await fetch(`/api/test-exchange?exchange=${selectedExchange}&symbol=${symbolToTest}`);
      const data = await response.json();
      
      if (data.success) {
        setTestResults({ 
          [symbolToTest]: data.result 
        });
      } else {
        setError(data.error || '测试交易对失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">交易所测试工具</h1>
      
      {isFetching ? (
        <div className="flex justify-center my-8">
          <Spinner size="lg" label="加载中..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* 交易所和交易对选择 */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Select
                    label="选择交易所"
                    placeholder="请选择要测试的交易所"
                    selectedKeys={[selectedExchange]}
                    onChange={(e) => setSelectedExchange(e.target.value)}
                    isDisabled={isLoading}
                  >
                    {exchanges.map((exchange) => (
                      <SelectItem key={exchange} value={exchange}>
                        {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                
                <div className="flex-1">
                  <Select
                    label="选择标准交易对"
                    placeholder="请选择标准交易对或使用自定义交易对"
                    selectedKeys={[selectedSymbol]}
                    onChange={(e) => {
                      setSelectedSymbol(e.target.value);
                      setCustomSymbol(""); // 清空自定义交易对
                    }}
                    isDisabled={isLoading || !selectedExchange}
                  >
                    {symbols.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
              
              <Divider className="my-2" />
              
              <div className="mb-4">
                <Input
                  label="自定义交易对"
                  placeholder="例如: BTC/USDT, ETH/USD"
                  value={customSymbol}
                  onChange={(e) => {
                    setCustomSymbol(e.target.value);
                    setSelectedSymbol(""); // 清空标准交易对选择
                  }}
                  isDisabled={isLoading || !selectedExchange}
                  endContent={
                    customSymbol && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => setCustomSymbol("")}
                      >
                        <XCircleIcon size={16} />
                      </Button>
                    )
                  }
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  color="primary"
                  onClick={selectedSymbol || customSymbol ? testSingleSymbol : testExchange}
                  isLoading={isLoading}
                  startContent={isLoading ? null : <RefreshCwIcon size={16} />}
                  className="flex-1"
                >
                  {selectedSymbol || customSymbol ? "测试单个交易对" : "测试所有主要交易对"}
                </Button>
                
                <Button
                  color="secondary"
                  onClick={testExchange}
                  isLoading={isLoading}
                  isDisabled={!selectedExchange}
                  startContent={isLoading ? null : <SearchIcon size={16} />}
                  className="flex-1"
                >
                  测试所有交易对
                </Button>
              </div>
            </CardBody>
          </Card>
          
          {/* 错误显示 */}
          {error && (
            <Card className="bg-danger-50 border-danger">
              <CardBody className="text-danger">
                <p className="font-medium">{error}</p>
              </CardBody>
            </Card>
          )}
          
          {/* 测试结果 */}
          {Object.keys(testResults).length > 0 && (
            <Card>
              <CardBody>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">测试结果</h2>
                  <Chip 
                    color={isAllSuccessful() ? "success" : "danger"}
                    variant="flat"
                  >
                    {isAllSuccessful() ? "全部成功" : "部分失败"}
                  </Chip>
                </div>
                
                <Table aria-label="交易对测试结果表">
                  <TableHeader>
                    <TableColumn>交易对</TableColumn>
                    <TableColumn>状态</TableColumn>
                    <TableColumn>买价</TableColumn>
                    <TableColumn>卖价</TableColumn>
                    <TableColumn>错误信息</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(testResults).map(([symbol, result]) => (
                      <TableRow key={symbol}>
                        <TableCell className="font-medium">{symbol}</TableCell>
                        <TableCell>
                          {result.success ? (
                            <Chip color="success" variant="flat" startContent={<CheckCircleIcon size={16} />}>
                              成功
                            </Chip>
                          ) : (
                            <Chip color="danger" variant="flat" startContent={<XCircleIcon size={16} />}>
                              失败
                            </Chip>
                          )}
                        </TableCell>
                        <TableCell>{result.bid || '-'}</TableCell>
                        <TableCell>{result.ask || '-'}</TableCell>
                        <TableCell className="text-danger">{result.error || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          )}
          
          {/* 交易所测试指南 */}
          <Accordion>
            <AccordionItem key="1" title="交易所测试说明">
              <div className="space-y-2 text-sm">
                <p>本工具可帮助测试各个交易所API的连通性和交易对可用性。</p>
                <p><strong>使用方法：</strong></p>
                <ul className="list-disc pl-5">
                  <li>选择要测试的交易所</li>
                  <li>选择一个标准交易对或输入自定义交易对</li>
                  <li>点击"测试单个交易对"按钮测试特定交易对</li>
                  <li>点击"测试所有主要交易对"按钮测试预定义的主要交易对</li>
                  <li>测试结果将显示交易对的状态、买卖价格和可能的错误信息</li>
                </ul>
                <p><strong>注意事项：</strong></p>
                <ul className="list-disc pl-5">
                  <li>交易所API可能会有限速，频繁测试可能会导致暂时性错误</li>
                  <li>自定义交易对格式必须为"BASE/QUOTE"，例如"BTC/USDT"</li>
                  <li>部分交易所可能不支持所有交易对，这是正常现象</li>
                </ul>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
  
  // 辅助函数：检查所有测试结果是否都成功
  function isAllSuccessful() {
    return Object.values(testResults).every(result => result.success);
  }
} 