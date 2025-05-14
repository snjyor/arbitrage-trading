import React from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Tooltip } from "@nextui-org/react";
import { format } from 'date-fns';
import { ExchangePriceData } from '@/services/exchangeService';

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

interface ExchangePriceTableProps {
  priceData: Record<string, Record<string, ExchangePriceData>>;
  selectedSymbol: string;
}

const ExchangePriceTable: React.FC<ExchangePriceTableProps> = ({ priceData, selectedSymbol }) => {
  // 获取选定交易对的价格数据
  const exchangesData = priceData[selectedSymbol] || {};
  const exchanges = Object.keys(exchangesData);

  return (
    <div className="w-full">
      <Table 
        aria-label="交易所价格表格"
        className="mt-4"
        isHeaderSticky
        isStriped
      >
        <TableHeader>
          <TableColumn key="exchange">交易所</TableColumn>
          <TableColumn key="bid">买入价(Bid)</TableColumn>
          <TableColumn key="ask">卖出价(Ask)</TableColumn>
          <TableColumn key="spread">价差</TableColumn>
          <TableColumn key="spreadPercent">价差百分比</TableColumn>
          <TableColumn key="updated">更新时间</TableColumn>
        </TableHeader>
        <TableBody 
          items={exchanges.map(exchange => exchangesData[exchange])}
          emptyContent="未找到价格数据"
        >
          {(item: ExchangePriceData) => (
            <TableRow key={item.exchange}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{EXCHANGE_ICONS[item.exchange] || '🏛️'}</span>
                  <span className="font-medium">{item.exchange}</span>
                </div>
              </TableCell>
              <TableCell>
                <Tooltip content="最佳买入价(Bid)">
                  <span>{item.bid.toFixed(6)}</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip content="最佳卖出价(Ask)">
                  <span>{item.ask.toFixed(6)}</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                {(item.ask - item.bid).toFixed(6)}
              </TableCell>
              <TableCell>
                <Chip 
                  color="primary" 
                  size="sm"
                  variant="flat"
                >
                  {((item.ask - item.bid) / item.bid * 100).toFixed(4)}%
                </Chip>
              </TableCell>
              <TableCell>
                <Tooltip content={new Date(item.timestamp).toLocaleString()}>
                  <span>
                    {format(new Date(item.timestamp), 'HH:mm:ss')}
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ExchangePriceTable; 