#!/bin/bash

# 部署脚本 - 用于GitFlow自动部署

# 记录开始时间
echo "==== 开始部署 $(date) ===="

# 前往项目目录
cd /root/arbitrage-trading

# 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 构建并启动Docker容器
echo "重新构建并启动Docker容器..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 检查容器是否正常启动
echo "检查容器状态..."
sleep 5
docker ps | grep arbitrage-trading

# 完成部署
echo "==== 部署完成 $(date) ====" 