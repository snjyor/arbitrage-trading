/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 启用独立输出模式，便于Docker部署
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig 