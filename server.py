#!/usr/bin/env python3
"""
Resume Marker - Python Backend Server
提供 OpenAI API 代理服务，解决浏览器环境限制和连接超时问题
"""

import os
import json
import logging
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from openai import OpenAI

# 创建 logs 目录
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

# 配置日志 - 同时输出到控制台和文件
log_file = os.path.join(log_dir, f'server_{datetime.now().strftime("%Y%m%d")}.log')

# 创建根日志记录器
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # 设置为 DEBUG 级别以捕获所有日志

# 避免重复添加处理器
if not logger.handlers:
    # 控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)
    
    # 文件处理器 - 记录所有日志
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)  # 文件中记录 DEBUG 及以上级别
    file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s')
    file_handler.setFormatter(file_format)
    logger.addHandler(file_handler)

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 存储客户端配置的字典（简单的内存存储，生产环境应使用数据库）
clients: Dict[str, OpenAI] = {}
configs: Dict[str, Dict[str, Any]] = {}


def get_client(session_id: str = "default") -> Optional[OpenAI]:
    """获取或创建 OpenAI 客户端"""
    return clients.get(session_id)


def set_client(session_id: str, api_key: str, base_url: str, model: str):
    """设置 OpenAI 客户端"""
    client = OpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=120.0,  # 设置更长的超时时间
        max_retries=3
    )
    clients[session_id] = client
    configs[session_id] = {
        "api_key": api_key,
        "base_url": base_url,
        "model": model
    }
    logger.info(f"客户端已配置: {session_id}, base_url: {base_url}, model: {model}")


def generate_sse_event(data: dict) -> str:
    """生成 SSE 事件格式的数据"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({"status": "ok", "message": "Resume Marker Backend is running"})


@app.route('/api/config', methods=['POST'])
def configure():
    """配置 API 密钥和参数"""
    try:
        data = request.get_json()
        api_key = data.get('apiKey')
        base_url = data.get('baseURL', 'https://api.minimaxi.com/v1')
        model = data.get('model', 'MiniMax-M3')
        session_id = data.get('sessionId', 'default')
        
        if not api_key:
            return jsonify({"error": "API Key 不能为空"}), 400
        
        set_client(session_id, api_key, base_url, model)
        
        return jsonify({
            "success": True,
            "message": "配置成功",
            "config": {
                "baseURL": base_url,
                "model": model
            }
        })
    except Exception as e:
        logger.error(f"配置失败: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-resume', methods=['POST'])
def generate_resume():
    """生成简历 - 使用 SSE 实时返回进度"""
    
    def generate():
        """生成器函数，用于 SSE 流式返回"""
        try:
            data = request.get_json()
            session_id = data.get('sessionId', 'default')
            user_prompt = data.get('prompt', '')
            
            if not user_prompt:
                yield generate_sse_event({"type": "error", "error": "提示词不能为空"})
                return
            
            client = get_client(session_id)
            if not client:
                yield generate_sse_event({"type": "error", "error": "请先配置 API"})
                return
            
            config = configs.get(session_id, {})
            model = config.get('model', 'MiniMax-M3')
            
            # 步骤1: 准备数据
            logger.info(f"开始生成简历, session: {session_id}, model: {model}")
            logger.debug(f"生成简历提示词长度: {len(user_prompt)} 字符")
            yield generate_sse_event({
                "type": "progress",
                "step": 1,
                "totalSteps": 3,
                "status": "📝 准备生成简历",
                "detail": f"已配置模型: {model}"
            })
            
            start_time = time.time()
            
            # 步骤2: 调用 AI API
            yield generate_sse_event({
                "type": "progress",
                "step": 2,
                "totalSteps": 3,
                "status": "🤖 AI 正在生成简历内容",
                "detail": "正在调用大模型，预计需要 30-120 秒..."
            })
            
            logger.info(f"正在调用 OpenAI API 生成简历 (流式模式)...")
            
            # 步骤2.5: 开始流式输出AI思考过程
            yield generate_sse_event({
                "type": "progress",
                "step": 2,
                "totalSteps": 3,
                "status": "🧠 AI 正在思考...",
                "detail": "正在分析您的需求并规划简历结构（将生成两页简历）..."
            })
            
            # 使用流式API调用
            stream = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": """你是一个世界顶级的简历设计师和前端开发专家。直接生成一份完整的、带伪数据的简历HTML代码，不需要询问用户信息。

## ⚠️ 输出要求（极其重要）：
- **直接输出完整的HTML代码**，从<!DOCTYPE html>开始到</html>结束
- **不要输出任何Markdown格式符号**（如**、##、---等）
- **不要输出任何解释文字**、注释、或多余内容
- **第一个字符必须是 <!DOCTYPE html>**，最后一个字符必须是 </html>

## 🎨 设计要求（请发挥极致创意）：

### 1) 布局设计（自由选择最佳布局）：
你可以根据内容特点选择以下任何一种布局，或创造你自己的布局：

**选项A：单栏布局**
- 经典从上到下的单栏设计
- 适合内容较少或偏好简洁的用户

**选项B：两栏布局（推荐用于内容较多的简历）**
- 左侧边栏（宽度约30-35%）+ 主内容区（宽度约65-70%）
- 左侧可放置：个人信息、联系方式、技能标签、语言能力
- 右侧可放置：工作经历、项目经验、教育背景
- 使用 CSS Grid 或 Flexbox 实现：`display: grid; grid-template-columns: 250px 1fr;`
- **重要**：如果内容超过一页，第二页应该恢复为单栏布局，或者两栏继续但要确保内容不会被不合理地分割

**选项C：创意布局**
- 顶部大标题区 + 下方双栏
- 左侧彩色背景区 + 右侧白色区
- 或者任何你认为最美观的设计

### 2) 视觉设计原则：
- **配色方案**：使用专业、现代的配色（深蓝+白、深灰+浅灰、墨绿+米色、或渐变）
- **字体排版**：使用 Google Fonts（Inter, Roboto, Noto Sans SC等），清晰的视觉层次
- **图标使用**：使用 Font Awesome 图标增强视觉效果（fa-user, fa-envelope, fa-phone 等）
- **细节优化**：
  * 标题使用左侧竖线装饰或底部渐变下划线
  * 添加微妙的阴影和圆角
  * 使用标签（tag）或进度条展示技能
  * 时间线样式展示工作经历/教育背景

### 3) 内容要求：
- 使用合理的伪数据（中文姓名如"张三"、"李思"，公司如"腾讯"、"字节跳动"、"阿里巴巴"等）
- **模块化结构**：每个大模块用 `<section data-section="xxx" class="resume-section">` 包裹
- 模块顺序：个人信息 → 教育背景 → 工作经历 → 项目经验 → 专业技能 → 自我评价

### 4) 技术规范（⚠️ 打印尺寸极其重要）：

**A4尺寸规范（96 DPI）：**
- A4分辨率：794 × 1123 像素
- 内容区域：宽度 794px，高度自适应
- **注意**：不要设置固定 padding，让内容直接在容器内编辑，打印边距由外层控制

**CSS要求：**
```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Inter', 'Noto Sans SC', sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}

.resume-container {
    width: 794px;
    background: white;
    box-sizing: border-box;
    /* 不要设置固定padding，让内容自然延伸 */
    /* 内容内部可以使用margin来调整间距 */
}

/* 两栏布局示例 */
.resume-container.two-column {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 30px;
}

.resume-section {
    margin-bottom: 20px;
    page-break-inside: avoid; /* 避免模块内部分页 */
}

/* 分页控制 */
.page-break {
    page-break-before: always;
    break-before: page;
}
```

**⚠️ 强制要求：**
- 所有内容必须放在 `.resume-container` 内部
- 每个模块必须用 `<section data-section="xxx" class="resume-section">` 包裹
- 元素宽度不能超过 680px（单栏）或相应栏宽（双栏）
- 必须包含打印样式 `@media print`
- **不要手动插入分页符**，让前端根据高度自动分页

**打印样式（必须包含）：**
```css
@page { size: A4; margin: 15mm; }

@media print {
    body { margin: 0; padding: 0; }
    .resume-container {
        width: 100% !important;
        padding: 0 !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
    }
    .resume-section {
        page-break-inside: avoid !important;
    }
}
```

**注意**：
- `@page { margin: 15mm; }` 由浏览器控制打印边距
- `.resume-container` 不要设置固定 padding，打印时宽度设为100%适应页面

### 5) 两栏布局的第二页处理：
如果内容超过一页，请注意：
- **方案1（推荐）**：第一页使用两栏，从第二页开始改为单栏布局
- **方案2**：所有页面保持两栏，但要确保内容不会被分割得太碎
- 在HTML中可以通过 `<div class="page-break"></div>` 标记分页位置（可选，前端会重新计算）

### 6) 内容间距规范：
- 使用 `margin` 和 `padding` 在内容内部创建适当的间距
- 模块之间使用 `margin-bottom: 20px` 或类似值
- 标题与内容之间使用 `margin-bottom: 10px`
- 不要让内容紧贴容器边缘，保持视觉舒适度
- 可以在 `.resume-container` 内部第一个元素前添加 `padding-top`，最后一个元素后添加 `padding-bottom`

## ✏️ 可编辑功能（重要）：
为了让用户能够直接点击编辑简历内容，请为所有文本内容添加 `contenteditable="true"` 属性：

### 需要添加 contenteditable="true" 的元素：
- 标题元素：h1, h2, h3, h4, h5, h6
- 段落：p
- 列表项：li
- 表格单元格：td, th
- span 或其他包含文本的容器元素

### 不要添加 contenteditable 的元素：
- 图标元素（i, svg等）
- 纯粹的布局容器（如只有图标+文本的整个div，只让文本可编辑）

### 编辑体验优化CSS（必须添加到 `<style>` 中）：
```css
/* 可编辑元素样式 */
[contenteditable="true"] {
    outline: none;
    transition: all 0.2s ease;
    border-radius: 2px;
    padding: 1px 2px;
    margin: -1px -2px;
}

[contenteditable="true"]:hover {
    background-color: rgba(59, 130, 246, 0.08);
    cursor: text;
}

[contenteditable="true"]:focus {
    background-color: rgba(59, 130, 246, 0.12);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

/* 打印时移除编辑样式 */
@media print {
    [contenteditable="true"]:hover,
    [contenteditable="true"]:focus {
        background-color: transparent !important;
        box-shadow: none !important;
    }
}
```

### 注意事项：
- 确保所有可见的文本内容都可以被用户点击编辑
- 编辑提示应该 subtle 而不突兀
- 用户编辑后内容应保持原有的格式和样式

## 🚀 发挥创意：
请生成一份让人眼前一亮的专业简历！你可以：
- 使用渐变背景、卡片式设计、时间线布局等现代设计元素
- 根据伪数据的特点选择最合适的布局方式
- 确保设计既美观又实用，适合打印和PDF导出

## 外部依赖（必须引入）：
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
```

现在，请生成一份令人惊艳的简历HTML代码！"""                    },
                    {
                        "role": "user",
                        "content": user_prompt if user_prompt else "请生成一份完整的简历，使用合理的伪数据填充。"
                    }
                ],
                stream=True,  # 启用流式输出
                extra_body={"reasoning_split": True} if "minimax" in config.get('base_url', '').lower() else None
            )
            
            # 收集流式响应的内容
            content = ''
            reasoning = ''
            
            for chunk in stream:
                # 处理推理内容（思考过程）
                if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                    reasoning_chunk = chunk.choices[0].delta.reasoning_content
                    reasoning += reasoning_chunk
                    # 实时发送思考过程到前端
                    yield generate_sse_event({
                        "type": "reasoning",
                        "content": reasoning_chunk,
                        "fullReasoning": reasoning
                    })
                
                # 处理正式内容
                if chunk.choices[0].delta.content:
                    content_chunk = chunk.choices[0].delta.content
                    content += content_chunk
                    
                    # 每收集到一定内容就通知前端（避免过于频繁）
                    if len(content) % 100 < 10:  # 大约每100个字符通知一次
                        yield generate_sse_event({
                            "type": "progress",
                            "step": 2,
                            "totalSteps": 3,
                            "status": "✍️ AI 正在生成简历内容",
                            "detail": f"已生成 {len(content)} 字符..."
                        })
            
            logger.info(f"OpenAI API 流式调用完成, 生成内容长度: {len(content)} 字符, 推理长度: {len(reasoning)} 字符")
            
            # 步骤3: 解析结果
            yield generate_sse_event({
                "type": "progress",
                "step": 3,
                "totalSteps": 3,
                "status": "📄 正在解析生成结果",
                "detail": "提取 HTML 代码，准备渲染..."
            })
            
            # 提取HTML代码
            import re
            
            # 优先尝试提取代码块中的内容（有捕获组）
            html_match = re.search(r'```html\n?([\s\S]*?)\n?```', content)
            if not html_match:
                html_match = re.search(r'```\n?([\s\S]*?)\n?```', content)
            
            html = ''
            if html_match:
                # 有捕获组，使用 group(1)
                html = html_match.group(1).strip()
            else:
                # 尝试直接匹配完整的HTML文档
                html_match = re.search(r'<!DOCTYPE[\s\S]*?</html>', content, re.IGNORECASE)
                if html_match:
                    html = html_match.group(0).strip()
                else:
                    # 尝试匹配<html>标签
                    html_match = re.search(r'<html[\s\S]*?</html>', content, re.IGNORECASE)
                    if html_match:
                        html = '<!DOCTYPE html>\n' + html_match.group(0).strip()
                    else:
                        # 如果都没有匹配到，检查内容是否以<!DOCTYPE开头
                        content_stripped = content.strip()
                        if content_stripped.startswith('<!DOCTYPE') or content_stripped.startswith('<html'):
                            html = content_stripped
                        else:
                            # 最后尝试：如果内容包含HTML标签，使用原始内容
                            if '<' in content_stripped and '>' in content_stripped:
                                logger.warning("无法精确提取HTML，使用原始内容")
                                html = content_stripped
                            else:
                                logger.error("AI返回的内容不包含HTML代码")
                                html = ''
            
            # 验证HTML是否包含必要的内容
            if html and not ('<!DOCTYPE' in html or '<html' in html):
                logger.warning("提取的HTML可能不完整")
            
            # 如果html为空，尝试从原始content中提取
            if not html and content:
                logger.warning("html为空，尝试从原始content中提取...")
                content_stripped = content.strip()
                # 检查content是否以<!DOCTYPE或<html开头
                if content_stripped.startswith('<!DOCTYPE') or content_stripped.startswith('<html'):
                    html = content_stripped
                    logger.info("从原始content中成功提取HTML")
                else:
                    # 最后尝试：检查content中是否包含完整的HTML
                    import re
                    html_match = re.search(r'<!DOCTYPE[\s\S]*?</html>', content_stripped, re.IGNORECASE)
                    if html_match:
                        html = html_match.group(0).strip()
                        logger.info("通过正则从content中提取HTML成功")
            
            # 如果还是为空，记录错误但不阻止返回
            if not html:
                logger.error("无法提取有效的HTML代码，使用原始内容")
                # 不再返回空，而是返回原始内容（让前端尝试处理）
                html = content.strip() if content else ''
            
            elapsed_time = time.time() - start_time
            logger.info(f"简历生成完成, 耗时: {elapsed_time:.2f}秒, HTML长度: {len(html)}")
            
            # 返回最终结果
            yield generate_sse_event({
                "type": "complete",
                "success": True,
                "html": html,
                "reasoning": reasoning,
                "elapsedTime": elapsed_time
            })
            
        except Exception as e:
            logger.error(f"生成简历失败: {type(e).__name__}: {str(e)}", exc_info=True)
            error_msg = str(e)
            if hasattr(e, 'status_code'):
                error_msg = f"API错误 (状态码 {e.status_code}): {error_msg}"
            yield generate_sse_event({
                "type": "error",
                "error": error_msg,
                "errorType": type(e).__name__
            })
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'  # 禁用 Nginx 缓冲
        }
    )


@app.route('/api/optimize-resume', methods=['POST'])
def optimize_resume():
    """优化简历 - 使用 SSE 实时返回进度"""
    
    def generate():
        """生成器函数，用于 SSE 流式返回"""
        try:
            data = request.get_json()
            session_id = data.get('sessionId', 'default')
            user_message = data.get('message', '')
            current_html = data.get('currentHtml', '')
            chat_history = data.get('chatHistory', [])
            
            if not user_message:
                yield generate_sse_event({"type": "error", "error": "消息不能为空"})
                return
            
            client = get_client(session_id)
            if not client:
                yield generate_sse_event({"type": "error", "error": "请先配置 API"})
                return
            
            config = configs.get(session_id, {})
            model = config.get('model', 'MiniMax-M3')
            
            # 步骤1: 准备数据
            logger.info(f"开始优化简历, session: {session_id}, model: {model}")
            logger.debug(f"优化消息长度: {len(user_message)} 字符, 聊天历史条数: {len(chat_history)}")
            yield generate_sse_event({
                "type": "progress",
                "step": 1,
                "totalSteps": 3,
                "status": "📝 准备优化简历",
                "detail": f"已配置模型: {model}, 历史消息: {len(chat_history)} 条"
            })
            
            start_time = time.time()
            
            # 构造消息历史
            messages = [
                {
                    "role": "system",
                    "content": f"""你是一个专业的简历优化助手。当前的简历HTML代码如下：

{current_html}

根据用户的需求，修改简历HTML代码并返回**完整的HTML代码**。

## ⚠️ 强制要求（极其重要，必须严格遵守）：
1) **必须且只能输出完整的HTML代码**，从`<!DOCTYPE html>`开始到`</html>`结束
2) **绝对不要输出任何解释文字、Markdown格式符号、代码块标记(```)、或任何多余内容**
3) **第一个字符必须是`<`**，最后一个字符必须是`>`（即</html>的>）
4) **不要说"好的，我来帮你优化"之类的话**，直接输出HTML代码
5) **保持原有的设计风格和所有 contenteditable="true" 属性**
6) **即使用户只是询问建议，也要直接修改HTML代码并输出**，不要返回纯文本回复
7) **输出必须是合法的HTML**，可以被浏览器直接渲染

## 输出格式（必须严格遵守）：
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>简历</title>
    <style>
        /* 样式代码 */
    </style>
</head>
<body>
    <!-- 简历内容 -->
</body>
</html>

## 错误示例（绝对不要这样输出）：
❌ 好的，我来帮你优化简历。主要做了以下修改：
❌ 以下是优化后的简历代码：
❌ ```html
❌ 希望这个简历能满足你的需求

## 正确示例（必须这样输出）：
✅ <!DOCTYPE html>
✅ <html>
✅ <head>

## 可编辑功能说明：
当前简历中的文本元素都带有 `contenteditable="true"` 属性，这是为了让用户可以直接点击编辑。
在修改时，请确保：
- 保留原有可编辑属性
- 新增的文本内容也要添加 `contenteditable="true"`
- 保留编辑相关的CSS样式

## 最后提醒：
- 你的输出将被直接用作HTML代码，任何多余的文字都会导致错误
- 请仔细检查，确保输出的是纯HTML代码，没有任何其他内容"""
                }
            ]
            
            # 添加历史消息
            for msg in chat_history:
                messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })
            
            # 添加当前用户消息
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            # 步骤2: 调用 AI API
            yield generate_sse_event({
                "type": "progress",
                "step": 2,
                "totalSteps": 3,
                "status": "🤖 AI 正在优化简历内容",
                "detail": f"发送 {len(messages)} 条消息给大模型..."
            })
            
            logger.info(f"正在调用 OpenAI API 优化简历 (流式模式)...")
            logger.debug(f"消息条数: {len(messages)}")
            
            # 步骤2.5: 开始流式输出AI思考过程
            yield generate_sse_event({
                "type": "progress",
                "step": 2,
                "totalSteps": 3,
                "status": "🧠 AI 正在思考...",
                "detail": "正在分析您的修改需求..."
            })
            
            # 使用流式API调用
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,  # 启用流式输出
                extra_body={"reasoning_split": True} if "minimax" in config.get('base_url', '').lower() else None
            )
            
            # 收集流式响应的内容
            content = ''
            reasoning = ''
            
            for chunk in stream:
                # 处理推理内容（思考过程）
                if hasattr(chunk.choices[0].delta, 'reasoning_content') and chunk.choices[0].delta.reasoning_content:
                    reasoning_chunk = chunk.choices[0].delta.reasoning_content
                    reasoning += reasoning_chunk
                    # 实时发送思考过程到前端
                    yield generate_sse_event({
                        "type": "reasoning",
                        "content": reasoning_chunk,
                        "fullReasoning": reasoning
                    })
                
                # 处理正式内容
                if chunk.choices[0].delta.content:
                    content_chunk = chunk.choices[0].delta.content
                    content += content_chunk
                    
                    # 每收集到一定内容就通知前端
                    if len(content) % 100 < 10:  # 大约每100个字符通知一次
                        yield generate_sse_event({
                            "type": "progress",
                            "step": 2,
                            "totalSteps": 3,
                            "status": "✍️ AI 正在优化简历内容",
                            "detail": f"已处理 {len(content)} 字符..."
                        })
            
            logger.info(f"OpenAI API 流式调用完成, 生成内容长度: {len(content)} 字符, 推理长度: {len(reasoning)} 字符")
            
            # 调试：记录AI返回的原始内容（前1000字符）
            logger.info(f"AI返回的原始内容预览: {content[:1000]}")
            logger.info(f"AI返回的原始内容长度: {len(content)}")
            
            # 步骤3: 解析结果
            yield generate_sse_event({
                "type": "progress",
                "step": 3,
                "totalSteps": 3,
                "status": "📄 正在解析优化结果",
                "detail": "提取更新后的 HTML 代码..."
            })
            
            # 提取HTML代码
            import re
            
            # 优先尝试提取代码块中的内容（有捕获组）
            html_match = re.search(r'```html\n?([\s\S]*?)\n?```', content)
            if html_match:
                html = html_match.group(1).strip()
                logger.info("成功从```html代码块中提取HTML")
            else:
                html_match = re.search(r'```\n?([\s\S]*?)\n?```', content)
                if html_match:
                    html = html_match.group(1).strip()
                    logger.info("成功从```代码块中提取HTML")
                else:
                    # 尝试直接匹配完整的HTML文档
                    html_match = re.search(r'<!DOCTYPE[\s\S]*?</html>', content, re.IGNORECASE)
                    if html_match:
                        html = html_match.group(0).strip()
                        logger.info("成功通过<!DOCTYPE正则提取HTML")
                    else:
                        # 尝试匹配<html>标签
                        html_match = re.search(r'<html[\s\S]*?</html>', content, re.IGNORECASE)
                        if html_match:
                            html = '<!DOCTYPE html>\n' + html_match.group(0).strip()
                            logger.info("成功通过<html>正则提取HTML")
                        else:
                            # 如果都没有匹配到，检查内容是否以<!DOCTYPE开头
                            content_stripped = content.strip()
                            if content_stripped.startswith('<!DOCTYPE') or content_stripped.startswith('<html'):
                                html = content_stripped
                                logger.info("AI返回内容本身就是HTML")
                            else:
                                # 最后尝试：如果内容包含HTML标签，包装一下
                                if '<' in content_stripped and '>' in content_stripped:
                                    logger.warning("无法精确提取HTML，使用原始内容")
                                    html = content_stripped
                                else:
                                    # 如果完全没有HTML标签，返回错误
                                    logger.error(f"AI返回的内容不包含HTML代码。内容预览: {content[:500]}")
                                    html = ''  # 返回空，让前端处理错误
            
            # 验证HTML是否包含必要的内容
            if html and not ('<!DOCTYPE' in html or '<html' in html):
                logger.warning("提取的HTML可能不完整，尝试修复...")
                # 如果不完整，尝试包装
                if '<body' in html or '<head' in html or '<style' in html:
                    html = '<!DOCTYPE html>\n<html>\n' + html + '\n</html>'
            
            # 如果html为空，尝试从原始content中提取
            if not html and content:
                logger.warning("html为空，尝试从原始content中提取...")
                content_stripped = content.strip()
                # 检查content是否以<!DOCTYPE或<html开头
                if content_stripped.startswith('<!DOCTYPE') or content_stripped.startswith('<html'):
                    html = content_stripped
                    logger.info("从原始content中成功提取HTML")
                else:
                    # 最后尝试：检查content中是否包含完整的HTML
                    import re
                    html_match = re.search(r'<!DOCTYPE[\s\S]*?</html>', content_stripped, re.IGNORECASE)
                    if html_match:
                        html = html_match.group(0).strip()
                        logger.info("通过正则从content中提取HTML成功")
            
            # 如果还是为空，记录错误但不阻止返回
            if not html:
                logger.error("无法提取有效的HTML代码，使用原始内容")
                # 不再返回空，而是返回原始内容（让前端尝试处理）
                html = content.strip() if content else ''
            
            elapsed_time = time.time() - start_time
            logger.info(f"简历优化完成, 耗时: {elapsed_time:.2f}秒, HTML长度: {len(html)}")
            
            # 返回最终结果
            yield generate_sse_event({
                "type": "complete",
                "success": True,
                "html": html,
                "content": content,
                "reasoning": reasoning,
                "elapsedTime": elapsed_time
            })
            
        except Exception as e:
            logger.error(f"优化简历失败: {type(e).__name__}: {str(e)}", exc_info=True)
            error_msg = str(e)
            if hasattr(e, 'status_code'):
                error_msg = f"API错误 (状态码 {e.status_code}): {error_msg}"
            yield generate_sse_event({
                "type": "error",
                "error": error_msg,
                "errorType": type(e).__name__
            })
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


@app.route('/api/beautify-style', methods=['POST'])
def beautify_style():
    """美化简历样式 - 单独接口"""
    
    def generate():
        """生成器函数，用于 SSE 流式返回"""
        try:
            data = request.get_json()
            session_id = data.get('sessionId', 'default')
            current_html = data.get('html', '')
            
            if not current_html:
                yield generate_sse_event({"type": "error", "error": "HTML内容不能为空"})
                return
            
            client = get_client(session_id)
            if not client:
                yield generate_sse_event({"type": "error", "error": "请先配置 API"})
                return
            
            config = configs.get(session_id, {})
            model = config.get('model', 'MiniMax-M3')
            
            # 步骤1: 准备数据
            logger.info(f"开始美化样式, session: {session_id}, model: {model}")
            yield generate_sse_event({
                "type": "progress",
                "step": 1,
                "totalSteps": 2,
                "status": "🎨 准备美化样式",
                "detail": f"已配置模型: {model}"
            })
            
            start_time = time.time()
            
            # 步骤2: 调用AI美化样式
            yield generate_sse_event({
                "type": "progress",
                "step": 2,
                "totalSteps": 2,
                "status": "🤖 AI 正在美化样式",
                "detail": "优化CSS样式，提升视觉效果..."
            })
            
            # 调用美化函数
            beautified_html = beautify_resume_style(client, model, current_html)
            
            elapsed_time = time.time() - start_time
            
            if beautified_html and beautified_html != current_html:
                logger.info(f"样式美化完成, 耗时: {elapsed_time:.2f}秒")
                yield generate_sse_event({
                    "type": "complete",
                    "success": True,
                    "html": beautified_html,
                    "elapsedTime": elapsed_time
                })
            else:
                logger.warning("样式美化未产生变化")
                yield generate_sse_event({
                    "type": "complete",
                    "success": True,
                    "html": current_html,
                    "elapsedTime": elapsed_time,
                    "message": "样式已是最佳状态，无需优化"
                })
            
        except Exception as e:
            logger.error(f"美化样式失败: {type(e).__name__}: {str(e)}", exc_info=True)
            error_msg = str(e)
            if hasattr(e, 'status_code'):
                error_msg = f"API错误 (状态码 {e.status_code}): {error_msg}"
            yield generate_sse_event({
                "type": "error",
                "error": error_msg,
                "errorType": type(e).__name__
            })
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


@app.route('/api/generate-resume-data', methods=['POST'])
def generate_resume_data():
    """生成简历结构化数据 - 使用 SSE 实时返回进度"""
    
    def generate():
        """生成器函数，用于 SSE 流式返回"""
        try:
            data = request.get_json()
            session_id = data.get('sessionId', 'default')
            prompt = data.get('prompt', '')
            current_data = data.get('currentData', {})
            
            client = get_client(session_id)
            if not client:
                yield generate_sse_event({"type": "error", "error": "请先配置 API"})
                return
            
            config = configs.get(session_id, {})
            model = config.get('model', 'MiniMax-M3')
            
            # 步骤1: 准备数据
            logger.info(f"开始生成简历数据, session: {session_id}, model: {model}")
            logger.debug(f"提示词长度: {len(prompt)} 字符")
            yield generate_sse_event({
                "type": "progress",
                "step": 1,
                "totalSteps": 3,
                "status": "📝 准备生成简历数据",
                "detail": f"已配置模型: {model}"
            })
            
            system_prompt = """你是一个专业的简历生成助手。根据用户的描述，生成结构化的简历内容。

请以 JSON 格式返回简历数据，格式如下：
{
  "personal": {
    "name": "姓名",
    "title": "职位标题",
    "phone": "电话",
    "email": "邮箱",
    "location": "所在地",
    "website": "个人网站"
  },
  "education": [
    {
      "school": "学校名称",
      "major": "专业",
      "degree": "学位",
      "startDate": "开始时间",
      "endDate": "结束时间",
      "description": "描述"
    }
  ],
  "work": [
    {
      "company": "公司名称",
      "position": "职位",
      "startDate": "开始时间",
      "endDate": "结束时间",
      "description": "工作描述"
    }
  ],
  "projects": [
    {
      "name": "项目名称",
      "role": "角色",
      "startDate": "开始时间",
      "endDate": "结束时间",
      "description": "项目描述",
      "techStack": ["技术栈"]
    }
  ],
  "skills": [
    {
      "category": "技能分类",
      "items": ["技能1", "技能2"]
    }
  ],
  "summary": "自我评价"
}

只返回 JSON 数据，不要有其他说明文字。"""
            
            # 步骤2: 调用 AI API
            yield generate_sse_event({
                "type": "progress",
                "step": 2,
                "totalSteps": 3,
                "status": "🤖 AI 正在分析简历信息",
                "detail": "正在结构化处理您的简历数据..."
            })
            
            logger.info(f"正在调用 OpenAI API 生成简历数据...")
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"基于以下信息生成简历内容：\n{prompt}\n\n当前已有数据：{json.dumps(current_data, ensure_ascii=False, indent=2)}"}
                ]
            )
            
            logger.info(f"OpenAI API 调用成功, 响应ID: {response.id}, 使用tokens: {response.usage.total_tokens if response.usage else 'N/A'}")
            
            # 步骤3: 解析结果
            yield generate_sse_event({
                "type": "progress",
                "step": 3,
                "totalSteps": 3,
                "status": "📄 正在解析JSON数据",
                "detail": "处理 AI 返回的结构化数据..."
            })
            
            content = response.choices[0].message.content or '{}'
            
            # 解析 JSON
            import re
            json_match = (
                re.search(r'```json\n?([\s\S]*?)\n?```', content) or
                re.search(r'\{[\s\S]*\}', content)
            )
            
            json_str = ''
            if json_match:
                json_str = json_match.group(1) if json_match.group(1) else json_match.group(0)
            else:
                json_str = content
            
            resume_data = json.loads(json_str)
            
            logger.info(f"简历数据生成完成")
            
            # 返回最终结果
            yield generate_sse_event({
                "type": "complete",
                "success": True,
                "data": resume_data
            })
            
        except Exception as e:
            logger.error(f"生成简历数据失败: {type(e).__name__}: {str(e)}", exc_info=True)
            error_msg = str(e)
            if hasattr(e, 'status_code'):
                error_msg = f"API错误 (状态码 {e.status_code}): {error_msg}"
            yield generate_sse_event({
                "type": "error",
                "error": error_msg,
                "errorType": type(e).__name__
            })
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


def beautify_resume_style(client, model, html):
    """
    美化简历样式 - 调用AI优化CSS
    
    Args:
        client: OpenAI客户端
        model: 模型名称
        html: 原始HTML代码
    
    Returns:
        美化后的HTML代码，如果失败则返回原始HTML
    """
    try:
        logger.info("开始美化简历样式...")
        
        beautify_prompt = """你是一个世界顶级的CSS设计大师和前端开发专家。你的任务是优化简历的视觉效果。

## 核心要求：
1. 保持HTML结构完全不变（不要修改任何HTML标签、属性、内容）
2. **重要：保留所有 contenteditable="true" 属性**，这是为了让用户可以直接点击编辑简历内容
3. 只优化<style>标签中的CSS样式
4. 让简历看起来更专业、更现代、更美观
5. 直接返回完整的HTML代码

## 可编辑功能说明：
当前简历中的文本元素都带有 `contenteditable="true"` 属性，这是为了让用户可以直接点击编辑。
在优化样式时，请确保：
- **不要删除或修改** contenteditable 属性
- 保留与编辑相关的CSS样式（如 [contenteditable="true"]:hover 等）
- 如果有编辑提示相关的HTML元素，也要保留

## 设计原则：
- 使用现代配色方案（专业、简洁）
- 优化字体排版（字号、行高、字重、字间距）
- 添加微妙的视觉元素（分隔线、图标、标签）
- 使用CSS Flexbox/Grid优化布局
- 确保打印效果完美（@media print）
- 保持A4尺寸规范（794px宽，57px边距）

## 具体样式建议：
1. 标题样式：
   - 使用左侧彩色竖线或底部渐变下划线
   - 添加subtle的字母间距(letter-spacing)
   - 使用font-weight: 600或700

2. 模块分隔：
   - 模块之间添加适当的margin-bottom
   - 使用subtle的分割线或背景色区分

3. 卡片式设计：
   - 为某些模块添加subtle的边框或背景
   - 使用border-left或border-left-color强调

4. 交互效果：
   - 添加subtle的transition效果
   - 打印时隐藏所有交互效果

5. 图标优化：
   - 确保Font Awesome图标与文字对齐
   - 使用icon作为视觉锚点

6. 打印优化：
   - 确保背景色和边框在打印时显示
   - 使用-webkit-print-color-adjust: exact

## 输出格式：
直接返回完整的HTML代码（从<!DOCTYPE html>到</html>），只包含优化后的<style>内容。

**重要提醒**：
- 不要修改HTML结构，只优化CSS！
- 必须保留所有 contenteditable="true" 属性！
- 必须保留可编辑相关的CSS样式！"""

        # 调用AI美化样式
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": beautify_prompt},
                {"role": "user", "content": f"请优化以下简历的CSS样式，让它更美观专业：\n\n{html}"}
            ],
            temperature=0.7  # 稍微提高创意性
        )
        
        beautified_html = response.choices[0].message.content
        
        # 提取HTML代码
        import re
        
        # 尝试提取代码块
        html_match = re.search(r'```html\n?([\s\S]*?)\n?```', beautified_html)
        if not html_match:
            html_match = re.search(r'```\n?([\s\S]*?)\n?```', beautified_html)
        
        result = ''
        if html_match:
            result = html_match.group(1).strip()
        else:
            # 尝试直接匹配完整HTML
            html_match = re.search(r'<!DOCTYPE[\s\S]*?</html>', beautified_html, re.IGNORECASE)
            if html_match:
                result = html_match.group(0).strip()
            else:
                # 尝试匹配<html>标签
                html_match = re.search(r'<html[\s\S]*?</html>', beautified_html, re.IGNORECASE)
                if html_match:
                    result = '<!DOCTYPE html>\n' + html_match.group(0).strip()
                else:
                    # 如果都没匹配到，检查内容是否以<!DOCTYPE开头
                    content_stripped = beautified_html.strip()
                    if content_stripped.startswith('<!DOCTYPE') or content_stripped.startswith('<html'):
                        result = content_stripped
                    else:
                        # 如果完全没有HTML标签，返回原始HTML
                        logger.warning("无法从AI响应中提取HTML，使用原始HTML")
                        return html
        
        # 验证HTML是否包含必要的内容
        if result and not ('<!DOCTYPE' in result or '<html' in result):
            logger.warning("美化的HTML可能不完整，使用原始HTML")
            return html
        
        logger.info("样式美化完成")
        return result
        
    except Exception as e:
        logger.error(f"样式美化失败: {str(e)}")
        return html  # 失败时返回原始HTML


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "接口不存在"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "服务器内部错误"}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f'启动服务器, 端口: {port}, debug: {debug}')
    logger.info(f'日志文件保存在: {log_file}')
    app.run(host='0.0.0.0', port=port, debug=debug)
