import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage, APIConfig } from '@/types/resume'
import { DEFAULT_API_CONFIG } from '@/config/modelProviders'

export const useChatStore = defineStore('chat', () => {
  // 对话消息历史
  const messages = ref<ChatMessage[]>([])
  
  // API 配置
  const apiConfig = ref<APIConfig>({ ...DEFAULT_API_CONFIG })
  
  // 加载状态
  const isLoading = ref(false)

  // 计算属性：是否已配置
  const isConfigured = computed(() => {
    return apiConfig.value.apiKey !== ''
  })

  // 配置 API（保存到本地存储）
  const configureAPI = (config: Partial<APIConfig>) => {
    apiConfig.value = { ...apiConfig.value, ...config }
    saveConfigToLocalStorage()
  }

  // 添加消息到历史
  const addMessage = (message: ChatMessage) => {
    messages.value.push(message)
    saveMessagesToLocalStorage()
  }

  // 清空对话历史
  const clearMessages = () => {
    messages.value = []
    localStorage.removeItem('chat-messages')
  }

  // 设置加载状态
  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  // 保存配置到本地存储
  const saveConfigToLocalStorage = () => {
    try {
      localStorage.setItem('chat-api-config', JSON.stringify(apiConfig.value))
    } catch (error) {
      console.error('Failed to save API config:', error)
    }
  }

  // 保存消息到本地存储
  const saveMessagesToLocalStorage = () => {
    try {
      localStorage.setItem('chat-messages', JSON.stringify(messages.value))
    } catch (error) {
      console.error('Failed to save messages:', error)
    }
  }

  // 从本地存储恢复配置
  const loadConfigFromLocalStorage = () => {
    try {
      const config = localStorage.getItem('chat-api-config')
      if (config) {
        apiConfig.value = { ...DEFAULT_API_CONFIG, ...JSON.parse(config) }
      }

      const messagesData = localStorage.getItem('chat-messages')
      if (messagesData) {
        messages.value = JSON.parse(messagesData)
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
  }

  return {
    messages,
    apiConfig,
    isLoading,
    isConfigured,
    configureAPI,
    addMessage,
    clearMessages,
    setLoading,
    saveConfigToLocalStorage,
    loadConfigFromLocalStorage
  }
})