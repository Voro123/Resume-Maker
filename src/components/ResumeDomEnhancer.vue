<template>
  <input
    ref="fileInputRef"
    class="resume-avatar-file-input"
    type="file"
    accept="image/*"
    @change="handleAvatarFileChange"
  />
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useResumeStore } from '@/stores/resume'

const resumeStore = useResumeStore()
const fileInputRef = ref<HTMLInputElement>()
const currentAvatarTarget = ref<HTMLElement | null>(null)
let enhanceTimer: number | null = null
let dragState: {
  target: HTMLElement
  img: HTMLImageElement
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
} | null = null

const EXPLICIT_AVATAR_SELECTOR = '.resume-avatar-placeholder, [data-resume-avatar-upload="true"]'
const BULLET_CHARS = ['•', '·', '●', '○', '▪', '▫', '◦', '◆', '◇', '-', '–']
const UPLOAD_TEXT_REGEXP = /点击|上传|替换|头像|照片/g
const DEFAULT_AVATAR_STATE = { x: 0, y: 0, scale: 1 }
const MIN_AVATAR_SCALE = 0.7
const MAX_AVATAR_SCALE = 3
const MAX_AVATAR_SIZE = 180

const pxToNumber = (value: string) => Number.parseFloat(value || '0') || 0
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const getResumeContent = () => document.querySelector('.resume-content') as HTMLElement | null
const getResumeContainer = () => document.querySelector('.resume-content .resume-container') as HTMLElement | null

const saveCurrentResumeHtml = () => {
  const content = getResumeContent()
  if (!content) return
  resumeStore.updateGeneratedHTML(content.innerHTML)
}

const getAvatarState = (target: HTMLElement) => ({
  x: Number(target.dataset.avatarX || DEFAULT_AVATAR_STATE.x),
  y: Number(target.dataset.avatarY || DEFAULT_AVATAR_STATE.y),
  scale: Number(target.dataset.avatarScale || DEFAULT_AVATAR_STATE.scale)
})

const setAvatarState = (target: HTMLElement, state: { x: number; y: number; scale: number }) => {
  const x = Math.round(state.x)
  const y = Math.round(state.y)
  const scale = Number(clamp(state.scale, MIN_AVATAR_SCALE, MAX_AVATAR_SCALE).toFixed(2))
  target.dataset.avatarX = String(x)
  target.dataset.avatarY = String(y)
  target.dataset.avatarScale = String(scale)

  const img = target.querySelector<HTMLImageElement>('img')
  if (!img) return

  img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  img.style.transformOrigin = 'center center'
}

const resetAvatarState = (target: HTMLElement) => {
  setAvatarState(target, DEFAULT_AVATAR_STATE)
}

const isTopAvatarImage = (img: HTMLImageElement) => {
  const container = getResumeContainer()
  if (!container) return false

  const images = Array.from(container.querySelectorAll('img'))
  const rect = img.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const nearTop = rect.top - containerRect.top < 260
  const avatarLikeSize = rect.width >= 40 && rect.width <= MAX_AVATAR_SIZE && rect.height >= 40 && rect.height <= MAX_AVATAR_SIZE

  return images[0] === img || (nearTop && avatarLikeSize)
}

const isExplicitAvatarTarget = (el: HTMLElement) => el.matches(EXPLICIT_AVATAR_SELECTOR)

const clampAvatarShellSize = (target: HTMLElement) => {
  const rect = target.getBoundingClientRect()
  const style = window.getComputedStyle(target)
  const width = rect.width || pxToNumber(style.width)
  const height = rect.height || pxToNumber(style.height)

  if (width > MAX_AVATAR_SIZE) {
    target.style.width = `${MAX_AVATAR_SIZE}px`
    target.style.maxWidth = `${MAX_AVATAR_SIZE}px`
  }
  if (height > MAX_AVATAR_SIZE) {
    target.style.height = `${MAX_AVATAR_SIZE}px`
    target.style.maxHeight = `${MAX_AVATAR_SIZE}px`
  }
}

const cleanAvatarPlaceholderContent = (target: HTMLElement) => {
  Array.from(target.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (!text.trim() || UPLOAD_TEXT_REGEXP.test(text)) node.remove()
      return
    }

    const el = node as HTMLElement
    if (el.tagName?.toLowerCase() === 'img') return

    const text = el.textContent?.trim() || ''
    const isUploadHint = UPLOAD_TEXT_REGEXP.test(text)
    const isIconLike = el.classList?.contains('avatar-icon') || el.classList?.contains('resume-avatar-icon') || el.classList?.contains('resume-avatar-upload-badge')

    if (isUploadHint || isIconLike) el.remove()
  })
}

const markAvatarShell = (el: HTMLElement) => {
  el.classList.add('resume-avatar-placeholder', 'resume-avatar-upload-target')
  el.setAttribute('data-resume-avatar-upload', 'true')
  el.removeAttribute('title')

  const style = window.getComputedStyle(el)
  if (style.position === 'static') el.style.position = 'relative'

  clampAvatarShellSize(el)
  cleanAvatarPlaceholderContent(el)
  setAvatarState(el, getAvatarState(el))
}

const wrapAvatarImage = (img: HTMLImageElement) => {
  const parent = img.parentElement
  if (!parent) return img

  const existingShell = img.closest<HTMLElement>(EXPLICIT_AVATAR_SELECTOR)
  if (existingShell) {
    markAvatarShell(existingShell)
    return existingShell
  }

  if (!isTopAvatarImage(img)) return img

  const rect = img.getBoundingClientRect()
  const computed = window.getComputedStyle(img)
  const shell = document.createElement('span')
  shell.className = 'resume-avatar-placeholder resume-avatar-upload-target'
  shell.setAttribute('data-resume-avatar-upload', 'true')
  shell.style.width = img.style.width || computed.width || `${Math.max(rect.width, 72)}px`
  shell.style.height = img.style.height || computed.height || `${Math.max(rect.height, 72)}px`
  shell.style.borderRadius = img.style.borderRadius || computed.borderRadius || '50%'
  shell.style.display = computed.display === 'block' ? 'block' : 'inline-flex'
  shell.style.position = 'relative'
  shell.style.overflow = 'hidden'

  parent.insertBefore(shell, img)
  shell.appendChild(img)

  img.classList.add('resume-avatar-image')
  img.removeAttribute('title')
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'cover'
  img.style.display = 'block'
  img.style.borderRadius = 'inherit'

  clampAvatarShellSize(shell)
  resetAvatarState(shell)
  return shell
}

const markAvatarTarget = (el: HTMLElement) => {
  if (el.tagName.toLowerCase() === 'img') {
    wrapAvatarImage(el as HTMLImageElement)
    return
  }

  if (!isExplicitAvatarTarget(el)) return
  markAvatarShell(el)
}

const enhanceAvatarTargets = () => {
  const container = getResumeContainer()
  if (!container) return

  const candidates = Array.from(container.querySelectorAll<HTMLElement>('img, .resume-avatar-placeholder, [data-resume-avatar-upload="true"]'))
  candidates.forEach(markAvatarTarget)
}

const hasPseudoBeforeMarker = (el: HTMLElement) => {
  const before = window.getComputedStyle(el, '::before')
  const hasContent = before.content && before.content !== 'none' && before.content !== 'normal' && before.content !== '""'
  const isSmallAbsoluteMarker = before.position === 'absolute' && pxToNumber(before.width) <= 24 && pxToNumber(before.height) <= 24
  return Boolean(hasContent || isSmallAbsoluteMarker)
}

const isNativeList = (list: HTMLElement) => {
  const style = window.getComputedStyle(list)
  return style.listStyleType !== 'none'
}

const normalizeNativeLists = () => {
  const container = getResumeContainer()
  if (!container) return

  container.querySelectorAll<HTMLElement>('ul, ol').forEach((list) => {
    if (!isNativeList(list)) return

    list.classList.add('resume-safe-list')
    list.style.listStylePosition = 'outside'
    list.style.paddingLeft = list.tagName.toLowerCase() === 'ol' ? '1.65em' : '1.45em'
    list.style.marginLeft = '0'
  })

  container.querySelectorAll<HTMLElement>('li').forEach((item) => {
    const parentList = item.parentElement as HTMLElement | null
    if (!parentList || !['UL', 'OL'].includes(parentList.tagName) || !isNativeList(parentList)) return
    if (hasPseudoBeforeMarker(item)) return

    item.classList.add('resume-safe-list-item')
    item.style.listStylePosition = 'outside'
    item.style.textIndent = '0'
    item.style.paddingLeft = '0.28em'
    item.style.marginLeft = '0'
    item.style.lineHeight = item.style.lineHeight || '1.55'
  })
}

const getLeadingBullet = (text: string) => {
  const trimmed = text.trimStart()
  const firstChar = trimmed.charAt(0)
  return BULLET_CHARS.includes(firstChar) ? firstChar : ''
}

const splitLeadingBulletTextNode = (block: HTMLElement) => {
  if (block.querySelector(':scope > .resume-safe-inline-marker')) return

  const firstTextNode = Array.from(block.childNodes).find((node) => {
    return node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
  }) as Text | undefined

  if (!firstTextNode?.textContent) return

  const bullet = getLeadingBullet(firstTextNode.textContent)
  if (!bullet) return

  firstTextNode.textContent = firstTextNode.textContent.replace(/^\s*[•·●○▪▫◦◆◇\-–]\s*/, '')

  const marker = document.createElement('span')
  marker.className = 'resume-safe-inline-marker'
  marker.textContent = bullet
  block.insertBefore(marker, firstTextNode)
}

const normalizeCustomBulletLists = () => {
  const container = getResumeContainer()
  if (!container) return

  container.querySelectorAll<HTMLElement>('p, div').forEach((block) => {
    if (block.closest('li')) return

    const text = block.textContent?.trim() || ''
    const bullet = getLeadingBullet(text)
    if (!bullet) return

    block.classList.add('resume-safe-custom-bullet')
    splitLeadingBulletTextNode(block)

    if (!block.style.display || block.style.display === 'block') {
      block.style.display = 'flex'
      block.style.alignItems = 'flex-start'
      block.style.gap = '0.45em'
      block.style.textIndent = '0'
    }
  })

  container.querySelectorAll<HTMLElement>('li > span:first-child, li > i:first-child, li > b:first-child, li > strong:first-child').forEach((marker) => {
    const text = marker.textContent?.trim() || ''
    if (!BULLET_CHARS.includes(text) && text.length > 2) return
    marker.classList.add('resume-safe-inline-marker')
  })
}

const enhanceListLayout = () => {
  normalizeNativeLists()
  normalizeCustomBulletLists()
}

const enhanceResumeDom = () => {
  enhanceAvatarTargets()
  enhanceListLayout()
}

const scheduleEnhance = () => {
  if (enhanceTimer) window.clearTimeout(enhanceTimer)

  enhanceTimer = window.setTimeout(() => {
    enhanceResumeDom()
  }, 80)
}

const findAvatarTarget = (target: HTMLElement | null) => {
  return target?.closest<HTMLElement>('[data-resume-avatar-upload="true"]') || null
}

const hasAvatarImage = (target: HTMLElement) => Boolean(target.querySelector('img'))

const openAvatarFilePicker = (target: HTMLElement) => {
  currentAvatarTarget.value = target
  fileInputRef.value?.click()
}

const handleResumeClick = (event: MouseEvent) => {
  const target = findAvatarTarget(event.target as HTMLElement | null)
  if (!target) return

  if (dragState?.moved) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  if (!hasAvatarImage(target)) {
    event.preventDefault()
    event.stopPropagation()
    openAvatarFilePicker(target)
  }
}

const handleAvatarDoubleClick = (event: MouseEvent) => {
  const target = findAvatarTarget(event.target as HTMLElement | null)
  if (!target) return

  event.preventDefault()
  event.stopPropagation()
  openAvatarFilePicker(target)
}

const handleAvatarMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return

  const target = findAvatarTarget(event.target as HTMLElement | null)
  if (!target || !hasAvatarImage(target)) return

  const img = target.querySelector<HTMLImageElement>('img')
  if (!img) return

  event.preventDefault()
  event.stopPropagation()

  const state = getAvatarState(target)
  dragState = {
    target,
    img,
    startX: event.clientX,
    startY: event.clientY,
    originX: state.x,
    originY: state.y,
    moved: false
  }

  target.classList.add('is-avatar-dragging')
  window.addEventListener('mousemove', handleAvatarMouseMove, true)
  window.addEventListener('mouseup', handleAvatarMouseUp, true)
}

const handleAvatarMouseMove = (event: MouseEvent) => {
  if (!dragState) return

  const nextX = dragState.originX + event.clientX - dragState.startX
  const nextY = dragState.originY + event.clientY - dragState.startY
  const state = getAvatarState(dragState.target)

  if (Math.abs(event.clientX - dragState.startX) > 2 || Math.abs(event.clientY - dragState.startY) > 2) {
    dragState.moved = true
  }

  setAvatarState(dragState.target, {
    ...state,
    x: nextX,
    y: nextY
  })
}

const handleAvatarMouseUp = () => {
  if (!dragState) return

  dragState.target.classList.remove('is-avatar-dragging')
  window.removeEventListener('mousemove', handleAvatarMouseMove, true)
  window.removeEventListener('mouseup', handleAvatarMouseUp, true)

  if (dragState.moved) saveCurrentResumeHtml()

  window.setTimeout(() => {
    dragState = null
  }, 0)
}

const handleAvatarWheel = (event: WheelEvent) => {
  const target = findAvatarTarget(event.target as HTMLElement | null)
  if (!target || !hasAvatarImage(target)) return

  event.preventDefault()
  event.stopPropagation()

  const state = getAvatarState(target)
  const nextScale = clamp(state.scale + (event.deltaY < 0 ? 0.08 : -0.08), MIN_AVATAR_SCALE, MAX_AVATAR_SCALE)
  setAvatarState(target, {
    ...state,
    scale: nextScale
  })
  saveCurrentResumeHtml()
}

const replaceAvatarTargetImage = (dataUrl: string) => {
  const target = currentAvatarTarget.value
  if (!target) return

  target.style.backgroundImage = ''
  cleanAvatarPlaceholderContent(target)

  let img = target.querySelector<HTMLImageElement>('img')
  if (!img) {
    img = document.createElement('img')
    img.className = 'resume-avatar-image'
    img.alt = ''
    target.appendChild(img)
  }

  img.src = dataUrl
  img.removeAttribute('srcset')
  img.classList.add('resume-avatar-image')
  img.style.width = '100%'
  img.style.height = '100%'
  img.style.objectFit = 'cover'
  img.style.display = 'block'
  img.style.borderRadius = 'inherit'

  resetAvatarState(target)
  saveCurrentResumeHtml()
  scheduleEnhance()
  ElMessage.success('头像已替换，可拖动调整位置，滚轮缩放，双击重新上传')
}

const handleAvatarFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    replaceAvatarTargetImage(String(reader.result || ''))
    input.value = ''
  }
  reader.onerror = () => {
    ElMessage.error('图片读取失败')
    input.value = ''
  }
  reader.readAsDataURL(file)
}

const bindAvatarEvents = () => {
  const content = getResumeContent()
  if (!content) return

  content.removeEventListener('click', handleResumeClick, true)
  content.removeEventListener('dblclick', handleAvatarDoubleClick, true)
  content.removeEventListener('mousedown', handleAvatarMouseDown, true)
  content.removeEventListener('wheel', handleAvatarWheel, true)

  content.addEventListener('click', handleResumeClick, true)
  content.addEventListener('dblclick', handleAvatarDoubleClick, true)
  content.addEventListener('mousedown', handleAvatarMouseDown, true)
  content.addEventListener('wheel', handleAvatarWheel, { capture: true, passive: false })
}

onMounted(() => {
  nextTick(() => {
    enhanceResumeDom()
    bindAvatarEvents()
  })
})

onUnmounted(() => {
  const content = getResumeContent()
  content?.removeEventListener('click', handleResumeClick, true)
  content?.removeEventListener('dblclick', handleAvatarDoubleClick, true)
  content?.removeEventListener('mousedown', handleAvatarMouseDown, true)
  content?.removeEventListener('wheel', handleAvatarWheel, true)
  window.removeEventListener('mousemove', handleAvatarMouseMove, true)
  window.removeEventListener('mouseup', handleAvatarMouseUp, true)

  if (enhanceTimer) {
    window.clearTimeout(enhanceTimer)
    enhanceTimer = null
  }
})

watch(
  () => resumeStore.generatedHTML,
  () => {
    nextTick(() => {
      enhanceResumeDom()
      bindAvatarEvents()
    })
  }
)
</script>

<style scoped>
.resume-avatar-file-input {
  display: none;
}
</style>

<style lang="scss">
.reasoning-panel {
  display: none !important;
}

.resume-content {
  .resume-avatar-placeholder,
  .resume-avatar-upload-target {
    cursor: pointer !important;
    overflow: hidden;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 48px;
    min-height: 48px;
    max-width: 180px !important;
    max-height: 180px !important;
    background: rgba(255, 255, 255, 0.08);
    transition: box-shadow 0.2s ease, outline 0.2s ease, filter 0.2s ease;
    user-select: none;
    touch-action: none;

    &:hover {
      outline: 2px dashed #409eff !important;
      outline-offset: 4px !important;
      filter: brightness(0.98);
    }

    &.is-avatar-dragging {
      cursor: grabbing !important;
    }
  }

  .resume-avatar-placeholder::before,
  .resume-avatar-placeholder::after,
  .resume-avatar-upload-target::before,
  .resume-avatar-upload-target::after {
    content: '' !important;
    display: none !important;
  }

  .resume-avatar-image,
  .resume-avatar-placeholder > img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    display: block !important;
    border-radius: inherit !important;
    transform-origin: center center;
    will-change: transform;
    user-select: none;
    pointer-events: none;
  }

  ul.resume-safe-list,
  ol.resume-safe-list {
    list-style-position: outside !important;
    margin-left: 0 !important;
    padding-left: 1.45em !important;
  }

  ol.resume-safe-list {
    padding-left: 1.65em !important;
  }

  li.resume-safe-list-item {
    list-style-position: outside !important;
    text-indent: 0 !important;
    padding-left: 0.28em !important;
    margin-left: 0 !important;
    line-height: 1.55 !important;
    overflow: visible !important;
  }

  li.resume-safe-list-item::marker {
    font-size: 0.95em;
  }

  .resume-safe-inline-marker {
    display: inline-block !important;
    min-width: 0.9em !important;
    margin-right: 0.35em !important;
    text-align: center !important;
    flex-shrink: 0 !important;
  }

  .resume-safe-custom-bullet {
    text-indent: 0 !important;
    line-height: 1.55 !important;
  }
}

.exporting-pdf {
  .resume-content {
    .resume-avatar-placeholder,
    .resume-avatar-upload-target {
      outline: none !important;
    }
  }
}
</style>
