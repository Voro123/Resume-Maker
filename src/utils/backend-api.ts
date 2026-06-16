import type { APIConfig, ResumeData, ChatMessage } from '@/types/resume'

// 后端 API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

// 默认 session ID（可以从用户设置中获取，这里使用固定值）
const DEFAULT_SESSION_ID = 'default'

/**
 * 进度回调类型
 */
export type ProgressCallback = (data: {
  step: number
  totalSteps: number
  status: string
  detail?: string
}) => void

/**
 * 推理（思考过程）回调类型
 */
export type ReasoningCallback = (data: {
  content: string
  fullReasoning: string
}) => void

/**
 * 配置后端 API
 */
export async function configureBackend(config: Partial<APIConfig>): Promise<{
  success: boolean
  message: string
  config: { baseURL: string; model: string }
}> {
  const response = await fetch(`${API_BASE_URL}/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: DEFAULT_SESSION_ID,
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      model: config.model
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '配置失败')
  }
  
  return response.json()
}

/**
 * 解析 SSE 数据流
 */
async function* parseSSEStream(response: Response): AsyncGenerator<any> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法读取响应流')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    
    if (done) {
      // 处理剩余的 buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              yield JSON.parse(data)
            } catch (e) {
              console.warn('解析 SSE 数据失败:', data)
            }
          }
        }
      }
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    
    // 保留最后一行（可能不完整）
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        try {
          yield JSON.parse(data)
        } catch (e) {
          console.warn('解析 SSE 数据失败:', data)
        }
      }
    }
  }
}

/**
 * 生成简历（通过后端）- 支持 SSE 实时进度
 */
export async function generateResumeViaBackend(
  apiConfig: APIConfig,
  userPrompt: string,
  onProgress?: ProgressCallback,
  onReasoning?: ReasoningCallback
): Promise<{
  html: string
  reasoning: string
  elapsedTime: number
}> {
  // 先配置（如果 API Key 有变化）
  await configureBackend(apiConfig)
  
  const response = await fetch(`${API_BASE_URL}/generate-resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: DEFAULT_SESSION_ID,
      prompt: userPrompt
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '生成简历失败')
  }

  // 读取 SSE 流
  let finalResult: any = null
  
  for await (const event of parseSSEStream(response)) {
    if (event.type === 'progress' && onProgress) {
      // 进度更新
      onProgress({
        step: event.step,
        totalSteps: event.totalSteps,
        status: event.status,
        detail: event.detail
      })
    } else if (event.type === 'reasoning' && onReasoning) {
      // AI 思考过程（实时流式输出）
      onReasoning({
        content: event.content,
        fullReasoning: event.fullReasoning
      })
    } else if (event.type === 'complete') {
      // 完成
      finalResult = event
    } else if (event.type === 'error') {
      // 错误
      throw new Error(event.error || '生成简历失败')
    }
  }
  
  if (!finalResult) {
    throw new Error('未收到完整的响应')
  }
  
  return {
    html: finalResult.html,
    reasoning: finalResult.reasoning || '',
    elapsedTime: finalResult.elapsedTime || 0
  }
}

/**
 * 优化简历（通过后端）- 支持 SSE 实时进度
 */
export async function optimizeResumeViaBackend(
  apiConfig: APIConfig,
  userMessage: string,
  currentHtml: string,
  chatHistory: ChatMessage[],
  onProgress?: ProgressCallback,
  onReasoning?: ReasoningCallback
): Promise<{
  html: string
  content: string
  reasoning: string
  elapsedTime: number
}> {
  // 先配置（如果 API Key 有变化）
  await configureBackend(apiConfig)
  
  const response = await fetch(`${API_BASE_URL}/optimize-resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: DEFAULT_SESSION_ID,
      message: userMessage,
      currentHtml: currentHtml,
      chatHistory: chatHistory
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '优化简历失败')
  }

  
  // 读取 SSE 流
  let finalResult: any = null
  
  for await (const event of parseSSEStream(response)) {
    if (event.type === 'progress' && onProgress) {
      // 进度更新
      onProgress({
        step: event.step,
        totalSteps: event.totalSteps,
        status: event.status,
        detail: event.detail
      })
    } else if (event.type === 'reasoning' && onReasoning) {
      // AI 思考过程（实时流式输出）
      onReasoning({
        content: event.content,
        fullReasoning: event.fullReasoning
      })
    } else if (event.type === 'complete') {
      // 完成
      finalResult = event
    } else if (event.type === 'error') {
      // 错误
      throw new Error(event.error || '优化简历失败')
    }
  }
  
  if (!finalResult) {
    throw new Error('未收到完整的响应')
  }
  
  return {
    html: finalResult.html,
    content: finalResult.content || '',
    reasoning: finalResult.reasoning || '',
    elapsedTime: finalResult.elapsedTime || 0
  }
}

/**
 * 生成简历结构化数据（通过后端）- 支持 SSE 实时进度
 */
export async function generateResumeDataViaBackend(
  apiConfig: APIConfig,
  prompt: string,
  currentData: Partial<ResumeData>,
  onProgress?: ProgressCallback
): Promise<Partial<ResumeData>> {
  // 先配置（如果 API Key 有变化）
  await configureBackend(apiConfig)
  
  const response = await fetch(`${API_BASE_URL}/generate-resume-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: DEFAULT_SESSION_ID,
      prompt: prompt,
      currentData: currentData
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '生成简历数据失败')
  }

  // 读取 SSE 流
  let finalResult: any = null
  
  for await (const event of parseSSEStream(response)) {
    if (event.type === 'progress' && onProgress) {
      // 进度更新
      onProgress({
        step: event.step,
        totalSteps: event.totalSteps,
        status: event.status,
        detail: event.detail
      })
    } else if (event.type === 'complete') {
      // 完成
      finalResult = event
    } else if (event.type === 'error') {
      // 错误
      throw new Error(event.error || '生成简历数据失败')
    }
  }
  
  if (!finalResult) {
    throw new Error('未收到完整的响应')
  }
  
  return finalResult.data
}

/**
 * 检查后端健康状态
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`)
    return response.ok
  } catch {
    return false
  }
}

/**
 * 美化简历样式（通过后端）- 支持 SSE 实时进度
 */
export async function beautifyStyleViaBackend(
  apiConfig: APIConfig,
  currentHtml: string,
  onProgress?: ProgressCallback
): Promise<{
  html: string
  elapsedTime: number
}> {
  // 先配置（如果 API Key 有变化）
  await configureBackend(apiConfig)
  
  const response = await fetch(`${API_BASE_URL}/beautify-style`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: DEFAULT_SESSION_ID,
      html: currentHtml
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '美化样式失败')
  }

  // 读取 SSE 流
  let finalResult: any = null
  
  for await (const event of parseSSEStream(response)) {
    if (event.type === 'progress' && onProgress) {
      // 进度更新
      onProgress({
        step: event.step,
        totalSteps: event.totalSteps,
        status: event.status,
        detail: event.detail
      })
    } else if (event.type === 'complete') {
      // 完成
      finalResult = event
    } else if (event.type === 'error') {
      // 错误
      throw new Error(event.error || '美化样式失败')
    }
  }
  
  if (!finalResult) {
    throw new Error('未收到完整的响应')
  }
  
  return {
    html: finalResult.html,
    elapsedTime: finalResult.elapsedTime || 0
  }
}
