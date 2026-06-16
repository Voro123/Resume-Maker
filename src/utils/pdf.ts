import html2pdf from 'html2pdf.js'

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
  }
  jsPDF?: {
    unit: string
    format: string | [number, number]
    orientation: 'portrait' | 'landscape'
    compress: boolean
  }
  pagebreak?: {
    mode: string[]
    before?: string
    after?: string
    avoid?: string
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
    logging: false
  },
  jsPDF: {
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
    compress: true
  },
  pagebreak: {
    mode: ['avoid-all', 'css', 'legacy'],
    avoid: 'section, .section, h1, h2, h3, .page-break-avoid'
  }
}

// 生成 PDF
export const generatePDF = async (
  element: HTMLElement,
  options?: Partial<PDFOptions>
): Promise<void> => {
  const finalOptions = {
    ...defaultOptions,
    ...options,
    jsPDF: {
      ...defaultOptions.jsPDF,
      ...options?.jsPDF
    },
    html2canvas: {
      ...defaultOptions.html2canvas,
      ...options?.html2canvas
    }
  } as any

  try {
    // 隐藏分页线等编辑辅助元素
    const elementsToHide = element.querySelectorAll('.page-break-line, .edit-tip, .select-tip')
    const originalDisplays: string[] = []
    elementsToHide.forEach((el) => {
      const htmlEl = el as HTMLElement
      originalDisplays.push(htmlEl.style.display)
      htmlEl.style.display = 'none'
    })
    
    // 生成前注入打印优化样式
    injectPrintStyles(element)
    
    // 等待样式应用
    await new Promise(resolve => setTimeout(resolve, 100))
    
    await html2pdf().set(finalOptions).from(element).save()
    
    // 恢复元素的显示
    elementsToHide.forEach((el, index) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.display = originalDisplays[index] || ''
    })
  } catch (error) {
    console.error('PDF 生成失败:', error)
    throw new Error('PDF 生成失败，请重试')
  }
}

// 预览 PDF（在新窗口打开）
export const previewPDF = async (
  element: HTMLElement,
  options?: Partial<PDFOptions>
): Promise<void> => {
  const finalOptions = {
    ...defaultOptions,
    ...options,
    jsPDF: {
      ...defaultOptions.jsPDF,
      ...options?.jsPDF
    },
    html2canvas: {
      ...defaultOptions.html2canvas,
      ...options?.html2canvas
    }
  } as any

  try {
    // 隐藏分页线等编辑辅助元素
    const elementsToHide = element.querySelectorAll('.page-break-line, .edit-tip, .select-tip')
    const originalDisplays: string[] = []
    elementsToHide.forEach((el) => {
      const htmlEl = el as HTMLElement
      originalDisplays.push(htmlEl.style.display)
      htmlEl.style.display = 'none'
    })
    
    // 生成前注入打印优化样式
    injectPrintStyles(element)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const pdf = await html2pdf().set(finalOptions).from(element).outputPdf()
    const blob = new Blob([pdf], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    
    // 恢复元素的显示
    elementsToHide.forEach((el, index) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.display = originalDisplays[index] || ''
    })
    
    // 延迟释放 URL 对象
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  } catch (error) {
    console.error('PDF 预览失败:', error)
    throw new Error('PDF 预览失败，请重试')
  }
}

// 注入打印优化样式到指定元素
export const injectPrintStyles = (element?: HTMLElement) => {
  const styleId = 'resume-print-styles'
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    /* 打印样式优化 */
    @media print {
      /* 避免元素内部分页 */
      section, 
      .section,
      .page-break-avoid,
      h1, h2, h3, h4 {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* 避免标题单独在页面底部 */
      h1, h2, h3, h4, .section-title {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }
      
      /* 避免在表格行之间分页 */
      tr, td, th {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      
      /* 设置页面边距 */
      @page {
        margin: 0;
        size: A4;
      }
      
      /* 隐藏不必要元素 */
      .no-print, 
      button, 
      .el-button,
      nav, 
      header:not(.resume-header) {
        display: none !important;
      }
      
      /* 确保背景色打印 */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* 强制清除外层容器的padding/margin，防止AI生成的内容导致白边 */
      body,
      .page-wrapper,
      .resume-container,
      .resume-content,
      [class*="wrapper"],
      [class*="container"] {
        padding: 0 !important;
        margin: 0 !important;
      }
    }
    
    /* 屏幕预览时也应用样式 */
    .resume-content {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }
    
    /* 强制清除预览时外层容器的padding/margin */
    .resume-content body,
    .resume-content .page-wrapper,
    .resume-content .resume-container,
    .resume-content [class*="wrapper"],
    .resume-content [class*="container"] {
      padding: 0 !important;
      margin: 0 !important;
    }
  `
  
  // 如果已存在则先移除
  const existingStyle = document.getElementById(styleId)
  if (existingStyle) {
    existingStyle.remove()
  }
  
  if (element) {
    // 将样式插入到元素的父级或head
    const parent = element.ownerDocument?.head || document.head
    parent.appendChild(style)
  } else {
    document.head.appendChild(style)
  }
}

// 检测并优化分页
export const optimizePageBreaks = (element: HTMLElement) => {
  if (!element) return
  
  // 为所有 section 添加避免分页的 class
  const sections = element.querySelectorAll('section, .section, div[class*="section"]')
  sections.forEach((el) => {
    const htmlEl = el as HTMLElement
    htmlEl.classList.add('page-break-avoid')
    htmlEl.style.breakInside = 'avoid'
    htmlEl.style.pageBreakInside = 'avoid'
  })
  
  // 为所有标题添加避免底部孤立的样式
  const headings = element.querySelectorAll('h1, h2, h3, h4, .section-title')
  headings.forEach((el) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.breakAfter = 'avoid'
    htmlEl.style.pageBreakAfter = 'avoid'
  })
  
  // 为列表项添加避免分页
  const listItems = element.querySelectorAll('li, tr')
  listItems.forEach((el) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.breakInside = 'avoid'
    htmlEl.style.pageBreakInside = 'avoid'
  })
}

