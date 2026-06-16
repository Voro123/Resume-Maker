# AGENTS.md - AI代理操作指南

## 项目概述
Resume Marker 是一个基于 Vue3 的 AI 简历生成器，允许用户通过提示词模板生成可打印的 HTML 简历，并导出为 PDF。支持提示词分层（固定部分 + 可编辑部分）和 AI 对话优化。

## 技术栈
- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI组件**: Element Plus
- **PDF生成**: html2pdf.js
- **状态管理**: Pinia
- **路由**: Vue Router
- **大模型集成**: OpenAI SDK (兼容 MiniMax-M3)

## 项目结构
```
resume-marker/
├── src/
│   ├── components/          # 组件
│   │   ├── PromptTemplateSelector.vue  # 提示词模板选择器（含API配置）
│   │   ├── ResumePreview.vue            # 简历HTML预览组件
│   │   └── ChatPanel.vue               # AI对话面板
│   ├── views/               # 页面视图
│   │   └── EditorView.vue              # 主编辑页面（三栏布局）
│   ├── stores/              # Pinia状态管理
│   │   ├── resume.ts                   # 简历数据store（生成/预览）
│   │   └── chat.ts                     # 对话store
│   ├── config/              # 配置文件
│   │   └── promptTemplates.ts          # 提示词模板（含fixedPrompt/editablePrompt）
│   ├── types/               # TypeScript类型定义
│   │   └── resume.ts                  # PromptTemplate, GeneratedResume等类型
│   ├── utils/               # 工具函数
│   │   ├── pdf.ts                      # PDF生成工具
│   │   └── api.ts                      # API调用封装
│   ├── App.vue
│   └── main.ts
├── public/
├── package.json
├── README.md                # 用户使用文档
├── SKILL.md                 # 技术方案文档
└── vite.config.ts
```

## 核心功能说明

### 1. 提示词模板系统
提示词分为两部分：
- **fixedPrompt（固定部分）**：系统自动添加的API调用指令，如"输出完整HTML"、"A4尺寸"等，用户不可见
- **editablePrompt（可编辑部分）**：设计风格、模块要求、配色等，用户可修改

### 2. API Key 配置（最高优先级）
- 用户必须先配置 API Key 才能使用
- 支持模型选择（目前仅 MiniMax-M3）
- 配置保存在 localStorage

### 3. 简历生成流程
```
配置API Key → 选择模板 → 编辑可编辑提示词 → 点击生成 → AI生成HTML → 预览 → 对话优化 → 导出PDF
```

### 4. 对话优化
- 基于当前简历HTML与AI对话
- 支持思考过程展示
- 实时更新预览

## 开发规范

### 组件开发
- 使用 Composition API + `<script setup>` 语法
- 组件名使用 PascalCase
- Props 和 Emits 需要定义 TypeScript 类型
- 使用 Pinia 管理全局状态

### 提示词模板开发
- 新增模板在 `src/config/promptTemplates.ts` 中添加
- 固定部分使用 `COMMON_FIXED_PROMPT` 或自定义 `fixedPrompt`
- 可编辑部分写在 `editablePrompt` 中
- 模板分类：`tech` | `product` | `design` | `marketing` | `fresh` | `custom`

### 样式规范
- 使用 Scoped CSS 避免样式污染
- PDF 样式使用单独的 CSS 或内联样式
- 使用 CSS `page-break-*` 和 `break-inside: avoid` 优化分页

### 状态管理
- 简历 HTML 存储在 Pinia store 中
- API 配置存储在 localStorage
- 支持撤销/重做功能（可选）

### API调用
- 大模型API调用通过用户配置的密钥进行
- 支持多个模型切换（当前仅MiniMax-M3）
- API调用需要错误处理和加载状态

## 常用命令
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 注意事项
1. **API密钥安全**：仅存储在用户本地，不上传服务器
2. **提示词分层**：fixedPrompt 用户不可见，只有 editablePrompt 可编辑
3. **HTML输出要求**：确保AI输出的是完整HTML，包含DOCTYPE声明
4. **PDF生成**：需要在浏览器环境中进行，注意分页控制
5. **中文支持**：确保使用的中文字体在打印时可用

## 类型定义参考
```typescript
// src/types/resume.ts

// 提示词模板
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'tech' | 'product' | 'design' | 'marketing' | 'fresh' | 'custom'
  prompt: string              // 完整提示词
  fixedPrompt?: string       // 固定提示词（隐藏）
  editablePrompt?: string    // 可编辑提示词
  icon?: string
}

// 生成的简历
export interface GeneratedResume {
  id: string
  html: string
  css?: string
  template: string
  prompt: string
  createdAt: number
  updatedAt: number
}

// 聊天消息
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  timestamp: number
}

// API配置
export interface APIConfig {
  apiKey: string
  baseURL: string
  model: string
}
```

### 2. PDF生成优化
- 使用 `html2pdf.js` 生成PDF
- 在生成前检测分页位置
- 对关键模块应用 `break-inside: avoid`
- 提供打印样式表

### 3. 大模型对话
- 侧边栏聊天界面
- 支持实时预览修改效果
- 对话历史记录

### 4. 模板系统
- 模板定义为Vue组件或HTML模板
- 支持模板预览和切换
- 模板可配置模块显示/隐藏

## 常用命令
```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 注意事项
1. API密钥存储在用户本地，不上传服务器
2. 图片上传需要转为base64或提供外部链接
3. PDF生成需要在浏览器环境中进行
4. 确保简历在不同浏览器中打印效果一致
5. 修改完成后不要自行启动项目
