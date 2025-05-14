"use client";

import { useState, useEffect } from 'react';
import { getOkxPrice, getOkxKlines, getOkxOrderbook } from '@/lib/okx-api';

export default function OkxPriceTest() {
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [priceData, setPriceData] = useState<any>(null);
  const [klinesData, setKlinesData] = useState<any>(null);
  const [orderbookData, setOrderbookData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAllData() {
    setLoading(true);
    setError(null);
    
    try {
      const [price, klines, orderbook] = await Promise.all([
        getOkxPrice(symbol),
        getOkxKlines(symbol, '15m', 10),
        getOkxOrderbook(symbol)
      ]);
      
      setPriceData(price);
      setKlinesData(klines);
      setOrderbookData(orderbook);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
    
    // 设置定时器每30秒更新一次数据
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAllData();
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              交易对
            </label>
            <input
              type="text"
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="例如: BTC-USDT"
            />
          </div>
          <div className="self-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm disabled:opacity-50 transition-colors"
            >
              {loading ? '加载中...' : '获取数据'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md text-red-700 dark:text-red-400">
          <p className="font-medium">错误:</p>
          <p>{error}</p>
        </div>
      )}

      {priceData && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">价格信息</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(priceData, null, 2)}
          </pre>
        </div>
      )}

      {klinesData && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">K线数据 (15分钟)</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(klinesData, null, 2)}
          </pre>
        </div>
      )}

      {orderbookData && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">订单簿数据</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(orderbookData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 