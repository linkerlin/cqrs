#!/bin/bash
echo "启动前端开发服务器..."
cd /Users/linmiao/GitHub/cqrs/frontend
echo "当前目录: $(pwd)"
echo "检查package.json..."
ls -la package.json
echo "启动vite..."
npx vite --host 0.0.0.0 --port 5173 --open
