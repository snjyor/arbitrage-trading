import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Input, Button, Select, SelectItem, Divider, Spacer, Tabs, Tab } from "@nextui-org/react";
import { SUPPORTED_EXCHANGES } from '@/services/exchangeService';

export default function ProfitCalculator() {
  // 基本参数
  const [buyExchange, setBuyExchange] = useState<string>('binance');
  const [sellExchange, setSellExchange] = useState<string>('bybit');
  const [buyPrice, setBuyPrice] = useState<string>('1000');
  const [sellPrice, setSellPrice] = useState<string>('1010');
  const [tradingAmount, setTradingAmount] = useState<string>('1');
  
  // 高级参数
  const [slippageBuy, setSlippageBuy] = useState<string>('0.05');
  const [slippageSell, setSlippageSell] = useState<string>('0.05');
  const [networkFeeBuy, setNetworkFeeBuy] = useState<string>('0');
  const [networkFeeSell, setNetworkFeeSell] = useState<string>('0');
  const [gasFee, setGasFee] = useState<string>('0');
  const [tradingMode, setTradingMode] = useState<string>('spot');
  
  // 计算结果
  const [calculationResults, setCalculationResults] = useState({
    grossProfit: 0,
    grossProfitPercentage: 0,
    networkFees: 0,
    netProfit: 0,
    netProfitPercentage: 0,
    profitableTrade: false
  });
  
  // 处理计算
  const calculateProfit = () => {
    // 转换输入值为数字
    const buyPriceValue = parseFloat(buyPrice);
    const sellPriceValue = parseFloat(sellPrice);
    const amountValue = parseFloat(tradingAmount);
    const slippageBuyValue = parseFloat(slippageBuy) / 100;
    const slippageSellValue = parseFloat(slippageSell) / 100;
    const networkFeeBuyValue = parseFloat(networkFeeBuy);
    const networkFeeSellValue = parseFloat(networkFeeSell);
    const gasFeesValue = parseFloat(gasFee);
    
    // 考虑滑点的价格
    const adjustedBuyPrice = buyPriceValue * (1 + slippageBuyValue);
    const adjustedSellPrice = sellPriceValue * (1 - slippageSellValue);
    
    // 计算毛利润
    const buyTotal = adjustedBuyPrice * amountValue;
    const sellTotal = adjustedSellPrice * amountValue;
    const grossProfit = sellTotal - buyTotal;
    const grossProfitPercentage = (grossProfit / buyTotal) * 100;
    
    // 计算总网络费用
    const networkFees = networkFeeBuyValue + networkFeeSellValue + gasFeesValue;
    
    // 计算净利润
    const netProfit = grossProfit - networkFees;
    const netProfitPercentage = (netProfit / buyTotal) * 100;
    
    setCalculationResults({
      grossProfit,
      grossProfitPercentage,
      networkFees,
      netProfit,
      netProfitPercentage,
      profitableTrade: netProfit > 0
    });
  };
  
  // 价格差异变化时自动计算
  useEffect(() => {
    if (buyPrice && sellPrice && tradingAmount) {
      calculateProfit();
    }
  }, [buyPrice, sellPrice, tradingAmount, buyExchange, sellExchange]);
  
  return (
    <Card className="shadow-md">
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-xl font-bold">套利利润计算器</p>
          <p className="text-small text-default-500">
            计算跨交易所套利交易的潜在收益和费用
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <Tabs aria-label="交易参数选项">
          <Tab key="basic" title="基本参数">
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="买入交易所"
                  value={buyExchange}
                  onChange={(e) => setBuyExchange(e.target.value)}
                  className="mb-4"
                >
                  {SUPPORTED_EXCHANGES.map((exchange) => (
                    <SelectItem key={exchange} value={exchange}>
                      {exchange}
                    </SelectItem>
                  ))}
                </Select>
                
                <Input
                  type="number"
                  label="买入价格"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  endContent={<div className="text-small text-default-400">USDT</div>}
                  className="mb-4"
                />
              </div>
              
              <div>
                <Select
                  label="卖出交易所"
                  value={sellExchange}
                  onChange={(e) => setSellExchange(e.target.value)}
                  className="mb-4"
                >
                  {SUPPORTED_EXCHANGES.map((exchange) => (
                    <SelectItem key={exchange} value={exchange}>
                      {exchange}
                    </SelectItem>
                  ))}
                </Select>
                
                <Input
                  type="number"
                  label="卖出价格"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  endContent={<div className="text-small text-default-400">USDT</div>}
                  className="mb-4"
                />
              </div>
              
              <div className="md:col-span-2">
                <Input
                  type="number"
                  label="交易数量"
                  value={tradingAmount}
                  onChange={(e) => setTradingAmount(e.target.value)}
                  className="mb-4"
                />
              </div>
            </div>
          </Tab>
          
          <Tab key="advanced" title="高级参数">
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="交易模式"
                  value={tradingMode}
                  onChange={(e) => setTradingMode(e.target.value)}
                  className="mb-4"
                >
                  <SelectItem key="spot" value="spot">现货交易</SelectItem>
                  <SelectItem key="futures" value="futures">合约交易</SelectItem>
                  <SelectItem key="triangle" value="triangle">三角套利</SelectItem>
                </Select>
                
                <Input
                  type="number"
                  label="买入滑点 (%)"
                  value={slippageBuy}
                  onChange={(e) => setSlippageBuy(e.target.value)}
                  endContent={<div className="text-small text-default-400">%</div>}
                  className="mb-4"
                />
                
                <Input
                  type="number"
                  label="买入网络费用"
                  value={networkFeeBuy}
                  onChange={(e) => setNetworkFeeBuy(e.target.value)}
                  endContent={<div className="text-small text-default-400">USDT</div>}
                  className="mb-4"
                />
              </div>
              
              <div>
                <Input
                  type="number"
                  label="燃气费用 (链上交易)"
                  value={gasFee}
                  onChange={(e) => setGasFee(e.target.value)}
                  endContent={<div className="text-small text-default-400">USDT</div>}
                  className="mb-4"
                />
                
                <Input
                  type="number"
                  label="卖出滑点 (%)"
                  value={slippageSell}
                  onChange={(e) => setSlippageSell(e.target.value)}
                  endContent={<div className="text-small text-default-400">%</div>}
                  className="mb-4"
                />
                
                <Input
                  type="number"
                  label="卖出网络费用"
                  value={networkFeeSell}
                  onChange={(e) => setNetworkFeeSell(e.target.value)}
                  endContent={<div className="text-small text-default-400">USDT</div>}
                  className="mb-4"
                />
              </div>
            </div>
          </Tab>
        </Tabs>
        
        <Spacer y={2} />
        <Button color="primary" onClick={calculateProfit} className="w-full">
          计算利润
        </Button>
        <Spacer y={2} />
        
        <Divider className="my-4" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-default-500">毛利润:</span>
              <span className="font-semibold">
                {calculationResults.grossProfit.toFixed(4)} USDT 
                ({calculationResults.grossProfitPercentage.toFixed(4)}%)
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-default-500">网络费用:</span>
              <span className="font-semibold">
                {calculationResults.networkFees.toFixed(4)} USDT
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-default-500">净利润:</span>
              <span className={`font-semibold ${calculationResults.netProfit > 0 ? 'text-success' : 'text-danger'}`}>
                {calculationResults.netProfit.toFixed(4)} USDT 
                ({calculationResults.netProfitPercentage.toFixed(4)}%)
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-default-500">交易结果:</span>
              <span className={`font-semibold ${calculationResults.profitableTrade ? 'text-success' : 'text-danger'}`}>
                {calculationResults.profitableTrade ? '盈利' : '亏损'}
              </span>
            </div>
          </div>
        </div>
        
        {/* 利润分析 */}
        <Spacer y={2} />
        <div className="p-4 bg-default-50 rounded-md">
          <p className="text-sm text-default-500">
            {calculationResults.profitableTrade 
              ? `以上述参数进行套利交易是有利可图的，预计净利润率为 ${calculationResults.netProfitPercentage.toFixed(4)}%。`
              : `以上述参数进行套利交易是亏损的，在考虑所有费用后净亏损率为 ${Math.abs(calculationResults.netProfitPercentage).toFixed(4)}%。`
            }
          </p>
        </div>
      </CardBody>
    </Card>
  );
} 