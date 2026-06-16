// 提示词模板类型定义
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'tech' | 'product' | 'design' | 'marketing' | 'fresh' | 'custom'
  prompt: string  // 完整提示词（fixedPrompt + editablePrompt）
  fixedPrompt?: string  // 固定提示词（隐藏，用户不可编辑，如API调用指令）
  editablePrompt?: string  // 可编辑提示词（用户可见可编辑的部分）
  icon?: string
}

// 生成的简历数据
export interface GeneratedResume {
  id: string
  html: string
  css?: string
  template: string
  prompt: string
  createdAt: number
  updatedAt: number
}

// 简历数据类型定义（简化版）
export interface PersonalInfo {
  name: string
  avatar: string
  title: string
  phone: string
  email: string
  location: string
  website: string
}

export interface ResumeData {
  personal: PersonalInfo
  rawText: string // 用户原始输入
  generatedHTML: string // AI生成的HTML
  generatedCSS: string // AI生成的CSS
}

// 聊天消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  timestamp: number
}

// API 配置
export interface APIConfig {
  apiKey: string
  baseURL: string
  model: string
}

// 模板元数据
export interface TemplateMeta {
  id: string
  name: string
  description: string
  category: string
  promptTemplate: string
}
