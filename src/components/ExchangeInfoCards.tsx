import React from 'react';
import { Card, CardBody, CardHeader, CardFooter, Divider, Chip } from "@nextui-org/react";
import { SUPPORTED_EXCHANGES } from '@/services/exchangeService';

// 交易所信息类型
type ExchangeInfo = {
  name: string;
  description: string;
  pairsCount: number;
  foundedYear: number;
  headquarters: string;
};

// 模拟交易所数据
const exchangesData: Record<string, ExchangeInfo> = {
  'binance': {
    name: 'Binance',
    description: '全球领先的加密货币交易所，提供广泛的交易对和高流动性',
    pairsCount: 400,
    foundedYear: 2017,
    headquarters: '开曼群岛',
  },
  'bitfinex': {
    name: 'Bitfinex',
    description: '成立较早的主要交易所，以机构投资者为主要客户群体',
    pairsCount: 180,
    foundedYear: 2012,
    headquarters: '香港',
  },
  'bitget': {
    name: 'BitGet',
    description: '提供现货和衍生品交易的快速增长的交易所',
    pairsCount: 270,
    foundedYear: 2018,
    headquarters: '新加坡',
  },
  'bybit': {
    name: 'Bybit',
    description: '专注于加密货币衍生品交易的平台，提供杠杆交易',
    pairsCount: 320,
    foundedYear: 2018,
    headquarters: '新加坡',
  },
  'coinbase': {
    name: 'Coinbase',
    description: '美国最大的受监管加密货币交易所，以安全性着称',
    pairsCount: 240,
    foundedYear: 2012,
    headquarters: '美国',
  },
  'gate': {
    name: 'Gate.io',
    description: '提供多种加密资产交易的综合平台',
    pairsCount: 380,
    foundedYear: 2013,
    headquarters: '开曼群岛',
  },
  'kraken': {
    name: 'Kraken',
    description: '老牌交易所，拥有强大的安全性和法币支持',
    pairsCount: 200,
    foundedYear: 2011,
    headquarters: '美国',
  },
  'okx': {
    name: 'OKX',
    description: '提供现货、期货和永续合约交易的综合性平台',
    pairsCount: 350,
    foundedYear: 2017,
    headquarters: '塞舌尔',
  }
};

export default function ExchangeInfoCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {SUPPORTED_EXCHANGES.map((exchangeId) => {
        const exchangeInfo = exchangesData[exchangeId];
        
        if (!exchangeInfo) return null;
        
        return (
          <Card key={exchangeId} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex-col items-start gap-2">
              <h3 className="text-xl font-bold">{exchangeInfo.name}</h3>
              <Chip size="sm" color="primary" variant="flat">成立于 {exchangeInfo.foundedYear}</Chip>
            </CardHeader>
            <Divider />
            <CardBody>
              <p className="text-sm mb-3">{exchangeInfo.description}</p>
              
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-default-500">交易对数量:</span>
                  <span className="font-medium">{exchangeInfo.pairsCount}+</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-default-500">总部:</span>
                  <span className="font-medium">{exchangeInfo.headquarters}</span>
                </div>
              </div>
            </CardBody>
            <CardFooter className="bg-default-50 pt-3 pb-3">
              <span className="text-xs text-default-400 w-full text-center">数据更新日期: 2024年3月</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
} 