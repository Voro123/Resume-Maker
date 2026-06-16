# Resume Marker - Python 后端服务

## 简介

这是一个为 Resume Marker 前端项目提供的 Python 后端代理服务，用于解决以下问题：

1. **API Key 安全**：API Key 存储在后端，不会暴露给前端用户
2. **连接超时**：后端可以设置更长的超时时间（默认 120 秒）
3. **浏览器限制**：避免浏览器的 CORS 和安全限制
4. **更稳定的连接**：不受浏览器网络环境限制

## 快速开始

### 1. 安装依赖

```bash
# 建议使用虚拟环境
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 启动后端服务

```bash
# 默认模式（端口 5000）
python server.py

# 调试模式
DEBUG=True python server.py

# 自定义端口
PORT=8080 python server.py
```

### 3. 启动前端

```bash
# 安装前端依赖
npm install

# 启动开发服务器
npm run dev
```

### 4. 同时使用（推荐）

```bash
# 安装 concurrently（如果还没有）
npm install -g concurrently

# 同时启动前端和后端
npm run dev:full
```

## 环境变量配置

### 后端环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 5000 | 后端服务端口 |
| `DEBUG` | False | 是否开启调试模式 |

### 前端环境变量 (.env)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | http://localhost:5000/api | 后端 API 地址 |
| `VITE_USE_BACKEND` | true | 是否使用后端代理 |

## API 接口

### 1. 健康检查

```
GET /api/health
```

### 2. 配置 API

```
POST /api/config
Body: {
  "apiKey": "your-api-key",
  "baseURL": "https://api.minimaxi.com/v1",
  "model": "MiniMax-M3",
  "sessionId": "default"
}
```

### 3. 生成简历

```
POST /api/generate-resume
Body: {
  "sessionId": "default",
  "prompt": "生成一个前端工程师的简历..."
}
```

### 4. 优化简历

```
POST /api/optimize-resume
Body: {
  "sessionId": "default",
  "message": "把颜色改成蓝色",
  "currentHtml": "...",
  "chatHistory": []
}
```

### 5. 生成简历数据

```
POST /api/generate-resume-data
Body: {
  "sessionId": "default",
  "prompt": "...",
  "currentData": {}
}
```

## 注意事项

1. **API Key 存储**：当前使用内存存储，重启服务后需要重新配置
2. **生产环境**：生产环境建议使用数据库存储配置，并添加身份认证
3. **超时设置**：可以在代码中修改 `timeout` 参数来调整超时时间
4. **CORS**：当前允许所有来源访问，生产环境应配置具体的允许来源

## 故障排查

### 后端无法启动

- 检查 Python 版本（需要 3.8+）
- 检查依赖是否安装完整
- 检查端口是否被占用

### 前端无法连接后端

- 检查后端是否正常运行
- 检查 `.env` 中的 `VITE_API_BASE_URL` 是否正确
- 检查是否有防火墙/代理拦截

### 生成超时

- 检查 API Key 是否正确
- 检查网络连接是否正常
- 尝试增加超时时间（修改 `server.py` 中的 `timeout` 参数）
