import OkxPriceTest from '@/components/OkxPriceTest';

export const metadata = {
  title: 'OKX API 测试',
  description: '测试OKX API连接和数据获取',
};

export default function OkxTestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">OKX API 测试</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        本页面用于测试OKX API的连接和数据获取功能。您可以输入不同的交易对来获取价格、K线和订单簿数据。
      </p>
      <OkxPriceTest />
    </div>
  );
} 