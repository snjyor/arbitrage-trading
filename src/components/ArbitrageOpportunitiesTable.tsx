import React, { useEffect, useState } from 'react';
import { 
  Table, 
  TableHeader, 
  TableColumn, 
  TableBody, 
  TableRow, 
  TableCell, 
  Chip, 
  Tooltip,
  Card,
  CardBody,
  CardHeader,
  Divider
} from "@nextui-org/react";
import { format } from 'date-fns';
import { ArbitrageOpportunity } from '@/services/exchangeService';

// 交易所图标映射
const EXCHANGE_ICONS: Record<string, string> = {
  'binance': '🟡',
  'bitfinex': '🟢',
  'bitget': '🔵',
  'bybit': '🟣',
  'coinbase': '🔷',
  'gate': '🟤',
  'kraken': '⚫',
  'okx': '🟠',
};

interface ArbitrageOpportunitiesTableProps {
  opportunities: ArbitrageOpportunity[];
  selectedSymbol?: string;
}

const ArbitrageOpportunitiesTable: React.FC<ArbitrageOpportunitiesTableProps> = ({ 
  opportunities, 
  selectedSymbol 
}) => {
  const [currentOpportunities, setCurrentOpportunities] = useState<ArbitrageOpportunity[]>([]);
  
  // 当机会列表变化时更新状态
  useEffect(() => {
    // 如果有选定的交易对，则只显示该交易对的套利机会
    const filteredOpportunities = selectedSymbol 
      ? opportunities.filter(opp => opp.symbol === selectedSymbol)
      : opportunities;
    
    // 更新当前显示的机会
    setCurrentOpportunities(filteredOpportunities);
  }, [opportunities, selectedSymbol]);

  const renderCell = (opportunity: ArbitrageOpportunity, columnKey: React.Key) => {
    switch (columnKey) {
      case "symbol":
        return <div className="font-medium">{opportunity.symbol}</div>;
      
      case "route":
        return (
          <div className="flex items-center gap-1">
            <Tooltip content={`从 ${opportunity.buyExchange} 购买`}>
              <div className="flex items-center">
                <span>{EXCHANGE_ICONS[opportunity.buyExchange] || '🏛️'}</span>
                <span className="ml-1">{opportunity.buyExchange}</span>
              </div>
            </Tooltip>
            <span>→</span>
            <Tooltip content={`在 ${opportunity.sellExchange} 卖出`}>
              <div className="flex items-center">
                <span>{EXCHANGE_ICONS[opportunity.sellExchange] || '🏛️'}</span>
                <span className="ml-1">{opportunity.sellExchange}</span>
              </div>
            </Tooltip>
          </div>
        );
      
      case "prices":
        return (
          <div className="flex flex-col">
            <span className="text-sm text-default-500">买: {opportunity.buyPrice.toFixed(6)}</span>
            <span className="text-sm text-default-500">卖: {opportunity.sellPrice.toFixed(6)}</span>
          </div>
        );
      
      case "difference":
        return (
          <div className="flex flex-col">
            <span>{opportunity.absoluteDifference.toFixed(6)}</span>
            <Chip 
              color={opportunity.percentageDifference > 0.5 ? "success" : "primary"} 
              size="sm"
              variant="flat"
            >
              {opportunity.percentageDifference.toFixed(4)}%
            </Chip>
          </div>
        );
      
      case "profit":
        return (
          <Chip 
            color="success" 
            variant="dot"
          >
            {opportunity.estimatedProfit.toFixed(6)}
          </Chip>
        );
      
      case "status":
        return (
          <Chip 
            color={opportunity.status === 'active' ? "success" : opportunity.status === 'completed' ? "primary" : "danger"}
            variant="flat"
          >
            {opportunity.status}
          </Chip>
        );
      
      case "updated":
        return (
          <Tooltip content={new Date(opportunity.timestamp).toLocaleString()}>
            <span>{format(new Date(opportunity.timestamp), 'HH:mm:ss')}</span>
          </Tooltip>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">套利机会</h2>
          <p className="text-xs text-default-500">从各大交易所实时数据</p>
        </div>
        <div className="flex flex-col items-end">
          <Chip color="success" variant="flat">
            发现 {currentOpportunities.length} 个机会
          </Chip>
          <span className="text-xs text-default-500 mt-1">实时交易所数据</span>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <Table 
          aria-label="套利机会表格"
          isHeaderSticky
          isStriped
        >
          <TableHeader>
            <TableColumn key="symbol">交易对</TableColumn>
            <TableColumn key="route">交易路径</TableColumn>
            <TableColumn key="prices">买入/卖出价</TableColumn>
            <TableColumn key="difference">价差</TableColumn>
            <TableColumn key="profit">预估利润</TableColumn>
            <TableColumn key="status">状态</TableColumn>
            <TableColumn key="updated">更新时间</TableColumn>
          </TableHeader>
          <TableBody 
            items={currentOpportunities}
            emptyContent="未发现套利机会"
          >
            {(opportunity) => (
              <TableRow key={`${opportunity.buyExchange}-${opportunity.sellExchange}-${opportunity.symbol}-${opportunity.timestamp}`}>
                {(columnKey) => (
                  <TableCell>{renderCell(opportunity, columnKey)}</TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};

export default ArbitrageOpportunitiesTable; 