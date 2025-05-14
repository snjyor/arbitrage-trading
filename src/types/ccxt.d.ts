declare module 'ccxt' {
  export interface ExchangeOptions {
    apiKey?: string;
    secret?: string;
    password?: string;
    enableRateLimit?: boolean;
    timeout?: number;
    [key: string]: any;
  }

  export interface Exchange {
    id: string;
    name: string;
    has: Record<string, any>;
    rateLimit?: number;
    countries: string[];
    urls: Record<string, any>;
    apiKey?: string;
    secret?: string;
    password?: string;
    enableRateLimit?: boolean;
    timeout?: number;
    fetchOrderBook(symbol: string, limit?: number, params?: any): Promise<OrderBook>;
    fetchTicker(symbol: string, params?: any): Promise<Ticker>;
    fetchTickers(symbols?: string[], params?: any): Promise<Record<string, Ticker>>;
    fetchOHLCV(symbol: string, timeframe?: string, since?: number, limit?: number, params?: any): Promise<OHLCV[]>;
    [key: string]: any;
  }

  export interface OrderBook {
    bids: [number, number][];
    asks: [number, number][];
    timestamp?: number;
    datetime?: string;
    nonce?: number;
  }

  export interface Ticker {
    symbol: string;
    timestamp: number;
    datetime: string;
    high: number;
    low: number;
    bid: number;
    bidVolume?: number;
    ask: number;
    askVolume?: number;
    vwap?: number;
    open?: number;
    close?: number;
    last?: number;
    previousClose?: number;
    change?: number;
    percentage?: number;
    average?: number;
    baseVolume?: number;
    quoteVolume?: number;
    [key: string]: any;
  }

  export type OHLCV = [number, number, number, number, number, number];

  // 所有交易所类的导出
  export const binance: new (options?: ExchangeOptions) => Exchange;
  export const bitfinex: new (options?: ExchangeOptions) => Exchange;
  export const bitget: new (options?: ExchangeOptions) => Exchange;
  export const bybit: new (options?: ExchangeOptions) => Exchange;
  export const coinbase: new (options?: ExchangeOptions) => Exchange;
  export const gate: new (options?: ExchangeOptions) => Exchange;
  export const kraken: new (options?: ExchangeOptions) => Exchange;
  export const okx: new (options?: ExchangeOptions) => Exchange;
  
  // 索引签名允许通过字符串索引访问所有交易所类
  export interface CCXTConstructors {
    [key: string]: new (options?: ExchangeOptions) => Exchange;
  }
} 