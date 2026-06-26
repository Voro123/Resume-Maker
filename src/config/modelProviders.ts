import type { APIProvider } from '@/types/resume'

export interface ModelProviderOption {
  id: APIProvider
  name: string
  description: string
  baseURL: string
  recommendedModel: string
  models: string[]
  apiKeyPlaceholder: string
  recommended?: boolean
}

export const MODEL_PROVIDER_OPTIONS: ModelProviderOption[] = [
  {
    id: 'minimax',
    name: 'MiniMax（推荐）',
    description: '默认推荐，当前项目主要按 OpenAI-compatible Chat Completions 接口调用。',
    baseURL: 'https://api.minimaxi.com/v1',
    recommendedModel: 'MiniMax-M3',
    models: ['MiniMax-M3'],
    apiKeyPlaceholder: '请输入 MiniMax API Key',
    recommended: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: '适用于 OpenAI 官方或兼容 OpenAI 的代理地址。',
    baseURL: 'https://api.openai.com/v1',
    recommendedModel: 'gpt-4.1-mini',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'],
    apiKeyPlaceholder: '请输入 OpenAI API Key'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '适用于 DeepSeek 官方 OpenAI-compatible 接口。',
    baseURL: 'https://api.deepseek.com',
    recommendedModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    apiKeyPlaceholder: '请输入 DeepSeek API Key'
  },
  {
    id: 'moonshot',
    name: 'Moonshot / Kimi',
    description: '适用于 Moonshot OpenAI-compatible 接口。',
    baseURL: 'https://api.moonshot.cn/v1',
    recommendedModel: 'moonshot-v1-32k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    apiKeyPlaceholder: '请输入 Moonshot API Key'
  },
  {
    id: 'qwen',
    name: '通义千问 / DashScope',
    description: '适用于 DashScope OpenAI-compatible 接口。',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    recommendedModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max', 'qwen-long'],
    apiKeyPlaceholder: '请输入 DashScope API Key'
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    description: '适用于智谱 OpenAI-compatible 接口。',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    recommendedModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air'],
    apiKeyPlaceholder: '请输入智谱 API Key'
  },
  {
    id: 'custom',
    name: '自定义 OpenAI 兼容接口',
    description: '适用于任意兼容 /v1/chat/completions 的服务商或本地模型网关。',
    baseURL: 'http://localhost:11434/v1',
    recommendedModel: '自定义模型名',
    models: ['自定义模型名'],
    apiKeyPlaceholder: '请输入 API Key；本地模型如不需要可填任意占位值'
  }
]

export const DEFAULT_API_PROVIDER = MODEL_PROVIDER_OPTIONS[0]

export const DEFAULT_API_CONFIG = {
  provider: DEFAULT_API_PROVIDER.id,
  apiKey: '',
  baseURL: DEFAULT_API_PROVIDER.baseURL,
  model: DEFAULT_API_PROVIDER.recommendedModel
}

export const getProviderOption = (provider?: string, baseURL?: string) => {
  if (provider) {
    const matched = MODEL_PROVIDER_OPTIONS.find((item) => item.id === provider)
    if (matched) return matched
  }

  if (baseURL) {
    const normalizedBaseURL = baseURL.toLowerCase()
    const matchedByUrl = MODEL_PROVIDER_OPTIONS.find((item) => {
      return item.id !== 'custom' && normalizedBaseURL.includes(item.id)
    })
    if (matchedByUrl) return matchedByUrl
  }

  return DEFAULT_API_PROVIDER
}
