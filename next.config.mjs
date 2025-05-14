/** @type {import('next').NextConfig} */
const nextConfig = {
  // 客户端使用
  transpilePackages: [],
  // 服务器端使用
  serverExternalPackages: ['ccxt'],
  reactStrictMode: true,
};

export default nextConfig; 