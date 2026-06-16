<template>
  <div class="editor-container" :class="{ 'exporting-pdf': isExporting }">
    <!-- 左侧：提示词输入 -->
    <div class="editor-left" :class="{ 'collapsed': leftCollapsed }">
      <div class="panel-header">
        <h2>AI 生成</h2>
        <el-button
          class="collapse-btn"
          :icon="leftCollapsed ? 'Expand' : 'Fold'"
          @click="leftCollapsed = !leftCollapsed"
        />
      </div>
      
      <div class="panel-content" v-show="!leftCollapsed">
        <!-- 提示词模板选择器 -->
        <PromptTemplateSelector />
      </div>
    </div>

    <!-- 中间：简历预览 -->
    <div class="editor-center">
      <div class="panel-header">
        <h2>实时预览</h2>
        <div class="header-actions">
          <el-button type="primary" @click="handleExportPDF">
            <el-icon><Download /></el-icon>
            导出 PDF
          </el-button>
          <el-button @click="handleCopyHTML">
            <el-icon><DocumentCopy /></el-icon>
            复制 HTML
          </el-button>
        </div>
      </div>
      
      <div class="preview-container">
        <ResumePreview ref="previewRef" />
      </div>
    </div>

    <!-- 右侧：AI 对话面板 -->
    <div class="editor-right" :class="{ 'collapsed': rightCollapsed }">
      <div class="panel-header">
        <el-button
          class="collapse-btn"
          :icon="rightCollapsed ? 'Expand' : 'Fold'"
          @click="rightCollapsed = !rightCollapsed"
        />
        <h2>AI 助手</h2>
      </div>
      
      <div class="panel-content" v-show="!rightCollapsed">
        <!-- AI 对话面板 -->
        <ChatPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Download, DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PromptTemplateSelector from '@/components/PromptTemplateSelector.vue'
import ResumePreview from '@/components/ResumePreview.vue'
import ChatPanel from '@/components/ChatPanel.vue'
import { generatePDF } from '@/utils/pdf'
import { useResumeStore } from '@/stores/resume'

const resumeStore = useResumeStore()
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const previewRef = ref<InstanceType<typeof ResumePreview>>()
const isExporting = ref(false)

// 导出 PDF
const handleExportPDF = async () => {
  if (!resumeStore.isGenerated) {
    ElMessage.warning('请先生成简历')
    return
  }

  const previewElement = previewRef.value?.getPreviewElement()
  if (!previewElement) {
    ElMessage.warning('预览组件未就绪')
    return
  }

  // 进入导出模式 - 隐藏其他界面元素
  isExporting.value = true

  try {
    // 弹出二次确认弹窗
    await ElMessageBox.confirm(
      '确认导出 PDF？\n\n提示：系统已自动隐藏其他界面元素，确保导出的 PDF 只包含简历内容。',
      '导出 PDF',
      {
        confirmButtonText: '确认导出',
        cancelButtonText: '取消',
        type: 'info',
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true
            
            // 先关闭弹窗
            done()
            
            // 延时 500ms 等待灰度蒙版完全消失后再导出
            setTimeout(() => {
              // 执行 PDF 导出
              generatePDF(previewElement, {
                filename: `${resumeStore.resumeMeta.title || '简历'}.pdf`
              })
                .then(() => {
                  ElMessage.success('PDF 导出成功')
                })
                .catch((error: any) => {
                  ElMessage.error(error.message || 'PDF 导出失败')
                })
                .finally(() => {
                  instance.confirmButtonLoading = false
                  // 导出完成后退出导出模式
                  isExporting.value = false
                })
            }, 500)
          } else {
            // 用户取消，退出导出模式并关闭弹窗
            isExporting.value = false
            done()
          }
        }
      }
    )
  } catch (error) {
    // 用户取消操作（点击取消按钮或关闭弹窗），退出导出模式
    isExporting.value = false
  }
}

// 复制HTML
const handleCopyHTML = async () => {
  if (!resumeStore.generatedHTML) {
    ElMessage.warning('没有可复制的内容')
    return
  }

  try {
    await navigator.clipboard.writeText(resumeStore.generatedHTML)
    ElMessage.success('HTML 代码已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped lang="scss">
.editor-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f7fa;
}

// ==================== 左侧面板 ====================
.editor-left {
  width: 400px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  
  &.collapsed {
    width: 50px;
    
    .panel-content {
      display: none;
    }
  }
}

// ==================== 中间面板 ====================
.editor-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0; // 防止flex子元素溢出
}

// ==================== 右侧面板 ====================
.editor-right {
  width: 420px;
  background: white;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  
  &.collapsed {
    width: 50px;
    
    .panel-content {
      display: none;
    }
  }
  
  .panel-header {
    h2 {
      flex: 1;
      text-align: center;
    }
  }
}

// ==================== 通用面板样式 ====================
.panel-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  flex-shrink: 0;
  
  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0;
  }
}

.header-actions {
  display: flex;
  gap: 10px;
}

.collapse-btn {
  padding: 5px;
}

.panel-content {
  flex: 1;
  overflow: hidden; // 改为 hidden，让子组件自己处理滚动
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.preview-container {
  flex: 1;
  overflow: hidden;  // 移除滚动，让 ResumePreview 组件自己处理滚动
  padding: 20px;
  background: #f0f2f5;
}

/* ==================== 导出 PDF 模式 ==================== */
.exporting-pdf {
  // 隐藏左侧面板
  .editor-left {
    display: none !important;
  }
  
  // 隐藏右侧面板
  .editor-right {
    display: none !important;
  }
  
  // 隐藏头部操作按钮
  .header-actions {
    display: none !important;
  }
  
  // 隐藏中间面板的边框和背景，只保留简历内容
  .editor-center {
    .panel-header {
      display: none !important;
    }
    
    // 移除预览容器的背景和内边距
    .preview-container {
      padding: 0;
      background: white;
    }
  }
  
  // 隐藏编辑提示、选择提示和分页线（使用深度选择器覆盖scoped样式）
  :deep(.edit-tip),
  :deep(.select-tip),
  :deep(.page-break-line) {
    display: none !important;
  }
  
  // 隐藏动态创建的蒙层元素（通过全局样式）
  :deep(.element-select-overlay),
  :deep(.element-selected-overlay) {
    display: none !important;
  }
  
  // 去除简历内容的圆角和阴影（避免PDF导出时出现白色边框）
  :deep(.resume-content) {
    border-radius: 0 !important;
    box-shadow: none !important;
  }
}

/* ==================== 响应式布局 ==================== */
@media (max-width: 1400px) {
  .editor-left {
    width: 350px;
  }
  
  .editor-right {
    width: 380px;
  }
}

@media (max-width: 1200px) {
  .editor-left {
    width: 320px;
  }
  
  .editor-right {
    width: 350px;
  }
}

@media (max-width: 992px) {
  .editor-container {
    flex-direction: column;
  }
  
  .editor-left {
    width: 100%;
    height: auto;
    max-height: 400px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .editor-center {
    flex: 1;
    min-height: 500px;
  }
  
  .editor-right {
    width: 100%;
    height: 450px;
    border-left: none;
    border-top: 1px solid #e4e7ed;
  }
}
</style>
