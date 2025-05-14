/**
 * OKX API 工具函数
 * API文档: https://www.okx.com/docs-v5/zh/
 */

// OKX API基础URL
export const OKX_API_BASE_URL = 'https://www.okx.com';

// 获取价格接口
export async function getOkxPrice(symbol: string) {
  try {
    const response = await fetch(`${OKX_API_BASE_URL}/api/v5/market/ticker?instId=${symbol}`);
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取OKX价格失败:', error);
    throw error;
  }
}

// 获取K线数据
export async function getOkxKlines(symbol: string, bar: string, limit = 100) {
  try {
    const response = await fetch(
      `${OKX_API_BASE_URL}/api/v5/market/candles?instId=${symbol}&bar=${bar}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取OKX K线数据失败:', error);
    throw error;
  }
}

// 获取深度数据
export async function getOkxOrderbook(symbol: string, sz = 50) {
  try {
    const response = await fetch(
      `${OKX_API_BASE_URL}/api/v5/market/books?instId=${symbol}&sz=${sz}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取OKX订单簿数据失败:', error);
    throw error;
  }
} 