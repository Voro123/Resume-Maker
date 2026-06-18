<template></template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

const isActive = ref(false)
const hoveredElement = ref<HTMLElement | null>(null)
const selectedElements = ref<Array<{ element: HTMLElement; info: string }>>([])
const hoverOverlay = ref<HTMLElement | null>(null)
const selectedOverlays = ref<HTMLElement[]>([])

const getResumeContent = () => document.querySelector('.resume-content') as HTMLElement | null

const tagNames: Record<string, string> = {
  h1: '标题1',
  h2: '标题2',
  h3: '标题3',
  h4: '标题4',
  p: '段落',
  span: '文本',
  div: '区块',
  li: '列表项',
  td: '单元格',
  th: '表头',
  a: '链接',
  strong: '加粗文本',
  em: '斜体文本',
  img: '图片'
}

const getOrCreateHoverOverlay = () => {
  if (hoverOverlay.value) return hoverOverlay.value

  const overlay = document.createElement('div')
  overlay.className = 'resume-ai-selector-hover-overlay'
  overlay.style.position = 'fixed'
  overlay.style.backgroundColor = 'rgba(56, 132, 244, 0.12)'
  overlay.style.outline = '2px solid rgba(56, 132, 244, 0.75)'
  overlay.style.outlineOffset = '-1px'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '10040'
  overlay.style.transition = 'all 0.12s ease'
  overlay.style.borderRadius = '3px'
  overlay.style.display = 'none'

  document.body.appendChild(overlay)
  hoverOverlay.value = overlay
  return overlay
}

const removeHoverOverlay = () => {
  hoverOverlay.value?.remove()
  hoverOverlay.value = null
  hoveredElement.value = null
}

const updateOverlayPosition = (overlay: HTMLElement, target: HTMLElement) => {
  const rect = target.getBoundingClientRect()
  overlay.style.top = `${rect.top}px`
  overlay.style.left = `${rect.left}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
  overlay.style.display = 'block'
}

const showHoverOverlay = (target: HTMLElement) => {
  hoveredElement.value = target
  updateOverlayPosition(getOrCreateHoverOverlay(), target)
}

const clearSelectedOverlays = () => {
  selectedOverlays.value.forEach((overlay) => overlay.remove())
  selectedOverlays.value = []
  selectedElements.value = []
}

const createSelectedOverlay = (target: HTMLElement, index: number) => {
  const overlay = document.createElement('div')
  overlay.className = 'resume-ai-selector-selected-overlay'
  overlay.style.position = 'fixed'
  overlay.style.backgroundColor = 'rgba(56, 132, 244, 0.2)'
  overlay.style.outline = '2px solid #3884f4'
  overlay.style.outlineOffset = '-1px'
  overlay.style.pointerEvents = 'none'
  overlay.style.zIndex = '10039'
  overlay.style.borderRadius = '3px'

  const label = document.createElement('div')
  label.style.position = 'absolute'
  label.style.left = '0'
  label.style.top = '-20px'
  label.style.padding = '2px 6px'
  label.style.borderRadius = '3px'
  label.style.background = '#3884f4'
  label.style.color = '#fff'
  label.style.fontSize = '11px'
  label.style.fontWeight = 'bold'
  label.style.whiteSpace = 'nowrap'
  label.textContent = String(index + 1)
  overlay.appendChild(label)

  document.body.appendChild(overlay)
  updateOverlayPosition(overlay, target)
  selectedOverlays.value.push(overlay)
}

const updateSelectedOverlays = () => {
  selectedElements.value.forEach((item, index) => {
    const overlay = selectedOverlays.value[index]
    if (overlay) {
      updateOverlayPosition(overlay, item.element)
    }
  })
}

const reindexSelectedOverlays = () => {
  selectedOverlays.value.forEach((overlay, index) => {
    const label = overlay.querySelector('div')
    if (label) label.textContent = String(index + 1)
  })
}

const isIgnoredTarget = (el: HTMLElement) => {
  return Boolean(
    el.closest('.resume-avatar-upload-target') ||
      el.closest('.resume-avatar-placeholder') ||
      el.closest('.element-action-toolbar') ||
      el.closest('.resume-selection-format-toolbar') ||
      el.closest('.page-break-line')
  )
}

const findSelectableElement = (el: HTMLElement): HTMLElement | null => {
  const content = getResumeContent()
  if (!content || el === content) return null

  let current: HTMLElement | null = el

  while (current && current !== content) {
    if (isIgnoredTarget(current)) return null

    const tagName = current.tagName.toLowerCase()
    const textContent = current.textContent?.trim() || ''
    const rect = current.getBoundingClientRect()
    const directSelectTags = ['h1', 'h2', 'h3', 'h4', 'p', 'li', 'td', 'th', 'a', 'strong', 'em', 'span', 'img']

    if (directSelectTags.includes(tagName)) {
      if (tagName === 'span' && textContent.length < 20) {
        const parent = current.parentElement
        if (parent && parent !== content) {
          const parentText = parent.textContent?.trim() || ''
          if (parentText.length > 0 && parentText.length < 100) {
            current = parent
            continue
          }
        }
      }
      return current
    }

    if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
      const hasDirectText = Array.from(current.childNodes).some((node) => {
        return node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
      })

      if (hasDirectText || (rect.height < 220 && textContent.length > 0)) {
        return current
      }
    }

    current = current.parentElement
  }

  return null
}

const getElementInfo = (el: HTMLElement) => {
  const tagName = el.tagName.toLowerCase()
  const tagLabel = tagNames[tagName] || tagName
  let text = el.textContent?.trim() || ''

  if (tagName === 'img') {
    text = el.getAttribute('alt') || '图片'
  }

  if (text.length > 30) {
    text = `${text.slice(0, 30)}...`
  }

  return text ? `${tagLabel}: ${text}` : tagLabel
}

const emitSelected = (elementInfo: string, isMultiSelect: boolean) => {
  window.dispatchEvent(
    new CustomEvent('resume-element-selected', {
      detail: {
        elementInfo,
        allElements: selectedElements.value.map((item) => item.info),
        isMultiSelect
      }
    })
  )
}

const exitSelectMode = (emitState = true) => {
  isActive.value = false
  document.body.style.cursor = ''
  removeHoverOverlay()
  detachContentListeners()
  window.removeEventListener('scroll', handleScroll, true)

  if (emitState) {
    window.dispatchEvent(new CustomEvent('resume-element-selector', { detail: { active: false } }))
  }
}

const enterSelectMode = async (existingElements: string[] = []) => {
  isActive.value = true
  document.body.style.cursor = 'crosshair'
  await nextTick()
  attachContentListeners()
  window.removeEventListener('scroll', handleScroll, true)
  window.addEventListener('scroll', handleScroll, true)

  if (existingElements.length) {
    restoreSelectedElements(existingElements)
  }
}

const handleSelectorEvent = (event: Event) => {
  const customEvent = event as CustomEvent
  const active = Boolean(customEvent.detail?.active)

  if (active) {
    enterSelectMode(customEvent.detail?.existingElements || [])
  } else {
    exitSelectMode(false)
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isActive.value) return

  const target = event.target as HTMLElement | null
  if (!target) return

  const selectable = findSelectableElement(target)
  if (!selectable) {
    removeHoverOverlay()
    return
  }

  showHoverOverlay(selectable)
  event.preventDefault()
  event.stopImmediatePropagation()
}

const handleClick = (event: MouseEvent) => {
  if (!isActive.value) return

  const target = event.target as HTMLElement | null
  if (!target) return

  const selectable = findSelectableElement(target)
  if (!selectable) return

  event.preventDefault()
  event.stopImmediatePropagation()

  const info = getElementInfo(selectable)
  const isMultiSelect = event.ctrlKey || event.metaKey

  if (isMultiSelect) {
    const existingIndex = selectedElements.value.findIndex((item) => item.element === selectable)

    if (existingIndex >= 0) {
      selectedElements.value.splice(existingIndex, 1)
      selectedOverlays.value[existingIndex]?.remove()
      selectedOverlays.value.splice(existingIndex, 1)
      reindexSelectedOverlays()
    } else {
      selectedElements.value.push({ element: selectable, info })
      createSelectedOverlay(selectable, selectedElements.value.length - 1)
    }

    emitSelected(info, true)
    return
  }

  clearSelectedOverlays()
  selectedElements.value = [{ element: selectable, info }]
  createSelectedOverlay(selectable, 0)
  emitSelected(info, false)
  exitSelectMode(true)
}

const handleMouseLeave = () => {
  if (!isActive.value) return
  removeHoverOverlay()
}

const handleScroll = () => {
  if (hoveredElement.value) {
    showHoverOverlay(hoveredElement.value)
  }
  updateSelectedOverlays()
}

const attachContentListeners = () => {
  const content = getResumeContent()
  if (!content) return

  content.classList.add('select-mode')
  content.removeEventListener('mousemove', handleMouseMove, true)
  content.removeEventListener('click', handleClick, true)
  content.removeEventListener('mouseleave', handleMouseLeave, true)
  content.addEventListener('mousemove', handleMouseMove, true)
  content.addEventListener('click', handleClick, true)
  content.addEventListener('mouseleave', handleMouseLeave, true)
}

const detachContentListeners = () => {
  const content = getResumeContent()
  if (!content) return

  content.classList.remove('select-mode')
  content.removeEventListener('mousemove', handleMouseMove, true)
  content.removeEventListener('click', handleClick, true)
  content.removeEventListener('mouseleave', handleMouseLeave, true)
}

const restoreSelectedElements = (elementInfos: string[]) => {
  const content = getResumeContent()
  if (!content) return

  clearSelectedOverlays()

  const elements = Array.from(content.querySelectorAll<HTMLElement>('*'))
  elementInfos.forEach((info) => {
    const element = elements.find((el) => getElementInfo(el) === info)
    if (!element) return

    selectedElements.value.push({ element, info })
    createSelectedOverlay(element, selectedElements.value.length - 1)
  })
}

const removeSelectedElement = (index: number) => {
  selectedElements.value.splice(index, 1)
  selectedOverlays.value[index]?.remove()
  selectedOverlays.value.splice(index, 1)
  reindexSelectedOverlays()
}

const handleRemoveEvent = (event: Event) => {
  const customEvent = event as CustomEvent
  removeSelectedElement(customEvent.detail?.index)
}

const handleClearEvent = () => {
  clearSelectedOverlays()
}

const handleHighlightEvent = (event: Event) => {
  const customEvent = event as CustomEvent
  const info = customEvent.detail?.elementInfo
  if (!info) return

  const content = getResumeContent()
  const element = Array.from(content?.querySelectorAll<HTMLElement>('*') || []).find((el) => getElementInfo(el) === info)
  if (element) showHoverOverlay(element)
}

onMounted(() => {
  window.addEventListener('resume-element-selector', handleSelectorEvent)
  window.addEventListener('resume-element-remove', handleRemoveEvent)
  window.addEventListener('resume-element-cleared', handleClearEvent)
  window.addEventListener('resume-element-highlight', handleHighlightEvent)
  window.addEventListener('resume-element-unhighlight', removeHoverOverlay)
})

onUnmounted(() => {
  exitSelectMode(false)
  clearSelectedOverlays()
  window.removeEventListener('resume-element-selector', handleSelectorEvent)
  window.removeEventListener('resume-element-remove', handleRemoveEvent)
  window.removeEventListener('resume-element-cleared', handleClearEvent)
  window.removeEventListener('resume-element-highlight', handleHighlightEvent)
  window.removeEventListener('resume-element-unhighlight', removeHoverOverlay)
})
</script>

<style lang="scss">
.resume-content.select-mode * {
  cursor: crosshair !important;
}

.exporting-pdf {
  .resume-ai-selector-hover-overlay,
  .resume-ai-selector-selected-overlay {
    display: none !important;
  }
}
</style>
