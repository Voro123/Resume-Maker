<template>
  <div class="chat-panel">
    <!-- 未配置提示 -->
    <div v-if="!chatStore.isConfigured" class="not-configured">
      <div class="empty-state">
        <div class="empty-icon">
          <el-icon :size="48"><ChatDotRound /></el-icon>
        </div>
        <h3 class="empty-title">开始对话</h3>
        <p class="empty-desc">请先配置 API Key 以启用 AI 助手</p>
        <el-button type="primary" size="large" round @click="scrollToConfig">
          <el-icon><Setting /></el-icon>
          去配置
        </el-button>
      </div>
    </div>

    <!-- 已配置：对话区域 -->
  <div v-else class="chat-section">
      <!-- 头部信息 -->
      <div class="chat-header">
        <div class="header-left">
          <div class="header-info">
            <div class="status-dot"></div>
            <span class="model-name">{{ chatStore.apiConfig.model }}</span>
          </div>
        </div>
        
        <!-- 清空按钮 -->
        <div class="header-actions">
          <el-tooltip content="清空聊天记录" placement="top">
            <el-button 
              class="clear-btn" 
              type="text" 
              size="small" 
              :disabled="chatStore.messages.length === 0"
              @click="handleClearMessages"
            >
              <el-icon><Delete /></el-icon>
              <span>清空</span>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="message-list" ref="messageListRef">
        <!-- 空状态 -->
        <div v-if="chatStore.messages.length === 0 && !chatStore.isLoading" class="welcome-state">
          <div class="welcome-icon">
            <el-icon :size="40"><MagicStick /></el-icon>
          </div>
          <h4>我能帮你做什么？</h4>
          <div class="suggestion-list">
            <div 
              v-for="(item, index) in suggestions" 
              :key="index"
              class="suggestion-item"
              @click="handleSuggestion(item)"
            >
              <el-icon><ArrowRight /></el-icon>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        
        <!-- 消息项 -->
        <div
          v-for="msg in chatStore.messages"
          :key="msg.id"
          class="message-item"
          :class="msg.role"
        >
          <!-- 头像 -->
          <div class="message-avatar">
            <el-avatar v-if="msg.role === 'user'" :size="36" class="user-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <el-avatar v-else :size="36" class="ai-avatar">
              <el-icon><MagicStick /></el-icon>
            </el-avatar>
          </div>
          
          <!-- 消息内容 -->
          <div class="message-body">
            <div class="message-role">
              {{ msg.role === 'user' ? '你' : 'AI 助手' }}
            </div>
            
            <!-- 思考过程 -->
            <div v-if="msg.reasoning" class="reasoning-block">
              <el-collapse>
                <el-collapse-item name="1">
                  <template #title>
                    <span class="reasoning-title">
                      <el-icon><Tickets /></el-icon>
                      思考过程
                    </span>
                  </template>
                  <div class="reasoning-content">{{ msg.reasoning }}</div>
                </el-collapse-item>
              </el-collapse>
            </div>
            
            <!-- 消息文本 -->
            <div class="message-text">
              {{ msg.content }}
            </div>
            
            <div class="message-time">
              {{ formatTime(msg.timestamp) }}
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="chatStore.isLoading" class="loading-message">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>AI 正在思考...</span>
        </div>
        
        <!-- 接受/拒绝按钮 -->
        <div v-if="showAcceptButtons" class="accept-actions">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 12px;"
          >
            <template #title>
              AI 已更新简历，请查看预览区域。是否接受本次修改？
            </template>
          </el-alert>
          <div class="action-buttons">
            <el-button 
              type="success" 
              @click="handleAccept"
              size="default"
            >
              <el-icon><Check /></el-icon>
              接受修改
            </el-button>
            <el-button 
              type="danger" 
              @click="handleReject"
              size="default"
            >
              <el-icon><Close /></el-icon>
              拒绝修改（撤销）
            </el-button>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-section">
        <!-- 已选中的元素信息 -->
        <div v-if="selectedElements.length > 0" class="selected-elements">
          <div class="selected-elements-header">
            <el-icon><PriceTag /></el-icon>
            <span class="elements-label">已选中 {{ selectedElements.length }} 个元素：</span>
            <el-button 
              class="clear-all-btn" 
              type="text" 
              size="small" 
              @click="clearAllSelectedElements"
            >
              清空
            </el-button>
          </div>
          <div class="selected-elements-list">
            <div 
              v-for="(element, index) in selectedElements" 
              :key="index"
              class="selected-element-tag"
              @mouseenter="showElementHighlight(element.info)"
              @mouseleave="hideElementHighlight"
            >
              <span class="element-index">{{ index + 1 }}</span>
              <span class="element-info">{{ element.info }}</span>
              <el-icon class="close-icon" @click="removeSelectedElement(index)"><Close /></el-icon>
            </div>
          </div>
        </div>
        
        <div class="input-wrapper">
          <el-input
            v-model="userInput"
            type="textarea"
            :rows="3"
            placeholder="描述你的修改需求..."
            @keydown.ctrl.enter="handleSend"
            @keydown.enter.exact.prevent="handleSend"
          />
        </div>

        <!-- 快捷键提示 -->
        <div class="input-shortcut-hint">
          Enter 发送，Ctrl+Enter 换行
        </div>
        
        <!-- 输入底部操作栏 -->
        <div class="chat-input-actions">
          <!-- 左侧：工具按钮 -->
          <div class="input-tools">
            <el-tooltip content="AI定位：选择元素作为对话修改对象" placement="top" :show-after="300">
              <el-button
                class="tool-btn element-select-mode-trigger"
                :class="{ active: isSelectingElement }"
                @click="toggleElementSelector"
              >
                <el-icon><Aim /></el-icon>
              </el-button>
            </el-tooltip>
          </div>

          <!-- 右侧：发送按钮 -->
          <el-button 
            type="primary"
            class="send-btn"
            @click="handleSend"
            :loading="chatStore.isLoading"
            :disabled="!userInput.trim()"
          >
            <el-icon><Promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import {
  ChatDotRound, Setting, MagicStick,
  ArrowRight, User, InfoFilled, Promotion, Tickets,
  Aim, PriceTag, Close, Delete, Check
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import { useResumeStore } from '@/stores/resume'
import type { ChatMessage } from '@/types/resume'

const chatStore = useChatStore()
const resumeStore = useResumeStore()

// 表单数据
const userInput = ref('')
const messageListRef = ref<HTMLElement>()

// 元素选择相关
const isSelectingElement = ref(false)
const selectedElements = ref<Array<{info: string}>>([])  // 存储多个选中的元素

// 接受/拒绝按钮显示状态
const showAcceptButtons = ref(false)

// 建议列表
const suggestions = [
  '让工作经历更专业一些',
  '优化技能描述，突出亮点',
  '调整简历整体风格，更简洁',
  '帮我润色项目经验的表达'
]

// 滚动到配置区域
const scrollToConfig = () => {
  const leftPanel = document.querySelector('.editor-left')
  if (leftPanel?.classList.contains('collapsed')) {
    const collapseBtn = leftPanel.querySelector('.collapse-btn') as HTMLElement
    collapseBtn?.click()
  }
  
  const apiInput = document.querySelector('.api-config input') as HTMLElement
  if (apiInput) {
    apiInput.focus()
  }
}

// 点击建议
const handleSuggestion = (text: string) => {
  userInput.value = text
}

// 切换元素选择模式
const toggleElementSelector = () => {
  isSelectingElement.value = !isSelectingElement.value
  
  // 发送事件到预览组件
  window.dispatchEvent(new CustomEvent('resume-element-selector', {
    detail: { 
      active: isSelectingElement.value,
      // 进入选择模式时，传递已有的选中元素（用于恢复）
      existingElements: isSelectingElement.value ? selectedElements.value.map(el => el.info) : []
    }
  }))
}

// 清除所有选中的元素
const clearAllSelectedElements = () => {
  selectedElements.value = []
  // 通知 ResumePreview 清除所有选中蒙层
  window.dispatchEvent(new CustomEvent('resume-element-cleared'))
}

// 移除单个选中的元素
const removeSelectedElement = (index: number) => {
  selectedElements.value.splice(index, 1)
  // 通知 ResumePreview 重新更新蒙层
  window.dispatchEvent(new CustomEvent('resume-element-remove', {
    detail: { index }
  }))
}

// 鼠标悬浮时高亮对应的简历元素
const showElementHighlight = (elementInfo: string) => {
  if (!elementInfo) return
  window.dispatchEvent(new CustomEvent('resume-element-highlight', {
    detail: { elementInfo }
  }))
}

const hideElementHighlight = () => {
  window.dispatchEvent(new CustomEvent('resume-element-unhighlight'))
}

// 处理选中的元素
const handleElementSelected = (event: CustomEvent) => {
  const { elementInfo, allElements, isMultiSelect } = event.detail as {
    elementInfo: string
    allElements: string[]
    isMultiSelect: boolean
  }
  
  // 更新选中元素列表
  selectedElements.value = allElements.map((info: string) => ({ info }))
  
  if (isMultiSelect) {
    // 多选模式：不退出选择模式，显示提示
    ElMessage.success(`已选中 ${selectedElements.value.length} 个元素，可继续选择或点击"选择元素"按钮退出`)
  } else {
    // 单选模式：自动退出选择模式
    isSelectingElement.value = false
    ElMessage.success('已选中元素，请在输入框描述修改需求')
  }
}

// 发送消息
const handleSend = async () => {
  if (!userInput.value.trim()) {
    ElMessage.warning('请输入消息内容')
    return
  }

  if (chatStore.isLoading) {
    return
  }

  if (!resumeStore.isGenerated) {
    ElMessage.warning('请先生成简历')
    return
  }

  // 如果有选中的元素，将元素信息附加到消息中
  let message = userInput.value
  if (selectedElements.value.length > 0) {
    const elementsText = selectedElements.value
      .map((el, idx) => `${idx + 1}. ${el.info}`)
      .join('\n')
    message = message + '\n\n[修改目标] 已选中 ' + selectedElements.value.length + ' 个元素：\n' + elementsText
  }
  
  userInput.value = ''
  // 清空选中的元素
  selectedElements.value = []
  // 通知 ResumePreview 清除所有选中蒙层
  window.dispatchEvent(new CustomEvent('resume-element-cleared'))

  const userMsg: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  chatStore.addMessage(userMsg)
  chatStore.setLoading(true)

  try {
    const result = await resumeStore.optimizeResume(
      chatStore.apiConfig,
      message,
      chatStore.messages.slice(0, -1),
      (data) => {
        console.log('优化进度:', data.status)
      }
    )
    
    // 判断AI返回的是HTML还是文本
    const hasHtml = result.html && result.html.includes('<!DOCTYPE')
    const assistantContent = hasHtml 
      ? '简历已更新，请在中间预览区域查看最新效果 ✨'
      : (result.content || '简历优化完成，请查看中间预览区域')
    
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: assistantContent,
      reasoning: result.reasoning,
      timestamp: Date.now()
    }
    chatStore.addMessage(assistantMsg)

    ElMessage.success('简历已优化，请查看效果后选择是否接受')
    
    // 如果AI修改了简历，显示接受/拒绝按钮
    if (hasHtml && resumeStore.showAcceptButtons) {
      showAcceptButtons.value = true
    }
  } catch (error: any) {
    console.error('优化简历失败:', error)
    
    // 分析错误类型，给出更友好的提示
    let errorMsg = error.message || '优化失败'
    
    if (errorMsg.includes('不是有效的HTML代码')) {
      errorMsg = 'AI返回的内容格式异常，可能原因：\n1. AI模型响应异常\n2. 网络传输问题\n\n建议：请重新描述您的需求，或尝试刷新页面后重试'
    } else if (errorMsg.includes('fetch')) {
      errorMsg = '无法连接到后端服务，请确保后端服务器已启动 (python server.py)'
    } else if (errorMsg.includes('API错误')) {
      errorMsg = `AI API调用失败：${errorMsg}`
    }
    
    ElMessage.error(errorMsg)
    
    // 在聊天窗口中也显示错误消息
    const errorMsg2: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `抱歉，优化简历时出现错误：${errorMsg}\n\n请重新描述您的需求，或者尝试：\n1. 简化您的描述\n2. 刷新页面后重试\n3. 检查后端服务是否正常运行`,
      timestamp: Date.now()
    }
    chatStore.addMessage(errorMsg2)
  } finally {
    chatStore.setLoading(false)
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 滚动到最新消息
const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTo({
      top: messageListRef.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

// 监听消息变化
watch(() => chatStore.messages.length, scrollToBottom)
watch(() => chatStore.isLoading, scrollToBottom)

// 初始化
onMounted(() => {
  chatStore.loadConfigFromLocalStorage()
  window.addEventListener('resume-element-selected', handleElementSelected as EventListener)
  // 监听选择模式状态变化（来自 ResumePreview.vue 的完成/取消按钮）
  window.addEventListener('resume-element-selector', handleSelectorStateChange as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('resume-element-selected', handleElementSelected as EventListener)
  window.removeEventListener('resume-element-selector', handleSelectorStateChange as EventListener)
})

// 处理选择模式状态变化
const handleSelectorStateChange = (event: CustomEvent) => {
  isSelectingElement.value = event.detail.active
}

// 清空聊天记录
const handleClearMessages = () => {
  ElMessageBox.confirm(
    '确定要清空所有聊天记录吗？此操作不可恢复。',
    '清空聊天记录',
    {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(() => {
    chatStore.clearMessages()
    ElMessage.success('聊天记录已清空')
  }).catch(() => {
    // 用户取消操作
  })
}

// 接受AI的修改
const handleAccept = () => {
  resumeStore.acceptChanges()
  showAcceptButtons.value = false
}

// 拒绝AI的修改（撤销）
const handleReject = () => {
  resumeStore.rejectChanges()
  showAcceptButtons.value = false
}
</script>

<style scoped lang="scss">
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

// ==================== 未配置状态 ====================
.not-configured {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 40px 20px;
  
  .empty-state {
    text-align: center;
    max-width: 320px;
    
    .empty-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    }
    
    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 8px;
    }
    
    .empty-desc {
      font-size: 14px;
      color: #999;
      margin: 0 0 24px;
    }
  }
}

// ==================== 对话区域 ====================
.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 头部
.chat-header {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  
  .header-left {
    display: flex;
    align-items: center;
  }
  
  .header-info {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: #67c23a;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .model-name {
      font-size: 13px;
      font-weight: 500;
      color: #606266;
    }
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .clear-btn {
    color: #909399;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 6px;
    transition: all 0.2s;
    
    &:hover:not(:disabled) {
      color: #f56c6c;
      background: #fef0f0;
    }
    
    &:disabled {
      opacity: 0.5;
    }
    
    .el-icon {
      font-size: 14px;
    }
    
    span {
      font-size: 12px;
    }
  }
  
  .reset-btn {
    color: #909399;
    font-size: 12px;
    
    &:hover {
      color: #409eff;
    }
  }
}

// 消息列表
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 4px;
  }
}

// 欢迎状态
.welcome-state {
  text-align: center;
  padding: 30px 0;
  
  .welcome-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  
  h4 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 20px;
  }
  
  .suggestion-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 280px;
    margin: 0 auto;
    
    .suggestion-item {
      padding: 10px 16px;
      background: white;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      font-size: 13px;
      color: #606266;
      
      &:hover {
        border-color: #409eff;
        color: #409eff;
        background: #ecf5ff;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
      }
      
      .el-icon {
        font-size: 12px;
      }
    }
  }
}

// 消息项
.message-item {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  &.user {
    flex-direction: row-reverse;
    
    .message-body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 16px 16px 4px 16px;
    }
    
    .message-role {
      text-align: right;
    }
    
    .message-text {
      color: white;
    }
    
    .message-time {
      color: rgba(255, 255, 255, 0.7);
      text-align: right;
    }
    
    .user-avatar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  }
  
  &.assistant {
    .message-body {
      background: white;
      border-radius: 16px 16px 16px 4px;
    }
    
    .ai-avatar {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
  }
}

.message-avatar {
  flex-shrink: 0;
  
  .el-avatar {
    color: white;
  }
}

.message-body {
  max-width: 75%;
  padding: 12px 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
}

.message-role {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #909399;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  color: #303133;
}

.message-time {
  font-size: 11px;
  margin-top: 6px;
  color: #c0c4cc;
}

// 思考过程
.reasoning-block {
  margin-bottom: 8px;
  
  .reasoning-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #909399;
  }
  
  .reasoning-content {
    font-size: 12px;
    color: #909399;
    line-height: 1.6;
    max-height: 120px;
    overflow-y: auto;
    padding: 8px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 6px;
  }
  
  :deep(.el-collapse) {
    border: none;
  }
  
  :deep(.el-collapse-item__header) {
    height: auto;
    padding: 4px 0;
    font-size: 12px;
    background: transparent;
  }
  
  :deep(.el-collapse-item__content) {
    padding: 8px 0 0;
  }
}

// 接受/拒绝按钮区域
.accept-actions {
  margin-top: 16px;
  animation: slideUp 0.3s ease;
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .el-alert {
    border-radius: 8px;
    margin-bottom: 12px;
  }
  
  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    
    .el-button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 500;
      transition: all 0.3s;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .el-icon {
        font-size: 16px;
      }
    }
    
    .el-button--success {
      background: linear-gradient(135deg, #67c23a, #85ce61);
      border: none;
      
      &:hover {
        background: linear-gradient(135deg, #5daf34, #67c23a);
      }
    }
    
    .el-button--danger {
      background: linear-gradient(135deg, #f56c6c, #f78989);
      border: none;
      
      &:hover {
        background: linear-gradient(135deg, #e05555, #f56c6c);
      }
    }
  }
}

// 加载状态
.loading-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #909399;
  font-size: 13px;
  
  .typing-indicator {
    display: flex;
    gap: 4px;
    
    span {
      width: 6px;
      height: 6px;
      background: #909399;
      border-radius: 50%;
      animation: typing 1.4s infinite;
      
      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }
  
  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-6px);
      opacity: 1;
    }
  }
}

// ==================== 输入区域 ====================
.input-section {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

// 已选中的元素信息（多选支持）
.selected-elements {
  margin-bottom: 10px;
  animation: slideDown 0.3s ease;
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .selected-elements-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #e8f0fe;
    border: 1px solid #3884f4;
    border-radius: 8px 8px 0 0;
    font-size: 13px;
    color: #1a73e8;
    
    .el-icon {
      font-size: 14px;
    }
    
    .elements-label {
      font-weight: 500;
      flex: 1;
    }
    
    .clear-all-btn {
      color: #5f6368;
      font-size: 12px;
      padding: 0 4px;
      
      &:hover {
        color: #d93025;
      }
    }
  }
  
  .selected-elements-list {
    border: 1px solid #e4e7ed;
    border-top: none;
    border-radius: 0 0 8px 8px;
    max-height: 150px;
    overflow-y: auto;
    
    .selected-element-tag {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 12px;
      color: #303133;
      background: #f5f7fa;
      border-bottom: 1px solid #e4e7ed;
      cursor: pointer;
      transition: all 0.2s;
      
      &:last-child {
        border-bottom: none;
        border-radius: 0 0 8px 8px;
      }
      
      &:hover {
        background: #ecf5ff;
      }
      
      .element-index {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        background: #3884f4;
        color: white;
        border-radius: 50%;
        font-size: 10px;
        font-weight: bold;
        flex-shrink: 0;
      }
      
      .element-info {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .close-icon {
        cursor: pointer;
        color: #5f6368;
        transition: color 0.2s;
        flex-shrink: 0;
        
        &:hover {
          color: #d93025;
        }
      }
    }
  }
}

.input-wrapper {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 8px;
  transition: all 0.3s;
  
  &:focus-within {
    border-color: #409eff;
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
  }
  
  // 输入区域
  :deep(.el-textarea) {
    width: 100%;
  }
  
  :deep(.el-textarea__inner) {
    background: transparent;
    border: none !important;
    padding: 4px 8px;
    resize: none;
    font-size: 14px;
    line-height: 1.6;
    outline: none !important;
    box-shadow: none !important;
    
    &:focus, &:active {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
    
    &::placeholder {
      color: #c0c4cc;
    }
  }
}

.chat-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.input-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.input-shortcut-hint {
  margin-top: 6px;
  color: #a8abb2;
  font-size: 12px;
  text-align: right;
}

.tool-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 12px;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  transition: all 0.18s ease;

  .el-icon {
    font-size: 18px;
  }

  &:hover {
    color: #409eff;
    border-color: #409eff;
    background: #ecf5ff;
  }

  &.active {
    color: #ffffff;
    border-color: #409eff;
    background: #409eff;
    box-shadow: 0 4px 10px rgba(64, 158, 255, 0.25);
  }

  &.element-copy-mode-trigger.active {
    border-color: #7e57c2;
    background: #7e57c2;
    box-shadow: 0 4px 10px rgba(126, 87, 194, 0.25);
  }

  &.height-resize-mode-trigger.active {
    border-color: #67c23a;
    background: #67c23a;
    box-shadow: 0 4px 10px rgba(103, 194, 58, 0.25);
  }
}

.send-btn {
  height: 40px;
  min-width: 108px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;

  .el-icon {
    margin-right: 5px;
    font-size: 16px;
  }
  
  &:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
  }
  
  &:disabled {
    background: #a0cfff;
    border-color: #a0cfff;
  }
}

/* ==================== 响应式 ==================== */
@media (max-width: 520px) {
  .input-shortcut-hint {
    display: none;
  }
  
  .chat-input-actions {
    gap: 8px;
  }
  
  .tool-btn {
    width: 36px;
    height: 36px;
  }
  
  .send-btn {
    height: 36px;
    min-width: 80px;
    padding: 0 12px;
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .message-body {
    max-width: 85%;
  }
  
  .welcome-state {
    .suggestion-list {
      max-width: 100%;
    }
  }
}
</style>
