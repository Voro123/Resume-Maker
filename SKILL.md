# SKILL.md - 技术方案文档

## 项目目标
构建一个基于Vue3的AI简历生成器，支持：
- 通过提示词模板生成简历HTML
- 提示词分为固定部分和可编辑部分
- 与大模型对话优化简历内容
- 高质量PDF导出（避免分页截断）
- 支持多种岗位类型模板

## 技术选型

### 前端技术栈
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI库**: Element Plus（提供表单、对话框、按钮等组件）
- **状态管理**: Pinia
- **路由**: Vue Router
- **PDF生成**: html2pdf.js（前端生成PDF，支持分页控制）
- **样式**: SCSS + 打印样式优化
- **HTTP客户端**: Axios（调用大模型API）

### 大模型集成
- **SDK**: OpenAI SDK（兼容MiniMax API）
- **支持模型**: MiniMax-M3（后续可扩展）
- **配置方式**: 用户手动填写API Key和Base URL（最高优先级，必须先配置）
- **对话UI**: 侧边栏聊天窗口

## 核心功能模块

### 1. 提示词模板系统

#### 提示词结构设计
```typescript
// types/resume.ts
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'tech' | 'product' | 'design' | 'marketing' | 'fresh' | 'custom'
  prompt: string              // 完整提示词（fixedPrompt + editablePrompt）
  fixedPrompt?: string       // 固定提示词（隐藏，用户不可编辑）
  editablePrompt?: string    // 可编辑提示词（用户可见可编辑）
  icon?: string
}
```

#### 提示词分层策略
- **固定提示词（fixedPrompt）**：
  - API调用指令（如"直接输出完整HTML代码"）
  - 输出格式要求（A4尺寸、内联CSS等）
  - 技术要求（语义化HTML5、中文字体等）
  - 用户无需关心，系统自动添加

- **可编辑提示词（editablePrompt）**：
  - 设计风格要求
  - 颜色主题配置
  - 必备模块定义
  - 布局建议
  - 用户可根据需求修改

#### 通用固定提示词模板
```typescript
const COMMON_FIXED_PROMPT = `你是一位专业的前端开发和简历设计专家。请根据用户的要求生成一份高质量的中文简历HTML。

重要要求：
1. 直接输出完整的HTML代码，包含 <!DOCTYPE html> 声明和所有内容
2. HTML必须是完整的、可直接在浏览器中打开和打印（A4尺寸）的单文件
3. 所有CSS样式必须内联在 <style> 标签中
4. 使用语义化HTML5标签，确保良好的可读性
5. 页面尺寸严格遵循A4纸张大小（210mm × 297mm）
6. 使用中文标准字体：微软雅黑、宋体等
7. 避免使用JavaScript，保证静态HTML的兼容性
8. 配色专业、印刷友好
9. 输出格式：只返回HTML代码，不要添加任何解释`
```

### 2. 数据结构设计

#### 生成的简历数据
```typescript
// types/resume.ts

// 提示词模板类型定义
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'tech' | 'product' | 'design' | 'marketing' | 'fresh' | 'custom'
  prompt: string              // 完整提示词（fixedPrompt + editablePrompt）
  fixedPrompt?: string       // 固定提示词（隐藏，用户不可编辑）
  editablePrompt?: string     // 可编辑提示词（用户可见可编辑）
  icon?: string
}

// 生成的简历数据
export interface GeneratedResume {
  id: string
  html: string               // AI生成的完整HTML
  css?: string               // 额外的CSS样式
  template: string           // 使用的模板ID
  prompt: string             // 使用的完整提示词
  createdAt: number
  updatedAt: number
}

// 聊天消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string         // AI思考过程
  timestamp: number
}

// API 配置
export interface APIConfig {
  apiKey: string
  baseURL: string
  model: string
}
```

#### 提示词分类
```typescript
// 支持的岗位分类
type Category = 
  | 'tech'       // 技术类：前端、后端、全栈
  | 'product'    // 产品类：产品经理
  | 'design'     // 设计类：UI/UX设计师
  | 'marketing'  // 市场类：市场营销
  | 'fresh'      // 应届生/实习生
  | 'custom'     // 自定义
```

### 3. 模板系统设计

#### 模板定义
每个模板包含：
- **模板组件**: Vue组件，接收ResumeData作为props
- **模板样式**: 独立的CSS/SCSS文件
- **模板配置**: 元数据（名称、描述、预览图）

#### 模板列表
1. **经典模板 (classic)**: 简洁专业，适合传统行业
2. **现代模板 (modern)**: 扁平化设计，适合互联网行业
3. **创意模板 (creative)**: 个性化设计，适合设计/创意行业

### 4. PDF生成优化方案

#### 分页控制策略
```css
/* 打印样式优化 */
@media print {
  /* 避免元素内部分页 */
  .resume-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  /* 在 section 前分页 */
  .resume-section {
    break-before: auto;
    page-break-before: auto;
  }
  
  /* 避免标题单独在页面底部 */
  .section-title {
    break-after: avoid;
    page-break-after: avoid;
  }
}
```

#### html2pdf.js 配置
```typescript
const options = {
  margin: 0,
  filename: 'resume.pdf',
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { 
    scale: 2,
    useCORS: true,
    letterRendering: true
  },
  jsPDF: { 
    unit: 'mm', 
    format: 'a4', 
    orientation: 'portrait',
    compress: true
  },
  pagebreak: { 
    mode: ['avoid-all', 'css', 'legacy'],
    before: '.page-break-before',
    after: '.page-break-after',
    avoid: '.page-break-avoid'
  }
}
```

### 5. 大模型对话功能

#### API调用封装
```typescript
// stores/resume.ts - generateResume方法
import OpenAI from 'openai'

export const useResumeStore = defineStore('resume', () => {
  const generatedHTML = ref<string>('')
  const currentPrompt = ref<string>('')
  const isGenerating = ref(false)
  
  // 生成简历
  const generateResume = async (apiConfig: APIConfig, prompt: string) => {
    isGenerating.value = true
    try {
      // 调用AI API
      const html = await callAIAPI(apiConfig, prompt)
      generatedHTML.value = html
      currentPrompt.value = prompt
      saveToLocalStorage()
    } finally {
      isGenerating.value = false
    }
  }
  
  // 保存到本地存储
  const saveToLocalStorage = () => {
    localStorage.setItem('resume-html', generatedHTML.value)
  }
  
  return { generatedHTML, currentPrompt, isGenerating, generateResume }
})
```

#### 对话UI设计
- **位置**: 右侧可折叠侧边栏
- **功能**: 
  - 显示对话历史和思考过程
  - 输入框支持多行文本（Ctrl+Enter发送）
  - 实时显示AI回复
  - 支持基于当前简历的优化对话

### 6. 组件架构

#### 主要组件
1. **App.vue**: 根组件，包含整体布局
2. **EditorView.vue**: 主编辑页面
   - 左侧：PromptTemplateSelector（提示词模板选择器和编辑器）
   - 中间：ResumePreview（简历HTML预览）
   - 右侧：ChatPanel（AI对话面板）
3. **PromptTemplateSelector.vue**: 提示词选择器组件
   - API Key配置（最高优先级，必须先配置）
   - 分类筛选（全部/技术类/产品类等）
   - 模板卡片列表
   - 可编辑提示词输入框
   - 生成按钮
4. **ResumePreview.vue**: 简历预览组件
   - 渲染AI生成的HTML
   - 支持导出PDF
   - 支持打印
5. **ChatPanel.vue**: AI对话面板
   - 对话历史列表（包含思考过程）
   - 输入框
   - 快捷操作按钮

### 7. 状态管理设计

#### Pinia Stores
```typescript
// stores/resume.ts
export const useResumeStore = defineStore('resume', () => {
  const generatedHTML = ref<string>('')
  const currentPrompt = ref<string>('')
  const isGenerating = ref(false)
  
  // 生成简历
  const generateResume = async (apiConfig: APIConfig, prompt: string) => {
    isGenerating.value = true
    try {
      // 调用AI API
      const html = await callAIAPI(apiConfig, prompt)
      generatedHTML.value = html
      currentPrompt.value = prompt
      saveToLocalStorage()
    } finally {
      isGenerating.value = false
    }
  }
  
  // 保存到本地存储
  const saveToLocalStorage = () => {
    localStorage.setItem('resume-html', generatedHTML.value)
  }
  
  return { generatedHTML, currentPrompt, isGenerating, generateResume }
})
```

## 实现步骤

### Phase 1: 项目初始化 ✅
- [x] 使用 Vite 创建 Vue3 + TypeScript 项目
- [x] 安装依赖（Element Plus, Pinia, Vue Router, OpenAI SDK）
- [x] 配置项目结构
- [x] 创建 AGENTS.md 和 SKILL.md

### Phase 2: 核心功能实现 ✅
- [x] 实现 PromptTemplateSelector 组件
- [x] 实现 API Key 配置（最高优先级）
- [x] 实现提示词模板系统（fixedPrompt + editablePrompt）
- [x] 实现 ResumePreview 组件
- [x] 集成 OpenAI SDK 调用 MiniMax API
- [x] 实现HTML预览和更新

### Phase 3: 对话优化功能 ✅
- [x] 实现 ChatPanel 组件
- [x] 实现对话逻辑
- [x] 显示AI思考过程

### Phase 4: 导出功能 ✅
- [x] 集成 html2pdf.js
- [x] 实现PDF导出
- [x] 优化打印样式

### Phase 5: 优化和测试 🔄
- [ ] 响应式布局优化
- [ ] 性能优化
- [ ] 浏览器兼容性测试
- [ ] 用户体验优化

## 关键技术方案

### 1. 提示词模板系统
- 提示词分为 `fixedPrompt`（固定）和 `editablePrompt`（可编辑）
- 固定部分包含API调用指令，用户无需关心
- 可编辑部分包含设计要求，用户可自由修改
- 生成时自动组合两部分发送给AI

### 2. 实时预览实现
- 使用 Vue 的响应式系统
- AI生成的HTML直接渲染在预览组件
- 对话优化后自动更新预览

### 3. PDF生成优化
- 使用 `html2pdf.js` 生成PDF
- 确保生成的HTML包含打印优化样式
- A4尺寸严格控制

### 4. 数据安全
- API Key 仅存储在浏览器本地
- 简历数据保存在本地 localStorage
- 不上传任何数据到服务器

## 参考资料
- MiniMax API文档: https://platform.minimaxi.com/document
- html2pdf.js文档: https://github.com/eKoopmans/html2pdf.js
- Vue3文档: https://cn.vuejs.org/
- Element Plus文档: https://element-plus.org/
