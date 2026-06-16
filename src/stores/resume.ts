import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { PromptTemplate, APIConfig, ChatMessage } from '@/types/resume'
import { useChatStore } from './chat'
import OpenAI from 'openai'
import {
  generateResumeViaBackend,
  optimizeResumeViaBackend,
  beautifyStyleViaBackend,
  checkBackendHealth,
  type ProgressCallback,
  type ReasoningCallback
} from '@/utils/backend-api'

// 是否使用后端代理（从环境变量读取，默认 true）
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND !== 'false'

export const useResumeStore = defineStore('resume', () => {
  // 生成的简历HTML
  const generatedHTML = ref<string>('')
  const generatedCSS = ref<string>('')
  const isGenerating = ref(false)
  
  // 撤销功能：保存优化前的HTML
  const previousHTML = ref<string>('')
  const showAcceptButtons = ref(false)  // 是否显示接受/拒绝按钮
  
  // 进度状态
  const currentStep = ref(0)
  const totalSteps = ref(0)
  const currentStatus = ref('')
  const currentDetail = ref('')
  
  // AI 思考过程
  const aiReasoning = ref('')
  const showReasoning = ref(false)
  
  // 当前使用的提示词
  const currentPrompt = ref<string>('')
  const selectedTemplate = ref<PromptTemplate | null>(null)
  
  // 简历元数据
  const resumeMeta = ref({
    title: '我的简历',
    lastModified: Date.now()
  })

  // 是否使用后端
  const useBackend = ref(USE_BACKEND)
  
  // 检查后端是否可用
  const checkBackend = async (): Promise<boolean> => {
    if (!useBackend.value) return false
    return await checkBackendHealth()
  }

  // 是否已完成生成
  const isGenerated = computed(() => {
    return generatedHTML.value !== ''
  })
  
  // 是否有可撤销的操作
  const canUndo = computed(() => {
    return previousHTML.value !== ''
  })
  
  // 进度回调函数
  const handleProgress: ProgressCallback = (data) => {
    currentStep.value = data.step
    totalSteps.value = data.totalSteps
    currentStatus.value = data.status
    currentDetail.value = data.detail || ''
  }
  
  // AI 思考过程回调
  const handleReasoning: ReasoningCallback = (data) => {
    aiReasoning.value = data.fullReasoning
    showReasoning.value = true
  }

  // 生成简历
  const generateResume = async (apiConfig: APIConfig, userPrompt: string, onProgress?: ProgressCallback) => {
    if (!apiConfig.apiKey) {
      throw new Error('请先配置 API Key')
    }

    isGenerating.value = true
    currentPrompt.value = userPrompt
    // 重置进度 - 设置初始状态
    currentStep.value = 0
    totalSteps.value = 3  // 预设总步骤数
    currentStatus.value = '正在初始化...'
    currentDetail.value = '准备调用 AI 生成简历'

    try {
      // 如果使用后端代理
      if (useBackend.value) {
        const result = await generateResumeViaBackend(
          apiConfig, 
          userPrompt, 
          onProgress || handleProgress,
          handleReasoning
        )
        
        generatedHTML.value = result.html
        resumeMeta.value.lastModified = Date.now()
        
        // 保存到本地存储
        saveToLocalStorage()
        
        // 生成成功后清除聊天记录
        const chatStore = useChatStore()
        chatStore.clearMessages()
        
        return {
          html: generatedHTML.value,
          reasoning: result.reasoning || '',
          elapsedTime: result.elapsedTime
        }
      }
      
      // 否则直接使用前端调用（原有逻辑）
      const client = new OpenAI({
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.baseURL,
        dangerouslyAllowBrowser: true
      })

      const response = await (client as any).chat.completions.create({
        model: apiConfig.model,
        messages: [
        {
            role: 'system',
            content: `你是一个专业的简历生成助手。根据用户的提示词，生成完整的、可直接打印的简历 HTML 代码。

硬性要求：
1. 只输出 HTML 代码，不要输出解释文字、Markdown 代码块。
2. 必须包含完整 HTML 结构和内联 CSS。
3. 页面尺寸为 A4：210mm × 297mm，主容器宽度固定为 794px，最小高度 1123px。
4. 所有元素必须使用 box-sizing: border-box。
5. 不要使用会导致内容错位的负 margin、transform translate、position absolute 叠放正文。
6. 头像区域必须使用固定宽高容器，内部图片或文字必须水平垂直居中；如果没有真实图片，用文字头像时也必须居中，不得超出边框。
7. 列表必须使用 ul/li 的标准结构，ul 设置 padding-left: 18px 到 24px，li 设置 line-height，不允许圆点和文字重叠。
8. 如果使用自定义圆点，不要使用 list-style 和 ::before 同时生成双圆点；自定义圆点必须为 li 文本预留至少 16px 左侧空间。
9. 时间线圆点、列表圆点、正文文本不能重叠。
10. 避免分页截断，尽量让模块高度紧凑。`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        extra_body: { reasoning_split: true }
      })

      const content = response.choices[0].message.content || ''
      
      // 提取HTML代码（可能需要从markdown代码块中提取）
      const htmlMatch = content.match(/```html\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/) ||
                      content.match(/<!DOCTYPE[\s\S]*<\/html>/)
      
      const html = htmlMatch ? (htmlMatch[1] || htmlMatch[0]) : content
      
      generatedHTML.value = html
      resumeMeta.value.lastModified = Date.now()
      
      // 保存到本地存储
      saveToLocalStorage()
      
      return {
        html: generatedHTML.value,
        reasoning: response.choices[0].message.reasoning_details?.[0]?.text || ''
      }
    } catch (error: any) {
      console.error('生成简历失败:', error)
      // 强制使用后端，禁用前端直接调用（避免API Key暴露）
      if (useBackend.value && error.message?.includes('fetch')) {
        throw new Error('无法连接到后端服务，请确保后端服务器已启动 (python server.py)')
      }
      throw new Error(`生成简历失败: ${error.message}`)
    } finally {
      isGenerating.value = false
    }
  }

  // 优化简历（通过对话）
  const optimizeResume = async (
    apiConfig: APIConfig,
    userMessage: string,
    chatHistory: ChatMessage[],
    onProgress?: ProgressCallback
  ) => {
    if (!apiConfig.apiKey) {
      throw new Error('请先配置 API Key')
    }

    isGenerating.value = true
    // 重置进度 - 设置初始状态
    currentStep.value = 0
    totalSteps.value = 3  // 预设总步骤数
    currentStatus.value = '正在初始化...'
    currentDetail.value = '准备调用 AI 优化简历'

    try {
      // 如果使用后端代理
      if (useBackend.value) {
        // 保存优化前的HTML（用于撤销）
        previousHTML.value = generatedHTML.value
        showAcceptButtons.value = true  // 显示接受/拒绝按钮
        
        const result = await optimizeResumeViaBackend(
          apiConfig,
          userMessage,
          generatedHTML.value,
          chatHistory,
          onProgress,
          handleReasoning
        )
        
        // 调试：打印AI返回的内容（前500字符）
        console.log('AI返回的内容预览:', result.html?.substring(0, 500))
        console.log('AI返回的完整内容长度:', result.html?.length)
        
        // 验证返回的内容是否是有效的HTML（更宽松的验证）
        let htmlContent = result.html || ''
        
        // 去除可能的空白字符
        htmlContent = htmlContent.trim()
        
        // 尝试自动修复常见的AI输出问题
        // 问题1：AI可能在HTML前后添加了解释文字
        if (htmlContent && !htmlContent.startsWith('<!DOCTYPE') && !htmlContent.startsWith('<html')) {
          // 尝试找到HTML开始的位置
          const doctypeIndex = htmlContent.indexOf('<!DOCTYPE')
          const htmlIndex = htmlContent.indexOf('<html')
          
          if (doctypeIndex >= 0) {
            logger.info(`发现HTML前有${doctypeIndex}个字符的解释文字，自动去除`)
            htmlContent = htmlContent.substring(doctypeIndex)
          } else if (htmlIndex >= 0) {
            logger.info(`发现HTML前有${htmlIndex}个字符的解释文字，自动去除`)
            htmlContent = htmlContent.substring(htmlIndex)
          }
        }
        
        // 问题2：AI可能添加了代码块标记
        if (htmlContent.startsWith('```')) {
          logger.info('发现代码块标记，自动去除')
          htmlContent = htmlContent.replace(/^```(html)?\n?/g, '').replace(/\n?```$/g, '')
          htmlContent = htmlContent.trim()
        }
        
        // 问题3：AI可能在HTML结束后添加了多余内容
        const htmlEndIndex = htmlContent.lastIndexOf('</html>')
        if (htmlEndIndex >= 0 && htmlEndIndex < htmlContent.length - 7) {
          logger.info(`发现HTML后有${htmlContent.length - htmlEndIndex - 7}个字符的多余内容，自动去除`)
          htmlContent = htmlContent.substring(0, htmlEndIndex + 7)
        }
        
        // 检查是否包含HTML特征
        const hasDoctype = htmlContent.includes('<!DOCTYPE')
        const hasHtmlTag = htmlContent.includes('<html')
        const hasHeadTag = htmlContent.includes('<head')
        const hasBodyTag = htmlContent.includes('<body')
        
        // 更宽松的验证：只要包含HTML相关标签就认为有效
        const hasValidHtml = htmlContent.length > 0 && 
          (hasDoctype || hasHtmlTag || hasHeadTag || hasBodyTag)
        
        console.log('HTML验证结果:', {
          hasDoctype,
          hasHtmlTag,
          hasHeadTag,
          hasBodyTag,
          hasValidHtml,
          firstChars: htmlContent.substring(0, 100),
          lastChars: htmlContent.substring(htmlContent.length - 100)
        })
        
        if (hasValidHtml) {
          // 更新生成的HTML
          generatedHTML.value = htmlContent
          resumeMeta.value.lastModified = Date.now()
          
          // 保存到本地存储
          saveToLocalStorage()
          
          return {
            html: generatedHTML.value,
            reasoning: result.reasoning || '',
            content: result.content || '',
            elapsedTime: result.elapsedTime
          }
        } else {
          // 如果返回的不是有效HTML，抛出详细的错误
          const preview = htmlContent.substring(0, 500)
          console.error('AI返回的内容不是有效的HTML。完整内容:', htmlContent)
          console.error('AI返回的原始content:', result.content)
          
          // 在开发模式下，提供更多信息
          const isDev = import.meta.env.DEV
          let errorMsg = `AI返回的内容不是有效的HTML代码。`
          
          if (isDev) {
            errorMsg += `\n\n调试信息：\n`
            errorMsg += `HTML长度: ${htmlContent.length}\n`
            errorMsg += `Content长度: ${result.content?.length || 0}\n`
            errorMsg += `HTML预览: ${preview}\n`
            errorMsg += `\n请查看浏览器控制台和后端的日志以获取更多信息。`
          } else {
            errorMsg += `请重新描述您的需求，或者尝试刷新页面后重试。`
          }
          
          throw new Error(errorMsg)
        }
      }
      
      // 否则直接使用前端调用（原有逻辑）
      const client = new OpenAI({
        apiKey: apiConfig.apiKey,
        baseURL: apiConfig.baseURL,
        dangerouslyAllowBrowser: true
      })

      // 构造消息历史
      const messages: any[] = [
        {
          role: 'system',
          content: `你是一个专业的简历优化助手。当前的简历HTML代码如下：\n\n${generatedHTML.value}\n\n根据用户的需求，修改简历HTML代码。要求：1) 直接输出修改后的完整HTML代码；2) 保持原有的设计风格；3) 确保HTML语法正确。不要添加任何解释文字。`
        },
        ...chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ]

      const response = await (client as any).chat.completions.create({
        model: apiConfig.model,
        messages,
        extra_body: { reasoning_split: true }
      })

      const content = response.choices[0].message.content || ''
      
      // 提取HTML代码
      const htmlMatch = content.match(/```html\n?([\s\S]*?)\n?```/) || 
                      content.match(/```\n?([\s\S]*?)\n?```/) ||
                      content.match(/<!DOCTYPE[\s\S]*<\/html>/)
      
      const html = htmlMatch ? (htmlMatch[1] || htmlMatch[0]) : content
      
      // 更新生成的HTML
      generatedHTML.value = html
      resumeMeta.value.lastModified = Date.now()
      
      // 保存到本地存储
      saveToLocalStorage()
      
      return {
        html: generatedHTML.value,
        reasoning: response.choices[0].message.reasoning_details?.[0]?.text || '',
        content: content
      }
    } catch (error: any) {
      console.error('优化简历失败:', error)
      // 强制使用后端，禁用前端直接调用（避免API Key暴露）
      if (useBackend.value && error.message?.includes('fetch')) {
        throw new Error('无法连接到后端服务，请确保后端服务器已启动 (python server.py)')
      }
      throw new Error(`优化简历失败: ${error.message}`)
    } finally {
      isGenerating.value = false
    }
  }

  // 美化简历样式
  const beautifyStyle = async (
    apiConfig: APIConfig,
    onProgress?: ProgressCallback
  ) => {
    if (!apiConfig.apiKey) {
      throw new Error('请先配置 API Key')
    }

    if (!generatedHTML.value) {
      throw new Error('请先生成简历')
    }

    isGenerating.value = true
    // 重置进度
    currentStep.value = 0
    totalSteps.value = 2
    currentStatus.value = '正在初始化...'
    currentDetail.value = '准备调用 AI 美化样式'

    try {
      // 如果使用后端代理
      if (useBackend.value) {
        const result = await beautifyStyleViaBackend(
          apiConfig,
          generatedHTML.value,
          onProgress || handleProgress
        )
        
        // 更新生成的HTML
        generatedHTML.value = result.html
        resumeMeta.value.lastModified = Date.now()
        
        // 保存到本地存储
        saveToLocalStorage()
        
        return {
          html: generatedHTML.value,
          elapsedTime: result.elapsedTime
        }
      }
      
      // 否则直接使用前端调用（需要调用后端API）
      throw new Error('美化样式功能需要后端支持，请启用后端模式')
      
    } catch (error: any) {
      console.error('美化样式失败:', error)
      throw new Error(`美化样式失败: ${error.message}`)
    } finally {
      isGenerating.value = false
    }
  }

  // 保存生成的HTML到本地存储
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem('generated-resume-html', generatedHTML.value)
      localStorage.setItem('resume-meta', JSON.stringify(resumeMeta.value))
      localStorage.setItem('current-prompt', currentPrompt.value)
      localStorage.setItem('use-backend', useBackend.value.toString())
    } catch (error) {
      console.error('保存到本地存储失败:', error)
    }
  }

  // 从本地存储恢复
  const loadFromLocalStorage = () => {
    try {
      const html = localStorage.getItem('generated-resume-html')
      const meta = localStorage.getItem('resume-meta')
      const prompt = localStorage.getItem('current-prompt')
      const backend = localStorage.getItem('use-backend')
      
      if (html) {
        generatedHTML.value = html
      }
      
      if (meta) {
        resumeMeta.value = JSON.parse(meta)
      }
      
      if (prompt) {
        currentPrompt.value = prompt
      }
      
      if (backend !== null) {
        useBackend.value = backend === 'true'
      }
    } catch (error) {
      console.error('从本地存储恢复失败:', error)
    }
  }

  // 清空生成的简历
  const clearResume = () => {
    generatedHTML.value = ''
    generatedCSS.value = ''
    currentPrompt.value = ''
    resumeMeta.value = {
      title: '我的简历',
      lastModified: Date.now()
    }
    localStorage.removeItem('generated-resume-html')
    localStorage.removeItem('resume-meta')
    localStorage.removeItem('current-prompt')
  }

  // 更新标题
  const updateTitle = (title: string) => {
    resumeMeta.value.title = title
    resumeMeta.value.lastModified = Date.now()
    saveToLocalStorage()
  }
  
  // 更新生成的HTML（用于支持直接编辑）
  const updateGeneratedHTML = (html: string) => {
    generatedHTML.value = html
    resumeMeta.value.lastModified = Date.now()
    saveToLocalStorage()
  }
  
  // 接受AI的修改
  const acceptChanges = () => {
    previousHTML.value = ''
    showAcceptButtons.value = false
    ElMessage.success('已接受AI的修改')
  }
  
  // 拒绝AI的修改（撤销）
  const rejectChanges = () => {
    if (previousHTML.value) {
      generatedHTML.value = previousHTML.value
      previousHTML.value = ''
      showAcceptButtons.value = false
      resumeMeta.value.lastModified = Date.now()
      saveToLocalStorage()
      ElMessage.success('已撤销AI的修改')
    }
  }
  
  // 切换后端模式
  const toggleBackend = (enabled: boolean) => {
    useBackend.value = enabled
    saveToLocalStorage()
  }

  return {
    generatedHTML,
    generatedCSS,
    isGenerating,
    currentStep,
    totalSteps,
    currentStatus,
    currentDetail,
    currentPrompt,
    selectedTemplate,
    resumeMeta,
    isGenerated,
    useBackend,
    // 撤销功能
    previousHTML,
    showAcceptButtons,
    canUndo,
    // AI 思考过程
    aiReasoning,
    showReasoning,
    checkBackend,
    generateResume,
    optimizeResume,
    beautifyStyle,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearResume,
    updateTitle,
    updateGeneratedHTML,
    acceptChanges,
    rejectChanges,
    toggleBackend
  }
})
