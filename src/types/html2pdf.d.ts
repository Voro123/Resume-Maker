declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    filename?: string
    margin?: number
    image?: {
      type: string
      quality: number
    }
    html2canvas?: {
      scale: number
      useCORS: boolean
      letterRendering: boolean
    }
    jsPDF?: {
      unit: string
      format: string
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

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf
    from(element: HTMLElement): Html2Pdf
    save(): Promise<void>
    outputPdf(): Promise<Uint8Array>
  }

  function html2pdf(): Html2Pdf
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Promise<void>

  export default html2pdf
}
