/**
 * @deprecated 此文件已废弃！
 * 
 * 原因：此文件中的 AIService 类会直接在前端调用 AI API，
 * 导致 API Key 暴露在前端代码中（可被用户查看源码获取）。
 * 
 * 请使用 `backend-api.ts` 通过后端代理调用 AI API，
 * 这样 API Key 只会存储在后端的 Python 代码中，更安全。
 * 
 * 如果需要进行 API 调用，请使用以下函数：
 * - generateResumeViaBackend() - 生成简历
 * - optimizeResumeViaBackend() - 优化简历
 * - beautifyStyleViaBackend() - 美化简历样式
 */

// 此文件保留仅为了兼容性，所有功能已迁移到 backend-api.ts
// 如需使用，请导入 backend-api.ts 中的函数

export {}
