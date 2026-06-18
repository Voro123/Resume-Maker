<template>
  <div
    v-show="toolbar.visible"
    class="resume-selection-format-toolbar"
    :style="toolbarStyle"
    @mousedown.prevent
    @mouseup.prevent
    @click.stop
  >
    <button type="button" class="format-button" @click="toggleStrongForSelection">
      <strong>B</strong>
      <span>{{ toolbar.isStrong ? '取消加粗' : '加粗' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useResumeStore } from '@/stores/resume'

const resumeStore = useResumeStore()

const toolbar = reactive({
  visible: false,
  left: 0,
  top: 0,
  isStrong: false
})

let savedRange: Range | null = null
let updateTimer: number | null = null

const toolbarStyle = computed(() => ({
  left: `${toolbar.left}px`,
  top: `${toolbar.top}px`
}))

const getResumeContent = () => document.querySelector('.resume-content') as HTMLElement | null

const hideToolbar = () => {
  toolbar.visible = false
  savedRange = null
}

const getClosestElement = (node: Node | null): HTMLElement | null => {
  if (!node) return null
  if (node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement
  return node.parentElement
}

const isNodeInsideResume = (node: Node | null) => {
  const content = getResumeContent()
  const el = getClosestElement(node)
  return Boolean(content && el && content.contains(el))
}

const isSelectionInsideStrong = (range: Range) => {
  const startEl = getClosestElement(range.startContainer)
  const endEl = getClosestElement(range.endContainer)

  const startStrong = startEl?.closest('strong, b')
  const endStrong = endEl?.closest('strong, b')

  if (startStrong && startStrong === endStrong) return true

  const fragment = range.cloneContents()
  if (fragment.querySelector?.('strong, b')) return true

  const selectedText = range.toString().trim()
  if (!selectedText) return false

  const content = getResumeContent()
  if (!content) return false

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (range.intersectsNode(node) && getClosestElement(node)?.closest('strong, b')) {
      return true
    }
    node = walker.nextNode()
  }

  return false
}

const getSelectionRange = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const range = selection.getRangeAt(0)
  const selectedText = range.toString().trim()
  if (!selectedText) return null

  if (!isNodeInsideResume(range.startContainer) || !isNodeInsideResume(range.endContainer)) {
    return null
  }

  const content = getResumeContent()
  if (content?.classList.contains('select-mode')) return null

  const commonAncestor = getClosestElement(range.commonAncestorContainer)
  if (commonAncestor?.closest('.resume-selection-format-toolbar')) return null

  return range
}

const updateToolbarFromSelection = () => {
  const range = getSelectionRange()
  if (!range) {
    hideToolbar()
    return
  }

  const rect = range.getBoundingClientRect()
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    hideToolbar()
    return
  }

  savedRange = range.cloneRange()
  toolbar.isStrong = isSelectionInsideStrong(range)
  toolbar.left = Math.max(8, rect.left + rect.width / 2)
  toolbar.top = Math.max(8, rect.top - 42)
  toolbar.visible = true
}

const scheduleUpdateToolbar = () => {
  if (updateTimer) window.clearTimeout(updateTimer)

  updateTimer = window.setTimeout(() => {
    updateToolbarFromSelection()
  }, 80)
}

const normalizeBoldTagsToStrong = () => {
  const content = getResumeContent()
  if (!content) return

  content.querySelectorAll('b').forEach((bold) => {
    const strong = document.createElement('strong')
    Array.from(bold.attributes).forEach((attr) => strong.setAttribute(attr.name, attr.value))
    while (bold.firstChild) strong.appendChild(bold.firstChild)
    bold.replaceWith(strong)
  })
}

const saveCurrentHtml = () => {
  const content = getResumeContent()
  if (!content) return

  resumeStore.updateGeneratedHTML(content.innerHTML)
}

const restoreSavedSelection = () => {
  if (!savedRange) return false

  const selection = window.getSelection()
  if (!selection) return false

  selection.removeAllRanges()
  selection.addRange(savedRange)
  return true
}

const toggleStrongForSelection = () => {
  if (!restoreSavedSelection()) {
    hideToolbar()
    return
  }

  const range = getSelectionRange()
  if (!range) {
    hideToolbar()
    return
  }

  try {
    document.execCommand('bold', false)
    normalizeBoldTagsToStrong()
    saveCurrentHtml()
    ElMessage.success(toolbar.isStrong ? '已取消加粗' : '已加粗')
  } catch (error) {
    ElMessage.error('文本格式修改失败')
  } finally {
    window.getSelection()?.removeAllRanges()
    hideToolbar()
  }
}

const handleDocumentMouseDown = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('.resume-selection-format-toolbar')) return
  if (!target?.closest('.resume-content')) hideToolbar()
}

onMounted(() => {
  document.addEventListener('selectionchange', scheduleUpdateToolbar)
  document.addEventListener('mouseup', scheduleUpdateToolbar)
  document.addEventListener('keyup', scheduleUpdateToolbar)
  document.addEventListener('mousedown', handleDocumentMouseDown, true)

  nextTick(scheduleUpdateToolbar)
})

onUnmounted(() => {
  document.removeEventListener('selectionchange', scheduleUpdateToolbar)
  document.removeEventListener('mouseup', scheduleUpdateToolbar)
  document.removeEventListener('keyup', scheduleUpdateToolbar)
  document.removeEventListener('mousedown', handleDocumentMouseDown, true)

  if (updateTimer) {
    window.clearTimeout(updateTimer)
    updateTimer = null
  }
})
</script>

<style scoped lang="scss">
.resume-selection-format-toolbar {
  position: fixed;
  z-index: 10080;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 10px;
  background: rgba(17, 24, 39, 0.94);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  user-select: none;
}

.format-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  color: #e5edff;
  background: transparent;
  font-size: 12px;
  cursor: pointer;

  strong {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    color: #111827;
    background: #f8fafc;
    font-size: 13px;
    font-weight: 800;
  }

  &:hover {
    background: rgba(59, 130, 246, 0.28);
  }
}
</style>
