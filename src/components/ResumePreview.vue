<template>
  <div class="resume-preview" ref="previewRef">
    <!-- 加载状态 -->
    <div v-if="resumeStore.isGenerating" class="loading-state">
      <el-icon class="is-loading" :size="50"><Loading /></el-icon>
      
      <!-- 当前状态 -->
      <p class="loading-status">{{ resumeStore.currentStatus || 'AI 正在处理，请稍候...' }}</p>
      
      <!-- 详细说明 -->
      <p v-if="resumeStore.currentDetail" class="loading-detail">{{ resumeStore.currentDetail }}</p>
      
      <!-- 简化的进度提示 -->
      <p class="loading-tip">
        <el-icon><InfoFilled /></el-icon>
        AI 正在思考中，请耐心等待...
      </p>
      
      <!-- AI 思考过程（可展开） -->
      <div v-if="resumeStore.showReasoning && resumeStore.aiReasoning" class="reasoning-panel">
        <div class="reasoning-header" @click="toggleReasoningExpanded">
          <el-icon :class="{ 'is-rotate': isReasoningExpanded }"><ArrowDown /></el-icon>
          <span>AI 思考过程</span>
          <span class="reasoning-status">{{ isReasoningExpanded ? '点击收起' : '点击展开' }}</span>
        </div>
        <div v-if="isReasoningExpanded" class="reasoning-content">
          <pre>{{ resumeStore.aiReasoning }}</pre>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!resumeStore.generatedHTML" class="empty-state">
      <el-empty description="请在左侧选择提示词模板或输入自定义提示词，然后点击「生成简历」">
        <template #image>
          <el-icon :size="100" color="#c0c4cc"><Document /></el-icon>
        </template>
      </el-empty>
    </div>

    <!-- 简历预览 - 流式布局 + 分页线 -->
    <div v-else class="resume-preview-wrapper">
      <!-- 编辑提示 -->
      <div class="edit-tip" v-if="showEditTip && !isSelectMode">
        <el-icon><Edit /></el-icon>
        <span>提示：点击简历中的任意文本即可直接编辑</span>
        <el-button text size="small" @click="showEditTip = false">关闭</el-button>
      </div>
      
      <!-- 元素选择模式提示 -->
      <div class="select-tip" v-if="isSelectMode">
        <el-icon><Aim /></el-icon>
        <span>元素选择模式 - 点击选择/取消元素，Ctrl+点击多选</span>
        <el-button text size="small" @click="cancelSelectMode">取消</el-button>
        <el-button type="primary" size="small" @click="finishSelectMode">完成</el-button>
      </div>
      
      <!-- 简历内容显示 -->
      <div 
        class="resume-content" 
        v-html="resumeStore.generatedHTML" 
        ref="resumeContentRef"
        :class="{ 'select-mode': isSelectMode }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { 
  Loading, 
  Document, 
  InfoFilled,
  ArrowDown,
  Edit,
  Aim
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useResumeStore } from '@/stores/resume'

const resumeStore = useResumeStore()
const previewRef = ref<HTMLElement>()
const resumeContentRef = ref<HTMLElement>()
const showEditTip = ref(true)

// 元素选择模式
const isSelectMode = ref(false)
const hoveredElement = ref<HTMLElement | null>(null)
const overlayElement = ref<HTMLElement | null>(null)  // 蒙层元素
const selectedElements = ref<Array<{element: HTMLElement, info: string}>>([])  // 存储多个选中的元素

// 创建多个蒙层（每个选中元素一个）
const selectedOverlays = ref<HTMLElement[]>([])

// 高度调整相关状态（用于 undo/redo）
const heightResizeTarget = ref<HTMLElement | null>(null)
const heightResizeOverlay = ref<HTMLElement | null>(null)

// 常态点击聚焦元素操作：复制 / 删除 / 调高
const elementActionTarget = ref<HTMLElement | null>(null)
const elementActionOverlay = ref<HTMLElement | null>(null)
const elementActionFocusOverlay = ref<HTMLElement | null>(null)
const elementResizeHandleOverlay = ref<HTMLElement | null>(null)

// undo/redo 状态
type HeightResizeHistoryItem = {
  elementPath: number[]
  beforeHeight: string
  beforeMinHeight: string
  afterHeight: string
  afterMinHeight: string
}

const heightResizeUndoStack = ref<HeightResizeHistoryItem[]>([])
const heightResizeRedoStack = ref<HeightResizeHistoryItem[]>([])

let isResizingHeight = false
let resizeStartY = 0
let resizeStartHeight = 0
let resizeBeforeHeight = ''
let resizeBeforeMinHeight = ''

// 防止一次点击被重复处理的锁
let selectingLock = false

// ==================== 高度调整模式 - 元素路径工具函数 ====================

// 获取元素路径（用于 undo/redo 后重新找到之前调整过的元素）
const getElementPath = (el: HTMLElement): number[] => {
  const path: number[] = []
  let current: HTMLElement | null = el

  while (current && current !== resumeContentRef.value) {
    const parent = current.parentElement
    if (!parent) break

    const index = Array.from(parent.children).indexOf(current)
    path.unshift(index)

    current = parent
  }

  return path
}

// 根据路径找到元素
const findElementByPath = (path: number[]): HTMLElement | null => {
  let current: Element | null = resumeContentRef.value || null

  for (const index of path) {
    if (!current || !current.children[index]) {
      return null
    }

    current = current.children[index]
  }

  return current as HTMLElement | null
}

// 应用历史记录
const applyHeightResizeHistoryItem = (
  item: HeightResizeHistoryItem,
  direction: 'undo' | 'redo'
) => {
  const target = findElementByPath(item.elementPath)

  if (!target) {
    ElMessage.warning('找不到上次调整的元素，无法恢复')
    return
  }

  if (direction === 'undo') {
    target.style.height = item.beforeHeight
    target.style.minHeight = item.beforeMinHeight
  } else {
    target.style.height = item.afterHeight
    target.style.minHeight = item.afterMinHeight
  }

  // 如果当前聚焦的元素就是要调整的元素，更新聚焦框和工具条
  if (elementActionTarget.value === target) {
    showElementActionFocusOverlay(target)
    showElementActionOverlay(target)
    if (elementResizeHandleOverlay.value) {
      showElementResizeHandleOverlay(target)
    }
  }

  saveEditedHTML()
  addPageBreaks()
}

// undo 函数
const undoHeightResize = () => {
  const item = heightResizeUndoStack.value.pop()

  if (!item) {
    return
  }

  applyHeightResizeHistoryItem(item, 'undo')
  heightResizeRedoStack.value.push(item)
}

// redo 函数
const redoHeightResize = () => {
  const item = heightResizeRedoStack.value.pop()

  if (!item) {
    return
  }

  applyHeightResizeHistoryItem(item, 'redo')
  heightResizeUndoStack.value.push(item)
}

// 判断是否为可编辑的键盘目标（输入框、textarea、contenteditable）
const isEditableKeyboardTarget = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  if (!el) return false

  const tagName = el.tagName?.toLowerCase()

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    el.isContentEditable ||
    Boolean(el.closest('[contenteditable="true"]'))
  )
}

// 处理高度调整快捷键（Ctrl+Z / Ctrl+Y）
const handleHeightResizeKeydown = (e: KeyboardEvent) => {
  if (isEditableKeyboardTarget(e.target)) return

  const key = e.key.toLowerCase()

  if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
    if (heightResizeUndoStack.value.length === 0) return

    e.preventDefault()
    e.stopPropagation()
    undoHeightResize()
    return
  }

  if (
    ((e.ctrlKey || e.metaKey) && key === 'y') ||
    ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'z')
  ) {
    if (heightResizeRedoStack.value.length === 0) return

    e.preventDefault()
    e.stopPropagation()
    redoHeightResize()
  }
}

// 创建或获取蒙层元素（用于悬浮高亮）
const getOrCreateOverlay = (): HTMLElement => {
  if (overlayElement.value) {
    return overlayElement.value
  }
  
  const overlay = document.createElement('div')
  overlay.className = 'element-select-overlay'
  overlay.style.position = 'fixed'
  overlay.style.backgroundColor = 'rgba(56, 132, 244, 0.12)'
  overlay.style.outline = '2px solid rgba(56, 132, 244, 0.6)'
  overlay.style.outlineOffset = '-1px'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '9999'
  overlay.style.transition = 'all 0.15s ease'
  overlay.style.borderRadius = '2px'
  
  document.body.appendChild(overlay)
  overlayElement.value = overlay
  
  return overlay
}

// ==================== 高度调整模式相关函数 ====================

// 判断元素是否适合拖拽调整高度
const isHeightResizableElement = (el: HTMLElement): boolean => {
  const tagName = el.tagName.toLowerCase()
  const nonResizableTags = [
    'span',
    'strong',
    'em',
    'a',
    'p',
    'li',
    'ul',
    'ol',
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
    'br',
    'hr'
  ]

  if (nonResizableTags.includes(tagName)) {
    return false
  }

  if (tagName === 'img') {
    return true
  }

  const rect = el.getBoundingClientRect()
  if (rect.height < 24 || rect.width < 40) {
    return false
  }

  const display = window.getComputedStyle(el).display
  return ['block', 'flex', 'grid', 'inline-block'].includes(display)
}

// 向上查找合适的可调整高度元素
const findHeightResizableElement = (el: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = el

  while (current && current !== resumeContentRef.value) {
    if (isHeightResizableElement(current)) {
      return current
    }

    current = current.parentElement
  }

  return null
}

// 开始拖拽调整高度
const startHeightResize = (e: MouseEvent) => {
  const target = elementActionTarget.value

  if (!target || !resumeContentRef.value?.contains(target)) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  removeElementResizeHandleOverlay()

  isResizingHeight = true
  resizeStartY = e.clientY
  resizeStartHeight = target.getBoundingClientRect().height

  // 记录调整前的状态
  resizeBeforeHeight = target.style.height || ''
  resizeBeforeMinHeight = target.style.minHeight || ''

  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'

  window.addEventListener('mousemove', handleHeightResizeMove)
  window.addEventListener('mouseup', stopHeightResize)
}

// 拖拽过程中实时调整高度
const handleHeightResizeMove = (e: MouseEvent) => {
  const target = elementActionTarget.value

  if (!isResizingHeight || !target) return

  const deltaY = e.clientY - resizeStartY
  const nextHeight = Math.max(24, Math.round(resizeStartHeight + deltaY))

  target.style.height = `${nextHeight}px`
  target.style.minHeight = `${nextHeight}px`

  showElementActionFocusOverlay(target)
  showElementActionOverlay(target)
  showElementResizeHandleOverlay(target)
}

// 停止拖拽并保存
const stopHeightResize = () => {
  if (!isResizingHeight) return

  const target = elementActionTarget.value

  isResizingHeight = false

  window.removeEventListener('mousemove', handleHeightResizeMove)
  window.removeEventListener('mouseup', stopHeightResize)

  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  if (target) {
    const afterHeight = target.style.height || ''
    const afterMinHeight = target.style.minHeight || ''

    // 如果高度有变化，入栈历史记录
    if (
      afterHeight !== resizeBeforeHeight ||
      afterMinHeight !== resizeBeforeMinHeight
    ) {
      heightResizeUndoStack.value.push({
        elementPath: getElementPath(target),
        beforeHeight: resizeBeforeHeight,
        beforeMinHeight: resizeBeforeMinHeight,
        afterHeight,
        afterMinHeight
      })

      // 一旦产生新操作，redo 历史必须清空
      heightResizeRedoStack.value = []
    }

    // 保存修改后的 HTML
    saveEditedHTML()

    // 高度变化后重新计算分页线
    addPageBreaks()

    // 重新显示 overlay
    showElementActionFocusOverlay(target)
    showElementActionOverlay(target)
    showElementResizeHandleOverlay(target)
  }

  // 清空 before 状态
  resizeBeforeHeight = ''
  resizeBeforeMinHeight = ''
}

// ==================== 常态点击聚焦元素操作：复制 / 删除 / 调高 ====================

const shouldSuppressElementActions = () => {
  return (
    isSelectMode.value ||
    isResizingHeight ||
    resumeStore.isGenerating ||
    !resumeStore.generatedHTML
  )
}

// ==================== 点击聚焦逻辑 ====================

const handleElementActionClick = (e: MouseEvent) => {
  if (shouldSuppressElementActions()) {
    removeElementActionOverlay()
    removeElementActionFocusOverlay()
    elementActionTarget.value = null
    return
  }

  const rawTarget = e.target as HTMLElement

  // 点击工具条本身，不重新选择元素
  if (rawTarget.closest('.element-action-toolbar')) {
    return
  }

  // 避免和动态 overlay 互相干扰
  if (
    rawTarget.closest('.element-select-overlay') ||
    rawTarget.closest('.element-selected-overlay')
  ) {
    return
  }

  if (rawTarget === resumeContentRef.value) {
    clearElementActionFocus()
    return
  }

  const target = findSelectableElement(rawTarget)

  if (!target || target === resumeContentRef.value) {
    clearElementActionFocus()
    return
  }

  elementActionTarget.value = target
  removeElementResizeHandleOverlay()
  showElementActionFocusOverlay(target)
  showElementActionOverlay(target)
}

const handleElementActionGlobalClick = (e: MouseEvent) => {
  if (!elementActionTarget.value) return

  const target = e.target as HTMLElement | null
  if (!target) return

  // 点击工具条，不关闭
  if (target.closest('.element-action-toolbar')) {
    return
  }

  // 点击简历内部，让 handleElementActionClick 重新选择或清理
  if (resumeContentRef.value?.contains(target)) {
    return
  }

  clearElementActionFocus()
}

const handleElementActionKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return

  clearElementActionFocus()
}

// ==================== 聚焦框和工具条 ====================

const clearElementActionFocus = () => {
  removeElementActionOverlay()
  removeElementActionFocusOverlay()
  elementActionTarget.value = null
}

const removeElementActionFocusOverlay = () => {
  if (elementActionFocusOverlay.value) {
    elementActionFocusOverlay.value.remove()
    elementActionFocusOverlay.value = null
  }
}

const showElementActionFocusOverlay = (target: HTMLElement) => {
  const rect = target.getBoundingClientRect()

  let overlay = elementActionFocusOverlay.value

  if (!overlay) {
    overlay = document.createElement('div')
    overlay.className = 'element-action-focus-overlay'
    overlay.style.position = 'fixed'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '10010'
    overlay.style.borderRadius = '3px'
    overlay.style.backgroundColor = 'rgba(64, 158, 255, 0.08)'
    overlay.style.outline = '2px solid rgba(64, 158, 255, 0.75)'
    overlay.style.outlineOffset = '-1px'
    overlay.style.transition = 'all 0.12s ease'
    document.body.appendChild(overlay)

    elementActionFocusOverlay.value = overlay
  }

  overlay.style.top = `${rect.top}px`
  overlay.style.left = `${rect.left}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
  overlay.style.display = 'block'
}

const removeElementActionOverlay = () => {
  if (elementActionOverlay.value) {
    elementActionOverlay.value.remove()
    elementActionOverlay.value = null
  }
}

const showElementActionOverlay = (target: HTMLElement) => {
  const rect = target.getBoundingClientRect()

  let overlay = elementActionOverlay.value

  if (!overlay) {
    overlay = document.createElement('div')
    overlay.className = 'element-action-toolbar'
    overlay.style.position = 'fixed'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.gap = '4px'
    overlay.style.padding = '4px'
    overlay.style.borderRadius = '10px'
    overlay.style.background = 'rgba(17, 24, 39, 0.92)'
    overlay.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.18)'
    overlay.style.zIndex = '10030'
    overlay.style.pointerEvents = 'auto'

  const copyBtn = createElementActionButton('复制', 'copy', handleCopyActionClick)
  const resizeBtn = createElementActionButton('调高', 'resize', handleStartResizeActionClick)
  const deleteBtn = createElementActionButton('删除', 'delete', handleDeleteActionClick, true)

    overlay.appendChild(copyBtn)
    overlay.appendChild(resizeBtn)
    overlay.appendChild(deleteBtn)

    document.body.appendChild(overlay)
    elementActionOverlay.value = overlay
  }

  const overlayWidth = 108
  const overlayHeight = 32

  let top = rect.top - overlayHeight - 6
  let left = rect.right - overlayWidth

  if (top < 4) {
    top = rect.top + 6
  }

  if (left < 4) {
    left = rect.left
  }

  const maxLeft = window.innerWidth - overlayWidth - 4
  if (left > maxLeft) {
    left = maxLeft
  }

  overlay.style.top = `${top}px`
  overlay.style.left = `${left}px`
  overlay.style.display = 'flex'
}

const createElementActionButton = (
  title: string,
  iconType: string,
  handler: (e: MouseEvent) => void,
  danger = false
): HTMLButtonElement => {
  const button = document.createElement('button')
  button.type = 'button'
  button.title = title
  button.className = danger ? 'element-action-btn is-danger' : 'element-action-btn'

  // SVG 图标定义
  const svgIcons: Record<string, string> = {
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    resize: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"></polyline><polyline points="7 13 12 18 17 13"></polyline></svg>',
    delete: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  }

  button.innerHTML = svgIcons[iconType] || ''
  button.style.width = '28px'
  button.style.height = '28px'
  button.style.border = 'none'
  button.style.borderRadius = '7px'
  button.style.display = 'flex'
  button.style.alignItems = 'center'
  button.style.justifyContent = 'center'
  button.style.cursor = 'pointer'
  button.style.color = danger ? '#fecaca' : '#dbeafe'
  button.style.background = 'transparent'

  button.addEventListener('mouseenter', () => {
    button.style.background = danger ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.22)'
  })

  button.addEventListener('mouseleave', () => {
    button.style.background = 'transparent'
  })

  button.addEventListener('click', handler)

  return button
}

// ==================== 复制/删除操作 ====================

const handleCopyActionClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const target = elementActionTarget.value

  if (!target || !resumeContentRef.value?.contains(target)) {
    return
  }

  const cloned = copyElementAfterSelf(target)

  if (cloned) {
    elementActionTarget.value = cloned

    requestAnimationFrame(() => {
      showElementActionFocusOverlay(cloned)
      showElementActionOverlay(cloned)
    })
  }
}

const copyElementAfterSelf = (target: HTMLElement): HTMLElement | null => {
  const parent = target.parentElement

  if (!parent) {
    ElMessage.warning('无法复制该元素')
    return null
  }

  const cloned = target.cloneNode(true) as HTMLElement

  // 避免复制编辑态/选择态
  cloned.classList.remove('editing', 'select-mode')
  cloned.querySelectorAll('.page-break-line').forEach(el => el.remove())

  // 避免 id 重复
  cloned.removeAttribute('id')
  cloned.querySelectorAll('[id]').forEach((el) => {
    el.removeAttribute('id')
  })

  target.insertAdjacentElement('afterend', cloned)

  saveEditedHTML()
  addPageBreaks()

  ElMessage.success('已复制元素')

  return cloned
}

const handleDeleteActionClick = async (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const target = elementActionTarget.value

  if (!target || !resumeContentRef.value?.contains(target)) {
    return
  }

  if (!canDeleteElement(target)) {
    ElMessage.warning('不能删除整个简历容器')
    return
  }

  target.remove()

  clearElementActionFocus()

  saveEditedHTML()
  addPageBreaks()

  ElMessage.success('已删除元素')
}

const canDeleteElement = (target: HTMLElement) => {
  if (!resumeContentRef.value) return false
  if (target === resumeContentRef.value) return false
  if (target.classList.contains('resume-container')) return false
  if (target.closest('.page-break-line')) return false

  return true
}

// ==================== 调高操作 ====================

const handleStartResizeActionClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  const target = elementActionTarget.value

  if (!target || !resumeContentRef.value?.contains(target)) {
    return
  }

  if (!isHeightResizableElement(target)) {
    ElMessage.warning('该元素不适合调整高度，请选择外层模块或图片')
    return
  }

  showElementResizeHandleOverlay(target)
}

const removeElementResizeHandleOverlay = () => {
  if (elementResizeHandleOverlay.value) {
    elementResizeHandleOverlay.value.remove()
    elementResizeHandleOverlay.value = null
  }
}

const showElementResizeHandleOverlay = (target: HTMLElement) => {
  const rect = target.getBoundingClientRect()

  let overlay = elementResizeHandleOverlay.value

  if (!overlay) {
    overlay = document.createElement('div')
    overlay.className = 'element-resize-handle-overlay'
    overlay.style.position = 'fixed'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '10025'
    overlay.style.borderRadius = '3px'
    overlay.style.backgroundColor = 'rgba(103, 194, 58, 0.06)'
    overlay.style.outline = '2px solid #67c23a'
    overlay.style.outlineOffset = '-1px'

    const handle = document.createElement('div')
    handle.className = 'element-resize-height-handle'
    handle.title = '拖拽调整高度'
    handle.style.position = 'absolute'
    handle.style.left = '50%'
    handle.style.bottom = '-7px'
    handle.style.transform = 'translateX(-50%)'
    handle.style.width = '56px'
    handle.style.height = '12px'
    handle.style.borderRadius = '999px'
    handle.style.background = '#67c23a'
    handle.style.cursor = 'ns-resize'
    handle.style.pointerEvents = 'auto'
    handle.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)'

    handle.addEventListener('mousedown', startHeightResize)

    overlay.appendChild(handle)
    document.body.appendChild(overlay)
    elementResizeHandleOverlay.value = overlay
  }

  overlay.style.top = `${rect.top}px`
  overlay.style.left = `${rect.left}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
  overlay.style.display = 'block'
}

// ==================== 滚动和监听管理 ====================

const handleElementActionScroll = () => {
  if (!elementActionTarget.value || shouldSuppressElementActions()) {
    clearElementActionFocus()
    return
  }

  showElementActionFocusOverlay(elementActionTarget.value)
  showElementActionOverlay(elementActionTarget.value)

  if (elementResizeHandleOverlay.value) {
    showElementResizeHandleOverlay(elementActionTarget.value)
  }
}

const setupElementActionFocusListeners = () => {
  if (!resumeContentRef.value) return

  resumeContentRef.value.removeEventListener('click', handleElementActionClick, true)

  resumeContentRef.value.addEventListener('click', handleElementActionClick, true)

  document.removeEventListener('click', handleElementActionGlobalClick, true)
  document.addEventListener('click', handleElementActionGlobalClick, true)

  window.removeEventListener('scroll', handleElementActionScroll, true)
  window.addEventListener('scroll', handleElementActionScroll, true)

  window.removeEventListener('keydown', handleElementActionKeydown, true)
  window.addEventListener('keydown', handleElementActionKeydown, true)
  
  window.removeEventListener('keydown', handleHeightResizeKeydown, true)
  window.addEventListener('keydown', handleHeightResizeKeydown, true)
}

const cleanupElementActionFocus = () => {
  if (resumeContentRef.value) {
    resumeContentRef.value.removeEventListener('click', handleElementActionClick, true)
  }

  document.removeEventListener('click', handleElementActionGlobalClick, true)
  window.removeEventListener('scroll', handleElementActionScroll, true)
  window.removeEventListener('keydown', handleElementActionKeydown, true)
  window.removeEventListener('keydown', handleHeightResizeKeydown, true)

  removeElementActionOverlay()
  removeElementActionFocusOverlay()
  removeElementResizeHandleOverlay()
  elementActionTarget.value = null
}

// 创建选中元素的蒙层（蓝色实心，用于标记已选中的元素）
const createSelectedOverlay = (_element: HTMLElement, index: number): HTMLElement => {
  const overlay = document.createElement('div')
  overlay.className = 'element-selected-overlay'
  overlay.setAttribute('data-index', index.toString())
  overlay.style.position = 'fixed'
  overlay.style.backgroundColor = 'rgba(56, 132, 244, 0.2)'  // 更明显的选中颜色
  overlay.style.outline = '2px solid #3884f4'
  overlay.style.outlineOffset = '-1px'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '9998'  // 比悬浮蒙层低一点
  overlay.style.borderRadius = '2px'
  
  // 添加序号标签
  const label = document.createElement('div')
  label.style.position = 'absolute'
  label.style.top = '-20px'
  label.style.left = '0'
  label.style.background = '#3884f4'
  label.style.color = 'white'
  label.style.padding = '2px 6px'
  label.style.borderRadius = '3px'
  label.style.fontSize = '11px'
  label.style.fontWeight = 'bold'
  label.style.whiteSpace = 'nowrap'
  label.textContent = (index + 1).toString()
  overlay.appendChild(label)
  
  document.body.appendChild(overlay)
  selectedOverlays.value.push(overlay)
  
  return overlay
}

// 更新所有选中元素的蒙层位置
const updateSelectedOverlays = () => {
  selectedElements.value.forEach((item, index) => {
    let overlay = selectedOverlays.value[index]
    if (!overlay) {
      overlay = createSelectedOverlay(item.element, index)
    }
    
    const rect = item.element.getBoundingClientRect()
    overlay.style.top = `${rect.top}px`
    overlay.style.left = `${rect.left}px`
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`
    overlay.style.display = 'block'
  })
}

// 更新蒙层位置（跟随元素）
const updateOverlayPosition = (target: HTMLElement) => {
  const overlay = getOrCreateOverlay()
  
  // 获取元素的位置和尺寸（使用 getBoundingClientRect 获取视口相对位置）
  const rect = target.getBoundingClientRect()
  
  // 设置蒙层位置和尺寸（使用 fixed 定位，直接用视口坐标）
  overlay.style.top = `${rect.top}px`
  overlay.style.left = `${rect.left}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
  overlay.style.display = 'block'
}

// 隐藏蒙层
const hideOverlay = () => {
  if (overlayElement.value) {
    overlayElement.value.style.display = 'none'
  }
}

// 思考过程面板展开/收起
const isReasoningExpanded = ref(false)

// 切换思考过程面板的展开/收起
const toggleReasoningExpanded = () => {
  isReasoningExpanded.value = !isReasoningExpanded.value
}

// 获取预览元素（供父组件调用）
const getPreviewElement = () => {
  return resumeContentRef.value?.querySelector('.resume-container') as HTMLElement
}

// 暴露方法供父组件调用
defineExpose({
  getPreviewElement
})

// 监听生成的HTML变化
watch(() => resumeStore.generatedHTML, () => {
  nextTick(() => {
    addPageBreaks()
    setupContentEditableListeners()
    setupElementActionFocusListeners()
    if (!isSelectMode.value) {
      setupSelectModeListeners()
    }
  })
})

// 设置元素选择模式监听
const setupSelectModeListeners = () => {
  if (!resumeContentRef.value) return
  
  const contentEl = resumeContentRef.value
  
  // 防止 generatedHTML 更新后重复绑定事件
  contentEl.removeEventListener('mousemove', handleMouseMove)
  contentEl.removeEventListener('mouseleave', handleMouseLeave)
  contentEl.removeEventListener('click', handleElementClick)
  
  // 鼠标移动时高亮元素
  contentEl.addEventListener('mousemove', handleMouseMove)
  contentEl.addEventListener('mouseleave', handleMouseLeave)
  
  // 点击事件
  contentEl.addEventListener('click', handleElementClick)
}

// 智能查找可选中的元素（向上遍历，找到合适的元素）
const findSelectableElement = (el: HTMLElement): HTMLElement => {
  // 如果元素就是内容容器本身，返回 null
  if (el === resumeContentRef.value) return el
  
  // 向上遍历，找到有实际文本内容或合适的元素
  let current: HTMLElement | null = el
  
  while (current && current !== resumeContentRef.value) {
    const tagName = current.tagName.toLowerCase()
    const textContent = current.textContent?.trim() || ''
    const rect = current.getBoundingClientRect()
    
    // 如果是这些标签，直接返回（它们通常是用户想要选择的元素）
    const directSelectTags = ['h1', 'h2', 'h3', 'h4', 'p', 'li', 'td', 'th', 'a', 'strong', 'em', 'span']
    if (directSelectTags.includes(tagName)) {
      // 但对于 span，如果有父元素有实际内容，优先选择父元素
      if (tagName === 'span' && textContent.length < 20) {
        const parent: HTMLElement | null = current.parentElement
        if (parent && parent !== resumeContentRef.value) {
          const parentText = parent.textContent?.trim() || ''
          // 如果父元素文本不长，选择父元素
          if (parentText.length < 100) {
            current = parent
            continue
          }
        }
      }
      return current
    }
    
    
    // 如果是 div，检查是否只是布局容器（没有自己独特的文本，只是包裹其他元素）
    if (tagName === 'div') {
      const hasDirectText = Array.from(current.childNodes).some(node => 
        node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      )
      
      // 如果 div 有直接文本内容，或者是合适的尺寸，返回它
      if (hasDirectText || (rect.height < 200 && textContent.length > 0)) {
        return current
      }
      
      // 否则继续向上找
      current = current.parentElement
      continue
    }
    
    // 其他情况，继续向上找
    current = current.parentElement
  }
  
  return el // 如果没找到合适的，返回原始元素
}

// 处理鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  if (!isSelectMode.value) return
  
  const target = e.target as HTMLElement
  if (target === resumeContentRef.value) {
    hideOverlay()
    return
  }
  
  // 智能查找最合适的可选元素
  const selectableElement = findSelectableElement(target)
  
  // 更新蒙层位置，覆盖在目标元素上
  updateOverlayPosition(selectableElement)
  hoveredElement.value = selectableElement
  
  // 阻止事件冒泡
  e.stopPropagation()
}

// 处理鼠标离开
const handleMouseLeave = () => {
  if (!isSelectMode.value) return
  hideOverlay()
}

// 处理元素点击
const handleElementClick = (e: MouseEvent) => {
  if (!isSelectMode.value) return
  
  // 防止一次点击被重复处理（例如事件重复绑定、冒泡等）
  if (selectingLock) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  
  selectingLock = true
  
  try {
    e.preventDefault()
    e.stopPropagation()
    
    // 如果点击的是容器本身（没选中具体元素），则取消选择模式
    if (target === resumeContentRef.value) {
      exitSelectMode()
      window.dispatchEvent(new CustomEvent('resume-element-selector', {
        detail: { active: false }
      }))
      return
    }
    
    // 智能查找最合适的可选元素（确保多次点击同一区域能选中同一个元素）
    const selectableElement = findSelectableElement(target)
    
    // 获取元素信息
    const elementInfo = getElementInfo(selectableElement)
    
    // 检查是否按住了 Ctrl 键（多选）
    const isCtrlClick = e.ctrlKey || e.metaKey
    
    if (isCtrlClick) {
      // Ctrl+点击：切换当前元素的选中状态
      const existingIndex = selectedElements.value.findIndex(item => item.element === selectableElement)
      
      if (existingIndex >= 0) {
        // 如果已经选中，取消选中
        selectedElements.value.splice(existingIndex, 1)
        // 移除对应的蒙层
        if (selectedOverlays.value[existingIndex]) {
          selectedOverlays.value[existingIndex].remove()
          selectedOverlays.value.splice(existingIndex, 1)
        }
        // 重新编号剩余的蒙层
        reindexSelectedOverlays()
      } else {
        // 如果未选中，添加到多选列表
        selectedElements.value.push({ element: selectableElement, info: elementInfo })
        // 创建蒙层
        createSelectedOverlay(selectableElement, selectedElements.value.length - 1)
      }
    } else {
      // 普通点击：只选中当前元素
      clearAllSelectedOverlays()
      selectedElements.value = [{ element: selectableElement, info: elementInfo }]
      // 创建蒙层
      createSelectedOverlay(selectableElement, 0)
      
      // 普通点击后自动退出选择模式（单选模式）
      exitSelectMode()
      
      // 通知 ChatPanel 更新选择状态并退出选择模式
      window.dispatchEvent(new CustomEvent('resume-element-selected', {
        detail: { 
          elementInfo: elementInfo,
          allElements: [elementInfo],
          isMultiSelect: false
        }
      }))
      
      // 通知 ChatPanel 退出选择模式
      window.dispatchEvent(new CustomEvent('resume-element-selector', {
        detail: { active: false }
      }))
      
      // 注意：提示信息由 ChatPanel.vue 监听 resume-element-selected 事件后显示
      // 避免两个组件都显示提示
      return  // 单选模式直接返回，不执行后面的发送逻辑
    }
    
    // Ctrl+点击（多选模式）：发送选中事件，不自动退出
    const allElementInfos = selectedElements.value.map(item => item.info)
    window.dispatchEvent(new CustomEvent('resume-element-selected', {
      detail: { 
        elementInfo: elementInfo,
        allElements: allElementInfos,
        isMultiSelect: true
      }
    }))
  } finally {
    // 使用 setTimeout 确保在当前调用栈完成后释放锁
    window.setTimeout(() => {
      selectingLock = false
    }, 0)
  }
}

// 重新编号选中蒙层的标签
const reindexSelectedOverlays = () => {
  selectedOverlays.value.forEach((overlay, index) => {
    const label = overlay.querySelector('div')
    if (label) {
      label.textContent = (index + 1).toString()
    }
    overlay.setAttribute('data-index', index.toString())
  })
}

// 清除所有选中蒙层
const clearAllSelectedOverlays = () => {
  selectedOverlays.value.forEach(overlay => {
    overlay.remove()
  })
  selectedOverlays.value = []
  selectedElements.value = []
}

// 获取元素信息（人类可读格式）
const getElementInfo = (el: HTMLElement): string => {
  const tagName = el.tagName.toLowerCase()
  
  // 获取元素类型的中文描述
  const tagNames: Record<string, string> = {
    'h1': '标题1',
    'h2': '标题2',
    'h3': '标题3',
    'h4': '标题4',
    'p': '段落',
    'span': '文本',
    'div': '区块',
    'li': '列表项',
    'td': '单元格',
    'th': '表头',
    'a': '链接',
    'strong': '加粗文本',
    'em': '斜体文本'
  }
  
  const tagLabel = tagNames[tagName] || tagName
  
  // 获取元素的文本内容（截断）
  let text = el.textContent?.trim() || ''
  if (text.length > 30) {
    text = text.substring(0, 30) + '...'
  }
  
  // 如果有文本，显示为 "标题1: 工作经历"
  // 如果没有文本，只显示元素类型
  if (text) {
    return `${tagLabel}: ${text}`
  }
  
  return tagLabel
}

// 进入选择模式
const enterSelectMode = () => {
  // 清空复制/删除聚焦
  clearElementActionFocus()

  isSelectMode.value = true
  document.body.style.cursor = 'crosshair'
  
  // 添加全局样式
  const style = document.createElement('style')
  style.id = 'select-mode-style'
  style.textContent = `
    .resume-content.select-mode * {
      cursor: pointer !important;
    }
  `
  document.head.appendChild(style)
  
  // 监听滚动事件，更新蒙层位置
  window.addEventListener('scroll', handleScroll, true)
}

// 处理滚动
const handleScroll = () => {
  if (!isSelectMode.value) return
  
  // 如果当前有悬浮元素，更新蒙层位置
  if (hoveredElement.value) {
    updateOverlayPosition(hoveredElement.value)
  }
  
  // 同时更新所有选中元素的蒙层位置
  updateSelectedOverlays()
}

// 退出选择模式
const exitSelectMode = () => {
  if (isResizingHeight) return

  isSelectMode.value = false
  document.body.style.cursor = ''
  
  // 移除滚动监听
  window.removeEventListener('scroll', handleScroll, true)
  
  // 移除悬浮蒙层（保留选中蒙层）
  if (overlayElement.value) {
    overlayElement.value.remove()
    overlayElement.value = null
  }
  
  hoveredElement.value = null
  
  // 移除全局样式
  const style = document.getElementById('select-mode-style')
  if (style) {
    style.remove()
  }
}

// 高亮指定元素（用于悬浮在已选中标签上时）
const highlightTargetElement = (elementInfo: string) => {
  if (!resumeContentRef.value) return
  
  // 遍历所有元素，找到匹配的元素
  const allElements = resumeContentRef.value.querySelectorAll('*')
  allElements.forEach(el => {
    const info = getElementInfo(el as HTMLElement)
    if (info === elementInfo) {
      // 使用蒙层覆盖元素
      updateOverlayPosition(el as HTMLElement)
      hoveredElement.value = el as HTMLElement
    }
  })
}

// 取消高亮
const unhighlightElement = () => {
  hideOverlay()
  hoveredElement.value = null
}

// 取消选择模式
const cancelSelectMode = () => {
  exitSelectMode()
  
  // 清除所有选中的元素
  clearAllSelectedOverlays()
  
  // 通知ChatPanel
  window.dispatchEvent(new CustomEvent('resume-element-selector', {
    detail: { active: false }
  }))
}

// 完成选择模式（保留已选中的元素）
const finishSelectMode = () => {
  exitSelectMode()
  
  // 通知ChatPanel更新选择状态
  window.dispatchEvent(new CustomEvent('resume-element-selector', {
    detail: { active: false }
  }))
  
  ElMessage.success(`已完成选择，共选中 ${selectedElements.value.length} 个元素`)
}

// 监听选择模式事件
const handleSelectorEvent = (event: CustomEvent) => {
  if (event.detail.active) {
    enterSelectMode()
    
    // 恢复已有的选中元素（从 ChatPanel 传递过来）
    const existingElements = event.detail.existingElements || []
    if (existingElements.length > 0 && resumeStore.generatedHTML) {
      // 等待 nextTick 确保 DOM 已更新
      nextTick(() => {
        restoreSelectedElements(existingElements)
      })
    }
  } else {
    exitSelectMode()
  }
}

// 恢复选中的元素（从 ChatPanel 传递的 elementInfo 列表）
const restoreSelectedElements = (elementInfos: string[]) => {
  if (!resumeStore.generatedHTML) return
  
  // 先清空当前选择
  clearAllSelectedOverlays()
  selectedElements.value = []
  
  // 遍历所有可点击元素，找到匹配的并恢复选中状态
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = resumeStore.generatedHTML
  
  const allElements = document.querySelectorAll('.resume-content.select-mode *')
  
  elementInfos.forEach((info, index) => {
    // 根据 elementInfo 找到对应的 DOM 元素
    // elementInfo 格式：标签名: 文本内容
    const match = info.match(/^([^:]+):\s*(.*)$/)
    if (!match) return
    
    const [, tagLabel, text] = match
    
    allElements.forEach((el) => {
      const elInfo = getElementInfo(el as HTMLElement)
      if (elInfo === info) {
        // 找到匹配的元素，恢复选中状态
        selectedElements.value.push({
          element: el as HTMLElement,
          info: elInfo
        })
        createSelectedOverlay(el as HTMLElement, index)
      }
    })
  })
}

// 初始化
onMounted(() => {
  resumeStore.loadFromLocalStorage()
  if (resumeStore.generatedHTML) {
    nextTick(() => {
      addPageBreaks()
      setupContentEditableListeners()
      setupElementActionFocusListeners()
    })
  }
  
  // 监听元素选择器事件
  window.addEventListener('resume-element-selector', handleSelectorEvent as EventListener)
  
  // 监听元素选中事件（用于多选时移除单个元素）
  window.addEventListener('resume-element-remove', ((e: Event) => {
    const customEvent = e as CustomEvent
    const { index } = customEvent.detail
    // 移除指定索引的选中元素
    if (selectedElements.value[index]) {
      selectedElements.value.splice(index, 1)
      if (selectedOverlays.value[index]) {
        selectedOverlays.value[index].remove()
        selectedOverlays.value.splice(index, 1)
      }
      reindexSelectedOverlays()
    }
  }) as EventListener)
  
  // 监听清除所有选中元素的事件
  window.addEventListener('resume-element-cleared', (() => {
    clearAllSelectedOverlays()
  }) as EventListener)
  
  // 监听高亮/取消高亮事件
  window.addEventListener('resume-element-highlight', ((e: Event) => {
    const customEvent = e as CustomEvent
    highlightTargetElement(customEvent.detail.elementInfo)
  }) as EventListener)
  
  window.addEventListener('resume-element-unhighlight', (() => {
    unhighlightElement()
  }) as EventListener)
  
  // 设置常态点击聚焦操作监听
  setupElementActionFocusListeners()
})

onUnmounted(() => {
  // 清理常态点击聚焦操作
  cleanupElementActionFocus()
  
  // 移除 resumeContentRef 上的事件监听，避免组件销毁后残留
  if (resumeContentRef.value) {
    resumeContentRef.value.removeEventListener('mousemove', handleMouseMove)
    resumeContentRef.value.removeEventListener('mouseleave', handleMouseLeave)
    resumeContentRef.value.removeEventListener('click', handleElementClick)
  }
  
  // 移除事件监听
  window.removeEventListener('resume-element-selector', handleSelectorEvent as EventListener)
  window.removeEventListener('resume-element-highlight', ((e: Event) => {
    const customEvent = e as CustomEvent
    highlightTargetElement(customEvent.detail.elementInfo)
  }) as EventListener)
  window.removeEventListener('resume-element-unhighlight', (() => {
    unhighlightElement()
  }) as EventListener)
  
  // 移除滚动监听
  window.removeEventListener('scroll', handleScroll, true)
  
  // 确保移除所有蒙层
  clearAllSelectedOverlays()
  if (overlayElement.value) {
    overlayElement.value.remove()
    overlayElement.value = null
  }
  
  // 确保退出选择模式
  if (isSelectMode.value) {
    exitSelectMode()
  }
})

// 设置可编辑元素的监听器
const setupContentEditableListeners = () => {
  if (!resumeContentRef.value) return
  
  // 使用事件委托监听输入事件
  resumeContentRef.value.addEventListener('input', (e) => {
    const target = e.target as HTMLElement
    if (target.hasAttribute('contenteditable')) {
      // 延迟保存，避免频繁更新
      debounceSaveHTML()
    }
  })
  
  // 监听焦点事件，显示编辑状态
  resumeContentRef.value.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement
    if (target.hasAttribute('contenteditable')) {
      target.classList.add('editing')
    }
  })
  
  resumeContentRef.value.addEventListener('focusout', (e) => {
    const target = e.target as HTMLElement
    if (target.hasAttribute('contenteditable')) {
      target.classList.remove('editing')
    }
  })
}

// 防抖保存HTML
let saveTimer: number | null = null
const debounceSaveHTML = () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  
  saveTimer = window.setTimeout(() => {
    saveEditedHTML()
  }, 500) // 500ms 防抖
}

// 保存编辑后的HTML
const saveEditedHTML = () => {
  if (!resumeContentRef.value) return
  
  // 获取编辑后的HTML
  const editedHTML = resumeContentRef.value.innerHTML
  
  // 更新store
  resumeStore.updateGeneratedHTML(editedHTML)
  
  console.log('简历内容已自动保存')
}

// 添加分页线标记
const addPageBreaks = () => {
  nextTick(() => {
    const container = document.querySelector('.resume-content .resume-container') as HTMLElement
    if (!container) return

    // 移除已有的分页线
    container.querySelectorAll('.page-break-line').forEach(el => el.remove())

    // 确保分页线以 resume-container 为定位上下文
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative'
    }

    // 和 .resume-container 的 A4 预览尺寸保持一致：
    // 210mm * 96 / 25.4 ≈ 794px
    // 297mm * 96 / 25.4 ≈ 1123px
    const A4_HEIGHT = 1123
    const containerHeight = container.scrollHeight
    const totalPages = Math.ceil(containerHeight / A4_HEIGHT)

    if (totalPages <= 1) return

    const createPageBreakLine = (pageIndex: number) => {
      const line = document.createElement('div')
      line.className = 'page-break-line'
      line.style.position = 'absolute'
      line.style.top = `${A4_HEIGHT * pageIndex}px`
      line.style.left = '0'
      line.style.right = '0'
      line.style.height = '3px'
      line.style.zIndex = '100'
      line.style.pointerEvents = 'none'

      line.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: repeating-linear-gradient(90deg, #f56c6c 0px, #f56c6c 8px, transparent 8px, transparent 12px); box-shadow: 0 1px 3px rgba(245, 108, 108, 0.3);"></div>
          <span style="position: absolute; right: 20px; top: 8px; background: linear-gradient(135deg, #f56c6c, #f78989); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">第 ${pageIndex} 页结束 - 以下内容将在第 ${pageIndex + 1} 页显示</span>
        </div>
      `

      container.appendChild(line)
    }

    for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
      createPageBreakLine(pageIndex)
    }
  })
}
</script>

<style scoped lang="scss">
// ==================== 全局样式（用于动态创建的元素） ====================
:global(.height-resize-handle:hover) {
  transform: translateX(-50%) scale(1.08) !important;
  background: #85ce61 !important;
}

:global(.height-resize-overlay) {
  transition: all 0.15s ease;
}

// ==================== 设计令牌 (Design Tokens) ====================
$color-primary: #409eff;
$color-primary-light: #ecf5ff;
$color-success: #67c23a;
$color-warning: #e6a23c;
$color-danger: #f56c6c;
$color-info: #909399;

$color-bg-main: #f0f2f5;
$color-bg-card: #ffffff;
$color-text-primary: #303133;
$color-text-regular: #606266;
$color-text-secondary: #909399;
$color-border: #dcdfe6;

$shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
$shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
$shadow-xl: 0 12px 36px rgba(0, 0, 0, 0.15);

$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;

$transition-fast: 0.2s ease;
$transition-normal: 0.3s ease;

// ==================== 主容器 ====================
.resume-preview {
  width: 100%;
  height: 100%;  // 改为 100%，填充父容器
  background: $color-bg-main;
  overflow-y: auto;
  padding: 24px;
  
  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c0c4cc;
    border-radius: 3px;
    
    &:hover {
      background: #909399;
    }
  }
}

// ==================== 简历预览包装器 ====================
.resume-preview-wrapper {
  width: fit-content;
  max-width: none;
  margin: 0 auto;
  animation: fadeInUp 0.5s ease;
}

// 工具模式提示条
.tool-mode-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  border: 1px solid transparent;

  .el-icon {
    font-size: 14px;
  }

  &.is-select {
    color: #1d4ed8;
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  &.is-copy {
    color: #6d28d9;
    background: #f5f3ff;
    border-color: #ddd6fe;
  }

  &.is-resize {
    color: #15803d;
    background: #f0fdf4;
    border-color: #bbf7d0;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ==================== 简历内容区域 ====================
.resume-content {
  width: fit-content;
  max-width: none;
  background: transparent;
  // 默认有圆角和阴影（编辑模式）
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  overflow: visible;
  position: relative;
  
  // 导出 PDF 模式：去除圆角、阴影和内边距
  .exporting-pdf & {
    border-radius: 0;
    box-shadow: none;
    padding: 0;
    background: transparent;
  }
  
  // 深度选择器：修改简历内容的样式
  :deep(*) {
    box-sizing: border-box;
  }

  // 防止 AI 生成的图片撑破容器
  :deep(img) {
    max-width: 100%;
    height: auto;
  }

  :deep(.resume-container) {
    width: 794px;
    min-height: 1123px;
    background: white;
    box-sizing: border-box;
    position: relative;
    box-shadow: $shadow-md;
    
    // 分页线标记（由JavaScript动态创建）
    // 使用内联样式，这里只提供基础样式
  }
}

// ==================== 加载状态 ====================
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  color: $color-text-secondary;
  padding: 60px 20px;
  
  .el-icon {
    color: $color-primary;
    animation: rotate 1.5s linear infinite;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .loading-status {
    font-size: 22px;
    font-weight: 600;
    color: $color-text-primary;
    margin-top: 30px;
    text-align: center;
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  
  .loading-detail {
    font-size: 15px;
    color: $color-text-regular;
    margin-top: 16px;
    text-align: center;
    max-width: 600px;
    line-height: 1.6;
  }
  
  .loading-tip {
    font-size: 14px;
    color: $color-text-secondary;
    margin-top: 40px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: $color-primary-light;
    border-radius: 30px;
    border: 1px solid rgba($color-primary, 0.2);
    
    .el-icon {
      animation: none;
      color: $color-primary;
    }
  }
}

// ==================== 空状态 ====================
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;
  
  :deep(.el-empty__description) {
    color: $color-text-secondary;
    font-size: 15px;
    margin-top: 20px;
  }
  
  :deep(.el-icon) {
    color: #c0c4cc;
    animation: float 3s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
}

// ==================== AI 思考过程面板 ====================
.reasoning-panel {
  width: 90%;
  max-width: 700px;
  margin-top: 40px;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  overflow: hidden;
  background: $color-bg-card;
  box-shadow: $shadow-md;
  animation: slideUp 0.4s ease;
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .reasoning-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    color: $color-text-primary;
    background: linear-gradient(to right, #f5f7fa, $color-bg-card);
    transition: all $transition-normal;
    
    &:hover {
      background: linear-gradient(to right, #ebeef5, #f5f7fa);
      padding-left: 24px;
    }
    
    .el-icon {
      transition: transform $transition-normal;
      color: $color-primary;
      font-size: 16px;
      
      &.is-rotate {
        transform: rotate(180deg);
      }
    }
    
    .reasoning-status {
      margin-left: auto;
      font-size: 13px;
      font-weight: normal;
      color: $color-text-secondary;
      padding: 4px 12px;
      background: $color-primary-light;
      border-radius: 20px;
    }
  }
  
  .reasoning-content {
    max-height: 400px;
    overflow-y: auto;
    padding: 20px;
    background: #fafbfc;
    border-top: 1px solid $color-border;
    
    // 自定义滚动条
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #c0c4cc;
      border-radius: 3px;
      
      &:hover {
        background: #909399;
      }
    }
    
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 1.8;
      color: $color-text-regular;
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
      background: $color-bg-card;
      padding: 16px;
      border-radius: $radius-sm;
      border: 1px solid $color-border;
    }
  }
}

// ==================== 编辑提示 ====================
.edit-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #e0f2fe, #f0f9ff);
  border: 1px solid #bae6fd;
  border-radius: $radius-md;
  color: #0369a1;
  font-size: 14px;
  animation: slideDown 0.4s ease;
  
  .el-icon {
    font-size: 16px;
    color: #0ea5e9;
  }
  
  span {
    flex: 1;
  }
  
  .el-button {
    color: #0369a1;
    
    &:hover {
      color: #075985;
    }
  }
}

// ==================== 元素选择模式提示 ====================
.select-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 1px solid #409eff;
  border-radius: $radius-md;
  color: #0369a1;
  font-size: 14px;
  animation: slideDown 0.4s ease;
  
  .el-icon {
    font-size: 18px;
    color: #409eff;
    animation: pulse-icon 1.5s infinite;
  }
  
  @keyframes pulse-icon {
    0%, 100% { 
      transform: scale(1);
      opacity: 1;
    }
    50% { 
      transform: scale(1.1);
      opacity: 0.8;
    }
  }
  
  
  
  span {
    flex: 1;
    font-weight: 500;
  }
  
  .el-button {
    color: #0369a1;
    
    &:hover {
      color: #ef4444;
    }
  }
}

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

// ==================== 可编辑元素样式（全局，因为内容是动态插入的） ====================
:deep([contenteditable="true"]) {
  outline: none;
  transition: all 0.2s ease;
  border-radius: 2px;
  padding: 1px 2px;
  margin: -1px -2px;
  position: relative;
  
  &:hover {
    background-color: rgba(59, 130, 246, 0.08) !important;
    cursor: text;
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
  }
  
  &:focus {
    background-color: rgba(59, 130, 246, 0.12) !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
    z-index: 10;
  }
  
  &.editing {
    background-color: rgba(59, 130, 246, 0.12) !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
  }
}

// ==================== 响应式设计 ====================
@media (max-width: 1200px) {
  .resume-preview-wrapper {
    width: fit-content;
    max-width: none;
    padding: 0 20px;
  }
}

@media (max-width: 768px) {
  .resume-preview {
    padding: 12px;
  }
  
  .resume-content {
    width: fit-content;
    :deep(.resume-container) {
      width: 100% !important;
      min-height: auto !important;
    }
  }
}
</style>

<style lang="scss">
// 打印样式（非 scoped，确保打印时生效）
@media print {
  // 简历容器样式
  .resume-container {
    box-shadow: none !important;
    margin: 0 !important;
    width: 794px !important;
    border-radius: 0 !important;
  }
  
  // 隐藏分页线
  .page-break-line {
    display: none !important;
  }
  
  // 隐藏主容器的阴影和圆角
  .resume-content {
    box-shadow: none !important;
    background: white !important;
    border-radius: 0 !important;
  }
  
  // 隐藏主容器的背景和边距
  .resume-preview {
    background: white !important;
    padding: 0 !important;
  }
  
  // 隐藏简历预览包装器的阴影和边距
  .resume-preview-wrapper {
    max-width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
}
</style>