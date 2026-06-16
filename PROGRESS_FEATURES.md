# 错误日志和实时进度显示功能说明

## 修改日期
2026-06-15

## 功能概述
本次修改为项目添加了两个重要功能：
1. **后端日志输出到文件** - 方便开发者查看后端运行情况
2. **前端实时显示AI处理进度** - 让用户清楚知道AI正在做什么

---

## 1. 后端日志输出到文件

### 修改文件
- `server.py`

### 功能说明
- 日志会自动保存到 `logs/` 目录下的日期文件（如 `logs/server_20260615.log`）
- 日志级别：
  - **控制台**：显示 INFO 及以上级别（默认）
  - **文件**：显示 DEBUG 及以上级别（更详细）

### 日志内容包含
- 时间戳、模块名、日志级别
- 文件名和行号（文件日志）
- 详细的错误信息（异常类型、状态码、响应内容等）

### 查看日志
```bash
# 实时查看日志
tail -f logs/server_*.log

# 或者直接用文本编辑器打开 logs/ 目录下的日志文件
```

---

## 2. 前端实时显示AI处理进度

### 修改文件
- `src/utils/backend-api.ts` - 添加 SSE（Server-Sent Events）支持
- `src/stores/resume.ts` - 添加进度状态管理
- `src/components/ResumePreview.vue` - 添加进度显示UI
- `src/components/ChatPanel.vue` - 优化对话调用

### 功能说明
现在当用户点击"生成简历"或"优化简历"时，会看到：

1. **步骤 1/3**：正在准备生成简历...
2. **步骤 2/3**：正在调用 AI 生成简历...（这可能需要 30-120 秒）
3. **步骤 3/3**：正在解析生成结果...

每个步骤都有详细的状态说明和进度条显示。

### SSE 接口说明
后端 API 现在返回 SSE 流，事件格式：
```json
// 进度事件
{
  "type": "progress",
  "step": 1,
  "totalSteps": 3,
  "status": "正在准备生成简历...",
  "detail": "使用模型: MiniMax-M3"
}

// 完成事件
{
  "type": "complete",
  "success": true,
  "html": "...",
  "reasoning": "...",
  "elapsedTime": 45.2
}

// 错误事件
{
  "type": "error",
  "error": "错误信息",
  "errorType": "APIError"
}
```

---

## 3. 调试建议

### 如果生成简历很慢，可以：

1. **查看后端日志**：
   ```
   logs/server_YYYYMMDD.log
   ```
   搜索关键词：`正在调用 OpenAI API`、`API 调用成功`、`失败`

2. **检查网络连接**：
   - 确保能访问配置的 baseURL（如 `https://api.minimaxi.com/v1`）
   - 检查 API Key 是否正确

3. **查看前端控制台**：
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签中的请求状态
   - 查看 Console 标签中的错误日志

4. **模型响应时间**：
   - MiniMax-M3 等大模型生成简历可能需要 30-120 秒
   - 这是正常的，取决于模型、提示词长度、网络速度等

---

## 4. 启动项目

```bash
# 安装依赖（如果还没安装）
npm install
pip install -r requirements.txt

# 启动后端（带日志）
python server.py

# 另开一个终端，启动前端
npm run dev:front
```

---

## 5. 日志文件位置

```
resume-marker/
  ├── logs/
  │   └── server_20260615.log  # 日期命名的日志文件
  ├── server.py
  └── src/
      └── ...
```

---

## 6. 故障排查

### 问题：看不到进度显示
- 确保后端正在运行（访问 http://localhost:5000/api/health）
- 确保前端连接的是后端模式（检查 `VITE_USE_BACKEND` 环境变量）

### 问题：生成简历超时
- 检查 `server.py` 中的 `timeout=120.0` 设置
- 可以尝试增加超时时间

### 问题：日志文件没有生成
- 确保 `logs/` 目录有写入权限
- 检查 `server.py` 中的 `log_dir` 路径
