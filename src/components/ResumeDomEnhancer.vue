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

const AVATAR_KEYWORDS = [
  'avatar',
  'photo',
  'portrait',
  'headshot',
  'profile-img',
  'profile-image',
  'resume-avatar-placeholder',
  '个人照片',
  '头像',
  '照片'
]

const BULLET_CHARS = ['•', '·', '●', '○', '▪', '▫', '◦', '◆', '◇', '-', '–']
const UPLOAD_TEXT_REGEXP = /点击|上传|替换|头像|照片/g

const normalizeText = (value: string | null | undefined) => (value || '').toLowerCase()
const pxToNumber = (value: string) => Number.parseFloat(value || '0') || 0

const stripCssContentQuotes = (value: string) => {
  if (!value || value === 'none' || value === 'normal' || value === '""') return ''
  return value
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
}

const measureTextWidth = (text: string, style: CSSStyleDeclaration) => {
  if (!text) return 0

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return text.length * pxToNumber(style.fontSize || '14px')

  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  return context.measureText(text).width
}

const hasAvatarKeyword = (el: Element) => {
  const attrs = [
    el.className?.toString(),
    el.id,
    el.getAttribute('alt'),
    el.getAttribute('aria-label'),
    el.getAttribute('data-role')
  ]
    .filter(Boolean)
    .join(' ')

  const normalized = normalizeText(attrs)
  return AVATAR_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

const getResumeContent = () => document.querySelector('.resume-content') as HTMLElement | null
const getResumeContainer = () => document.querySelector('.resume-content .resume-container') as HTMLElement | null

const saveCurrentResumeHtml = () => {
  const content = getResumeContent()
  if (!content) return

  resumeStore.updateGeneratedHTML(content.innerHTML)
}

const isLikelyAvatarElement = (el: HTMLElement) => {
  if (hasAvatarKeyword(el)) return true

  const parent = el.parentElement
  if (parent && hasAvatarKeyword(parent)) return true

  if (el.tagName.toLowerCase() === 'img') {
    const container = getResumeContainer()
    if (!container) return false

    const images = Array.from(container.querySelectorAll('img'))
    const rect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const nearTop = rect.top - containerRect.top < 260
    const avatarLikeSize = rect.width >= 40 && rect.width <= 180 && rect.height >= 40 && rect.height <= 180

    return images[0] === el || (nearTop && avatarLikeSize)
  }

  const style = window.getComputedStyle(el)
  const hasBackgroundImage = style.backgroundImage && style.backgroundImage !== 'none'
  if (!hasBackgroundImage) return false

  const rect = el.getBoundingClientRect()
  const isAvatarLikeBlock = rect.width >= 40 && rect.width <= 180 && rect.height >= 40 && rect.height <= 180
  return isAvatarLikeBlock && Boolean(el.closest('.resume-container'))
}

const cleanAvatarPlaceholderContent = (target: HTMLElement) => {
  const hasImage = Boolean(target.querySelector('img'))
  if (hasImage) return

  Array.from(target.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (!text.trim() || UPLOAD_TEXT_REGEXP.test(text)) {
        node.remove()
      }
      return
    }

    const el = node as HTMLElement
    if (el.classList?.contains('resume-avatar-upload-badge')) return

    const text = el.textContent?.trim() || ''
    const isUploadHint = UPLOAD_TEXT_REGEXP.test(text)
    const isIconLike = el.classList?.contains('avatar-icon') || el.classList?.contains('resume-avatar-icon')

    if (isUploadHint || isIconLike) {
      el.remove()
    }
  })
}

const ensureAvatarBadge = (target: HTMLElement) => {
  const existing = target.querySelector<HTMLElement>(':scope > .resume-avatar-upload-badge')
  if (existing) {
    existing.textContent = '📷'
    return
  }

  const badge = document.createElement('span')
  badge.className = 'resume-avatar-upload-badge'
  badge.textContent = '📷'
  target.appendChild(badge)
}

const markAvatarShell = (el: HTMLElement) => {
  el.classList.add('resume-avatar-placeholder', 'resume-avatar-upload-target')
  el.setAttribute('data-resume-avatar-upload', 'true')
  el.removeAttribute('title')

  const style = window.getComputedStyle(el)
  if (style.position === 'static') {
    el.style.position = 'relative'
  }

  cleanAvatarPlaceholderContent(el)
  ensureAvatarBadge(el)
}

const wrapAvatarImage = (img: HTMLImageElement) => {
  const parent = img.parentElement
  if (!parent) return img

  const existingShell = img.closest<HTMLElement>('.resume-avatar-placeholder, [data-resume-avatar-upload="true"]')
  if (existingShell) {
    markAvatarShell(existingShell)
    return existingShell
  }

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

  ensureAvatarBadge(shell)
  return shell
}

const markAvatarTarget = (el: HTMLElement) => {
  if (el.tagName.toLowerCase() === 'img') {
    wrapAvatarImage(el as HTMLImageElement)
    return
  }

  markAvatarShell(el)
}

const enhanceAvatarTargets = () => {
  const container = getResumeContainer()
  if (!container) return

  const candidates = Array.from(container.querySelectorAll<HTMLElement>('img, .resume-avatar-placeholder, [data-resume-avatar-upload="true"], [class*="avatar" i], [class*="photo" i], [class*="portrait" i], [class*="headshot" i], [id*="avatar" i], [id*="photo" i]'))
  candidates.filter(isLikelyAvatarElement).forEach(markAvatarTarget)
}

const normalizeNativeLists = () => {
  const container = getResumeContainer()
  if (!container) return

  container.querySelectorAll<HTMLElement>('ul, ol').forEach((list) => {
    list.classList.add('resume-safe-list')
    list.style.listStylePosition = 'outside'
    list.style.paddingLeft = list.tagName.toLowerCase() === 'ol' ? '1.65em' : '1.45em'
    list.style.marginLeft = '0'
  })

  container.querySelectorAll<HTMLElement>('li').forEach((item) => {
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

const normalizeBeforeMarkers = () => {
  const container = getResumeContainer()
  if (!container) return

  container.querySelectorAll<HTMLElement>('section, article, div, li, p').forEach((el) => {
    if (el.classList.contains('resume-avatar-placeholder')) return

    const before = window.getComputedStyle(el, '::before')
    const content = stripCssContentQuotes(before.content)
    const beforeWidth = pxToNumber(before.width)
    const beforeHeight = pxToNumber(before.height)
    const hasTextLabel = Boolean(content && !BULLET_CHARS.includes(content) && content.length <= 12)
    const beforeLooksLikeDot = before.position === 'absolute' && beforeWidth <= 18 && beforeHeight <= 18

    if (!hasTextLabel && !beforeLooksLikeDot) return

    const elementStyle = window.getComputedStyle(el)
    const left = pxToNumber(before.left)
    const paddingLeft = pxToNumber(elementStyle.paddingLeft)
    const labelWidth = hasTextLabel ? measureTextWidth(content, before) : beforeWidth
    const requiredPadding = Math.ceil(Math.max(28, left + labelWidth + 10))

    if (paddingLeft >= requiredPadding) return

    el.classList.add('resume-safe-before-marker')
    if (elementStyle.position === 'static') {
      el.style.position = 'relative'
    }
    el.style.paddingLeft = `${requiredPadding}px`
  })
}

const enhanceListLayout = () => {
  normalizeNativeLists()
  normalizeCustomBulletLists()
  normalizeBeforeMarkers()
}

const enhanceResumeDom = () => {
  enhanceAvatarTargets()
  enhanceListLayout()
}

const scheduleEnhance = () => {
  if (enhanceTimer) {
    window.clearTimeout(enhanceTimer)
  }

  enhanceTimer = window.setTimeout(() => {
    enhanceResumeDom()
  }, 80)
}

const handleResumeClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return

  const avatarTarget = target.closest<HTMLElement>('[data-resume-avatar-upload="true"]')
  if (!avatarTarget) return

  event.preventDefault()
  event.stopPropagation()
  currentAvatarTarget.value = avatarTarget
  fileInputRef.value?.click()
}

const replaceAvatarTargetImage = (dataUrl: string) => {
  const target = currentAvatarTarget.value
  if (!target) return

  const img = target.tagName.toLowerCase() === 'img'
    ? (target as HTMLImageElement)
    : target.querySelector<HTMLImageElement>('img')

  if (img) {
    img.src = dataUrl
    img.removeAttribute('srcset')
    img.classList.add('resume-avatar-image')
  } else {
    target.style.backgroundImage = `url("${dataUrl}")`
    target.style.backgroundSize = 'cover'
    target.style.backgroundPosition = 'center'
    cleanAvatarPlaceholderContent(target)
  }

  saveCurrentResumeHtml()
  scheduleEnhance()
  ElMessage.success('头像已替换')
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
    ElMessage.error('图片读取失败，请重新选择')
    input.value = ''
  }
  reader.readAsDataURL(file)
}

onMounted(() => {
  nextTick(() => {
    enhanceResumeDom()
    const content = getResumeContent()
    content?.removeEventListener('click', handleResumeClick, true)
    content?.addEventListener('click', handleResumeClick, true)
  })
})

onUnmounted(() => {
  const content = getResumeContent()
  content?.removeEventListener('click', handleResumeClick, true)

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
      const content = getResumeContent()
      content?.removeEventListener('click', handleResumeClick, true)
      content?.addEventListener('click', handleResumeClick, true)
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
    min-width: 64px;
    min-height: 64px;
    background: rgba(255, 255, 255, 0.08);
    transition: box-shadow 0.2s ease, outline 0.2s ease, filter 0.2s ease;

    &:hover {
      outline: 2px dashed #409eff !important;
      outline-offset: 4px !important;
      filter: brightness(0.98);
    }
  }

  .resume-avatar-placeholder::before {
    content: '' !important;
  }

  .resume-avatar-image,
  .resume-avatar-placeholder > img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    display: block !important;
    border-radius: inherit !important;
  }

  .resume-avatar-upload-badge {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 2;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(17, 24, 39, 0.78);
    color: #fff;
    font-size: 13px;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .resume-avatar-placeholder:hover > .resume-avatar-upload-badge,
  .resume-avatar-upload-target:hover > .resume-avatar-upload-badge {
    opacity: 1;
  }

  ul.resume-safe-list,
  ol.resume-safe-list,
  .resume-container ul,
  .resume-container ol {
    list-style-position: outside !important;
    margin-left: 0 !important;
    padding-left: 1.45em !important;
  }

  .resume-container ol {
    padding-left: 1.65em !important;
  }

  li.resume-safe-list-item,
  .resume-container li {
    list-style-position: outside !important;
    text-indent: 0 !important;
    padding-left: 0.28em !important;
    margin-left: 0 !important;
    line-height: 1.55 !important;
    overflow: visible !important;
  }

  .resume-container li::marker {
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

  .resume-safe-before-marker {
    text-indent: 0 !important;
    overflow: visible !important;
  }
}

.exporting-pdf {
  .resume-content {
    .resume-avatar-placeholder,
    .resume-avatar-upload-target {
      outline: none !important;
    }

    .resume-avatar-upload-badge {
      display: none !important;
    }
  }
}
</style>
