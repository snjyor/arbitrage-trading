import React from 'react';
import { Card, CardBody, CardHeader, Chip, Divider } from "@nextui-org/react";
import { ArbitrageOpportunity } from '@/services/exchangeService';

interface ArbitrageStatsCardsProps {
  opportunities: ArbitrageOpportunity[];
}

const ArbitrageStatsCards: React.FC<ArbitrageStatsCardsProps> = ({ opportunities }) => {
  // 计算统计数据
  const totalOpportunities = opportunities.length;
  
  // 计算最大利润率
  const maxProfitPercent = opportunities.length > 0
    ? Math.max(...opportunities.map(o => o.percentageDifference))
    : 0;
  
  // 计算最高利润的交易对
  const highestProfitOpp = opportunities.length > 0
    ? opportunities.reduce((max, current) => 
        current.netProfit > max.netProfit ? current : max, opportunities[0])
    : null;
  
  // 根据交易对分组
  const symbolGroups = opportunities.reduce<Record<string, ArbitrageOpportunity[]>>((acc, opp) => {
    if (!acc[opp.symbol]) {
      acc[opp.symbol] = [];
    }
    acc[opp.symbol].push(opp);
    return acc;
  }, {});
  
  // 计算每个交易对的最大套利机会
  const bestSymbolOpportunities = Object.entries(symbolGroups).map(([symbol, opps]) => {
    const bestOpp = opps.reduce((max, current) => 
      current.netProfit > max.netProfit ? current : max, opps[0]);
    return {
      symbol,
      opportunity: bestOpp,
      count: opps.length
    };
  });
  
  // 按最大利润排序
  bestSymbolOpportunities.sort((a, b) => b.opportunity.netProfit - a.opportunity.netProfit);
  
  // 获取前5个最佳交易对
  const top5Symbols = bestSymbolOpportunities.slice(0, 5);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <Card className="w-full">
        <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
          <h4 className="font-bold text-large">套利机会总览</h4>
          <small className="text-default-500">当前监控到的套利机会</small>
        </CardHeader>
        <CardBody className="py-4">
          <div className="flex gap-2 items-center">
            <Chip size="lg" color="success">{totalOpportunities}</Chip>
            <p className="text-default-700">套利机会</p>
          </div>
          <Divider className="my-3" />
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <p className="text-default-500">最高利润率:</p>
              <p className="font-semibold">{maxProfitPercent.toFixed(4)}%</p>
            </div>
            <div className="flex justify-between">
              <p className="text-default-500">监控交易对:</p>
              <p className="font-semibold">{Object.keys(symbolGroups).length}</p>
            </div>
          </div>
        </CardBody>
      </Card>
      
      <Card className="w-full">
        <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
          <h4 className="font-bold text-large">最佳套利机会</h4>
          <small className="text-default-500">当前利润最高的套利路径</small>
        </CardHeader>
        <CardBody className="py-4">
          {highestProfitOpp ? (
            <>
              <div className="flex flex-col">
                <p className="text-xl font-bold">{highestProfitOpp.symbol}</p>
                <div className="flex items-center mt-1">
                  <p className="text-sm">{highestProfitOpp.buyExchange} → {highestProfitOpp.sellExchange}</p>
                </div>
              </div>
              <Divider className="my-3" />
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <p className="text-default-500">利润率:</p>
                  <p className="font-semibold text-success">{highestProfitOpp.percentageDifference.toFixed(4)}%</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-default-500">净利润:</p>
                  <p className="font-semibold text-success">{highestProfitOpp.netProfit.toFixed(6)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-default-400">暂无套利机会</p>
          )}
        </CardBody>
      </Card>
      
      <Card className="w-full">
        <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
          <h4 className="font-bold text-large">热门套利交易对</h4>
          <small className="text-default-500">套利机会最多的交易对</small>
        </CardHeader>
        <CardBody className="py-4">
          {top5Symbols.length > 0 ? (
            <div className="flex flex-col gap-2">
              {top5Symbols.map((item, index) => (
                <div key={item.symbol} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" color="primary">{index + 1}</Chip>
                    <p className="font-medium">{item.symbol}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <Chip size="sm" color="success" variant="flat">
                      {item.opportunity.percentageDifference.toFixed(2)}%
                    </Chip>
                    <small className="text-default-400">{item.count} 个机会</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-default-400">暂无套利数据</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default ArbitrageStatsCards; 