<template>
  <div class="prompt-template-selector">
    <!-- 上部区域：弹性填充 -->
    <div class="selector-main">
      <!-- API 配置（最高优先级） -->
      <div v-if="!isConfigured" class="api-config-section">
      <el-alert type="warning" :closable="false" show-icon title="请先配置 API" style="margin-bottom: 15px" />
      
      <div class="config-form">
        <el-form label-position="top" size="default">
          <el-form-item label="API Key">
            <el-input 
              v-model="configForm.apiKey" 
              type="password" 
              placeholder="请输入 MiniMax API Key"
              show-password
              clearable
            />
          </el-form-item>
          
          <el-form-item label="模型选择">
            <el-select v-model="configForm.model" style="width: 100%">
              <el-option label="MiniMax-M3" value="MiniMax-M3" />
              <!-- 后续可在此添加更多模型 -->
            </el-select>
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              @click="handleSaveConfig"
              :disabled="!configForm.apiKey"
              style="width: 100%"
            >
              <el-icon><Check /></el-icon>
              保存配置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <el-divider />
    </div>

    <!-- 已配置状态 -->
    <div v-else class="config-status">
      <el-tag type="success" size="small">
        <el-icon><Check /></el-icon>
        API 已配置 ({{ configForm.model }})
      </el-tag>
      <el-button type="text" size="small" @click="handleResetConfig">修改配置</el-button>
      
      <el-divider style="margin: 10px 0" />
    </div>

    <!-- 分类筛选（仅在已配置时显示） -->
    <div v-if="isConfigured" class="category-tabs">
      <el-radio-group v-model="selectedCategory" size="small">
        <el-radio-button 
          v-for="cat in categories" 
          :key="cat.id" 
          :label="cat.id"
        >
          {{ cat.name }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 模板列表（仅在已配置时显示） -->
    <div v-if="isConfigured" class="template-list">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
        :class="{ active: selectedTemplate?.id === template.id }"
        @click="handleSelect(template)"
      >
        <div class="template-icon">{{ template.icon || '📄' }}</div>
        <div class="template-info">
          <h4>{{ template.name }}</h4>
          <p>{{ template.description }}</p>
        </div>
      </div>
    </div>
    </div>  <!-- 关闭 selector-main -->

    <!-- 底部区域：提示词编辑 + 操作按钮 -->
    <div v-if="isConfigured" class="selector-bottom">
      <!-- 选中的模板的提示词预览 -->
      <div v-if="selectedTemplate && selectedTemplate.id !== 'custom'" class="prompt-preview">
        <el-divider content-position="left">
          <span class="preview-title">
            提示词编辑
            <el-tag size="small" type="info" style="margin-left: 8px">可编辑部分</el-tag>
          </span>
        </el-divider>
        
        <div class="fixed-prompt-notice">
          <el-alert type="info" :closable="false" show-icon>
            <template #title>
              系统已自动添加固定指令（不可修改）：输出完整HTML、A4尺寸、内联CSS等
            </template>
          </el-alert>
        </div>

        <el-input
          v-model="editablePrompt"
          type="textarea"
          :rows="10"
          placeholder="可编辑的提示词内容..."
        />

        <div class="prompt-tip">
          <el-icon><InfoFilled /></el-icon>
          您正在编辑的是简历的设计要求和内容模块，系统会自动组合固定指令一起发送给AI。
        </div>
      </div>

      <!-- 自定义提示词 -->
      <div v-if="selectedTemplate?.id === 'custom'" class="custom-prompt">
        <el-input
          v-model="customPrompt"
          type="textarea"
          :rows="10"
          placeholder="请输入自定义提示词，例如：生成一份前端工程师的简历，要求简洁专业，突出React和TypeScript经验..."
        />
        <div class="prompt-tip">
          <el-icon><InfoFilled /></el-icon>
          提示：系统会自动添加输出格式要求（如输出完整HTML、A4尺寸等），您只需描述简历内容和风格。
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button 
          type="primary" 
          size="large" 
          :loading="isGenerating"
          :disabled="!canGenerate"
          @click="handleGenerate"
          style="width: 100%"
        >
          <el-icon><MagicStick /></el-icon>
          {{ isGenerating ? '正在生成...' : '生成简历' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { MagicStick, Check, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { promptTemplates, getCategories } from '@/config/promptTemplates'
import { useResumeStore } from '@/stores/resume'
import type { PromptTemplate } from '@/types/resume'

const resumeStore = useResumeStore()

// API 配置表单
const configForm = ref({
  apiKey: '',
  baseURL: 'https://api.minimaxi.com/v1',
  model: 'MiniMax-M3'
})

// 是否已配置
const isConfigured = ref(false)

// 分类和模板
const categories = ref(getCategories())
const selectedCategory = ref('all')
const selectedTemplate = ref<PromptTemplate | null>(null)
const customPrompt = ref('')
const editablePrompt = ref('')
const isGenerating = ref(false)

// 过滤后的模板列表
const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return promptTemplates
  }
  return promptTemplates.filter(t => t.category === selectedCategory.value)
})

// 是否可以生成
const canGenerate = computed(() => {
  if (!isConfigured.value) return false
  if (selectedTemplate.value?.id === 'custom') {
    return customPrompt.value.trim().length > 0
  }
  return editablePrompt.value.trim().length > 0
})

// 选择模板
const handleSelect = (template: PromptTemplate) => {
  selectedTemplate.value = template
  
  if (template.id === 'custom') {
    customPrompt.value = ''
    editablePrompt.value = ''
  } else {
    // 只加载可编辑部分到编辑框
    editablePrompt.value = template.editablePrompt || ''
    customPrompt.value = ''
  }
}

// 保存 API 配置
const handleSaveConfig = () => {
  if (!configForm.value.apiKey) {
    ElMessage.warning('请输入 API Key')
    return
  }

  // 保存到 localStorage
  localStorage.setItem('chat-api-config', JSON.stringify(configForm.value))
  isConfigured.value = true
  
  ElMessage.success('API 配置成功！')
}

// 重置配置
const handleResetConfig = () => {
  configForm.value = {
    apiKey: '',
    baseURL: 'https://api.minimaxi.com/v1',
    model: 'MiniMax-M3'
  }
  isConfigured.value = false
  localStorage.removeItem('chat-api-config')
  ElMessage.info('已重置 API 配置')
}

// 生成简历 - 组合固定提示词和可编辑提示词
const handleGenerate = async () => {
  if (!canGenerate.value) {
    ElMessage.warning('请先选择或输入提示词')
    return
  }

  const apiConfig = JSON.parse(localStorage.getItem('chat-api-config') || '{}')
  
  if (!apiConfig.apiKey) {
    ElMessage.error('请先配置 API Key')
    isConfigured.value = false
    return
  }

  isGenerating.value = true

  try {
    let fullPrompt = ''

    if (selectedTemplate.value?.id === 'custom') {
      // 自定义模板：组合固定提示词和用户提示词
      const customTemplate = promptTemplates.find(t => t.id === 'custom')
      fullPrompt = (customTemplate?.fixedPrompt || '') + '\n\n## 用户要求：\n' + customPrompt.value
    } else {
      // 预设模板：组合固定提示词和可编辑提示词
      const fixedPrompt = selectedTemplate.value?.fixedPrompt || ''
      fullPrompt = fixedPrompt + '\n\n## 设计要求：\n' + editablePrompt.value
    }

    await resumeStore.generateResume(apiConfig, fullPrompt)
    
    ElMessage.success('简历生成成功！')
  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    isGenerating.value = false
  }
}

// 初始化
onMounted(() => {
  // 检查是否已配置 API
  const savedConfig = localStorage.getItem('chat-api-config')
  if (savedConfig) {
    const config = JSON.parse(savedConfig)
    if (config.apiKey) {
      configForm.value = config
      isConfigured.value = true
    }
  }
  
  // 默认选择第一个模板
  if (promptTemplates.length > 0) {
    handleSelect(promptTemplates[0])
  }
})
</script>

<style scoped lang="scss">
.prompt-template-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

// 上部区域：弹性填充剩余高度
.selector-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 12px;
  
  // 模板列表区域弹性填充
  .template-list {
    flex: 1;
    overflow-y: auto;
    max-height: none; // 覆盖之前的固定高度
  }
}

// 底部区域：提示词编辑 + 操作按钮（固定底部）
.selector-bottom {
  flex-shrink: 0;
  border-top: 1px solid #e4e7ed;
  padding-top: 12px;
  
  // 提示词编辑区域设置最大高度并允许滚动
  .prompt-preview,
  .custom-prompt {
    overflow-y: auto;
    margin-bottom: 12px;
  }
}

// API 配置区域
.api-config-section {
  .config-form {
    .el-form-item {
      margin-bottom: 15px;
    }
  }
}

// 配置状态
.config-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .el-tag {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.category-tabs {
  margin-bottom: 10px;
  
  .el-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  // 注意：max-height 和 overflow 已移到 .selector-main .template-list 中
}

.template-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    border-color: #409eff;
    background: #f5f7fa;
  }
  
  &.active {
    border-color: #409eff;
    background: #ecf5ff;
  }
}

.template-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 5px 0;
  }
  
  p {
    font-size: 12px;
    color: #909399;
    margin: 0;
    line-height: 1.4;
  }
}

// 固定提示词通知
.fixed-prompt-notice {
  margin-bottom: 10px;
}

// 预览标题
.preview-title {
  display: flex;
  align-items: center;
}

// 提示信息
.prompt-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;

  .el-icon {
    margin-top: 2px;
    color: #409eff;
    flex-shrink: 0;
  }
}

.actions {
  padding-top: 10px;
}
</style>
