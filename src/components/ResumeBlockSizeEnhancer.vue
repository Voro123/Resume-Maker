<template>
  <span class="resume-block-size-enhancer" aria-hidden="true" />
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted } from 'vue'
import { useResumeStore } from '@/stores/resume'

const resumeStore = useResumeStore()

let observer: MutationObserver | null = null
let activeTarget: HTMLElement | null = null
let activeOverlay: HTMLElement | null = null
let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0
let beforeWidth = ''
let beforeMinWidth = ''
let beforeMaxWidth = ''
let beforeHeight = ''
let beforeMinHeight = ''
let resizeMode: 'width' | 'both' | null = null

const getResumeContent = () => document.querySelector('.resume-content') as HTMLElement | null

const saveCurrentResumeHtml = () => {
  const content = getResumeContent()
  if (!content) return
  resumeStore.updateGeneratedHTML(content.innerHTML)
}

const getRectDistance = (a: DOMRect, b: DOMRect) => {
  return Math.abs(a.top - b.top) + Math.abs(a.left - b.left) + Math.abs(a.width - b.width) + Math.abs(a.height - b.height)
}

const findTargetByOverlay = (overlay: HTMLElement) => {
  const content = getResumeContent()
  if (!content) return null

  const overlayRect = overlay.getBoundingClientRect()
  let best: HTMLElement | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  content.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.classList.contains('page-break-line')) return

    const rect = el.getBoundingClientRect()
    if (rect.width < 24 || rect.height < 16) return

    const distance = getRectDistance(rect, overlayRect)
    if (distance < bestDistance) {
      bestDistance = distance
      best = el
    }
  })

  return bestDistance <= 8 ? best : null
}

const createHandle = (className: string, title: string, mode: 'width' | 'both') => {
  const handle = document.createElement('div')
  handle.className = className
  handle.title = title
  handle.dataset.resizeMode = mode
  handle.addEventListener('mousedown', startResize)
  return handle
}

const ensureWidthHandles = (overlay: HTMLElement) => {
  if (overlay.querySelector('.element-resize-width-handle')) return

  const widthHandle = createHandle('element-resize-width-handle', '拖拽调整宽度', 'width')
  widthHandle.style.position = 'absolute'
  widthHandle.style.right = '-7px'
  widthHandle.style.top = '50%'
  widthHandle.style.transform = 'translateY(-50%)'
  widthHandle.style.width = '12px'
  widthHandle.style.height = '56px'
  widthHandle.style.borderRadius = '999px'
  widthHandle.style.background = '#409eff'
  widthHandle.style.cursor = 'ew-resize'
  widthHandle.style.pointerEvents = 'auto'
  widthHandle.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)'

  const cornerHandle = createHandle('element-resize-both-handle', '拖拽同时调整宽高', 'both')
  cornerHandle.style.position = 'absolute'
  cornerHandle.style.right = '-8px'
  cornerHandle.style.bottom = '-8px'
  cornerHandle.style.width = '16px'
  cornerHandle.style.height = '16px'
  cornerHandle.style.borderRadius = '4px'
  cornerHandle.style.background = 'linear-gradient(135deg, #409eff 0%, #67c23a 100%)'
  cornerHandle.style.cursor = 'nwse-resize'
  cornerHandle.style.pointerEvents = 'auto'
  cornerHandle.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.22)'

  overlay.appendChild(widthHandle)
  overlay.appendChild(cornerHandle)
}

const enhanceExistingOverlay = () => {
  const overlay = document.querySelector('.element-resize-handle-overlay') as HTMLElement | null
  if (!overlay) return
  ensureWidthHandles(overlay)
}

const startResize = (event: MouseEvent) => {
  const handle = event.currentTarget as HTMLElement
  const overlay = handle.closest('.element-resize-handle-overlay') as HTMLElement | null
  if (!overlay) return

  const target = findTargetByOverlay(overlay)
  if (!target) return

  event.preventDefault()
  event.stopPropagation()

  activeTarget = target
  activeOverlay = overlay
  resizeMode = handle.dataset.resizeMode === 'both' ? 'both' : 'width'

  const rect = target.getBoundingClientRect()
  startX = event.clientX
  startY = event.clientY
  startWidth = rect.width
  startHeight = rect.height
  beforeWidth = target.style.width || ''
  beforeMinWidth = target.style.minWidth || ''
  beforeMaxWidth = target.style.maxWidth || ''
  beforeHeight = target.style.height || ''
  beforeMinHeight = target.style.minHeight || ''

  document.body.style.cursor = resizeMode === 'both' ? 'nwse-resize' : 'ew-resize'
  document.body.style.userSelect = 'none'

  window.addEventListener('mousemove', handleResizeMove, true)
  window.addEventListener('mouseup', stopResize, true)
}

const syncOverlayToTarget = () => {
  if (!activeTarget || !activeOverlay) return

  const rect = activeTarget.getBoundingClientRect()
  activeOverlay.style.top = `${rect.top}px`
  activeOverlay.style.left = `${rect.left}px`
  activeOverlay.style.width = `${rect.width}px`
  activeOverlay.style.height = `${rect.height}px`
}

const handleResizeMove = (event: MouseEvent) => {
  if (!activeTarget || !resizeMode) return

  const deltaX = event.clientX - startX
  const nextWidth = Math.max(24, Math.round(startWidth + deltaX))

  activeTarget.style.width = `${nextWidth}px`
  activeTarget.style.minWidth = `${nextWidth}px`
  activeTarget.style.maxWidth = `${nextWidth}px`

  if (resizeMode === 'both') {
    const deltaY = event.clientY - startY
    const nextHeight = Math.max(24, Math.round(startHeight + deltaY))
    activeTarget.style.height = `${nextHeight}px`
    activeTarget.style.minHeight = `${nextHeight}px`
  }

  syncOverlayToTarget()
}

const stopResize = () => {
  if (!activeTarget) return

  const changed =
    activeTarget.style.width !== beforeWidth ||
    activeTarget.style.minWidth !== beforeMinWidth ||
    activeTarget.style.maxWidth !== beforeMaxWidth ||
    activeTarget.style.height !== beforeHeight ||
    activeTarget.style.minHeight !== beforeMinHeight

  window.removeEventListener('mousemove', handleResizeMove, true)
  window.removeEventListener('mouseup', stopResize, true)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''

  if (changed) {
    saveCurrentResumeHtml()
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 0)
  }

  activeTarget = null
  activeOverlay = null
  resizeMode = null
  beforeWidth = ''
  beforeMinWidth = ''
  beforeMaxWidth = ''
  beforeHeight = ''
  beforeMinHeight = ''
}

onMounted(() => {
  nextTick(() => {
    enhanceExistingOverlay()
    observer = new MutationObserver(() => enhanceExistingOverlay())
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  })
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('mousemove', handleResizeMove, true)
  window.removeEventListener('mouseup', stopResize, true)
})
</script>

<style lang="scss">
.element-resize-width-handle:hover {
  transform: translateY(-50%) scale(1.08) !important;
  background: #66b1ff !important;
}

.element-resize-both-handle:hover {
  transform: scale(1.08) !important;
}

.exporting-pdf {
  .element-resize-width-handle,
  .element-resize-both-handle {
    display: none !important;
  }
}
</style>
