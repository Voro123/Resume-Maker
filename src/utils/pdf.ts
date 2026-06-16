import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface PDFOptions {
  filename?: string
  margin?: number | number[]  // 支持数字（统一边距）或数组 [上, 右, 下, 左]
  image?: {
    type: string
    quality: number
  }
  html2canvas?: {
    scale: number
    useCORS: boolean
    letterRendering: boolean
    logging?: boolean
    backgroundColor?: string
  }
  jsPDF?: {
    unit: string
    format: string | [number, number]
    orientation: 'portrait' | 'landscape'
    compress: boolean
  }
}

// 默认配置（针对A4纸张优化）
const defaultOptions: PDFOptions = {
  filename: '简历.pdf',
  margin: 0, // 无边距，让简历内容填满页面
  image: {
    type: 'jpeg',
    quality: 0.98
  },
  html2canvas: {
    scale: 2, // 提高清晰度
    useCORS: true,
    letterRendering: true,
    logging: false,
    backgroundColor: '#ffffff'
  },
  jsPDF: {
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
    compress: true
  }
}

// 生成 PDF
export const generatePDF = async (
  element: HTMLElement,
  options?: Partial<PDFOptions>
): Promise<void> => {
  const filename = options?.filename || defaultOptions.filename || '简历.pdf'

  const elementsToHide = element.querySelectorAll('.page-break-line, .edit-tip, .select-tip')
  const originalDisplays: string[] = []

  try {
    elementsToHide.forEach((el) => {
      const htmlEl = el as HTMLElement
      originalDisplays.push(htmlEl.style.display)
      htmlEl.style.display = 'none'
    })

    injectPrintStyles(element)
    await new Promise(resolve => setTimeout(resolve, 100))

    const scale = options?.html2canvas?.scale || defaultOptions.html2canvas?.scale || 2

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    } as any)

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    })

    const pageWidthMm = 210
    const pageHeightMm = 297

    // 用 canvas 实际宽度反推一页 A4 在 canvas 中对应的像素高度。
    // 这样不依赖硬编码，和当前导出节点宽度严格匹配。
    const pageHeightPx = Math.floor(canvas.width * pageHeightMm / pageWidthMm)

    let renderedHeight = 0
    let pageIndex = 0

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight)

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight

      const ctx = pageCanvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法创建 PDF 页面画布')
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      )

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.98)

      if (pageIndex > 0) {
        pdf.addPage()
      }

      const imgHeightMm = (sliceHeight * pageWidthMm) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, imgHeightMm)

      renderedHeight += sliceHeight
      pageIndex += 1
    }

    pdf.save(filename)
  } catch (error) {
    console.error('PDF 生成失败:', error)
    throw new Error('PDF 生成失败，请重试')
  } finally {
    elementsToHide.forEach((el, index) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.display = originalDisplays[index] || ''
    })
  }
}

// 预览 PDF（在新窗口打开）
export const previewPDF = async (
  element: HTMLElement,
  options?: Partial<PDFOptions>
): Promise<void> => {
  const elementsToHide = element.querySelectorAll('.page-break-line, .edit-tip, .select-tip')
  const originalDisplays: string[] = []

  try {
    elementsToHide.forEach((el) => {
      const htmlEl = el as HTMLElement
      originalDisplays.push(htmlEl.style.display)
      htmlEl.style.display = 'none'
    })

    injectPrintStyles(element)
    await new Promise(resolve => setTimeout(resolve, 100))

    const scale = options?.html2canvas?.scale || defaultOptions.html2canvas?.scale || 2

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    } as any)

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true
    })

    const pageWidthMm = 210
    const pageHeightMm = 297

    const pageHeightPx = Math.floor(canvas.width * pageHeightMm / pageWidthMm)

    let renderedHeight = 0
    let pageIndex = 0

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight)

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceHeight

      const ctx = pageCanvas.getContext('2d')
      if (!ctx) {
        throw new Error('无法创建 PDF 页面画布')
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      )

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.98)

      if (pageIndex > 0) {
        pdf.addPage()
      }

      const imgHeightMm = (sliceHeight * pageWidthMm) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, imgHeightMm)

      renderedHeight += sliceHeight
      pageIndex += 1
    }

    const blob = new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')

    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch (error) {
    console.error('PDF 预览失败:', error)
    throw new Error('PDF 预览失败，请重试')
  } finally {
    elementsToHide.forEach((el, index) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.display = originalDisplays[index] || ''
    })
  }
}

// 注入打印优化样式到指定元素
export const injectPrintStyles = (element?: HTMLElement) => {
  const styleId = 'resume-print-styles'
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @media print {
      h1, h2, h3, h4,
      .section-title {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }

      tr, td, th {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      @page {
        margin: 0;
        size: A4;
      }

      .no-print,
      button,
      .el-button,
      nav,
      header:not(.resume-header) {
        display: none !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `
  
  // 如果已存在则先移除
  const existingStyle = document.getElementById(styleId)
  if (existingStyle) {
    existingStyle.remove()
  }
  
  const parent = element?.ownerDocument?.head || document.head
  parent.appendChild(style)
}
