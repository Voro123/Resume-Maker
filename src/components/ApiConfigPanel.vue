<template>
  <div class="api-config-panel">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="支持 OpenAI-compatible Chat Completions 接口；MiniMax 是推荐默认项，也可以切换到其他模型服务商。"
    />

    <el-form label-position="top" class="api-config-form">
      <el-form-item label="模型服务商">
        <el-select v-model="apiConfigForm.provider" style="width: 100%" @change="handleProviderChange">
          <el-option
            v-for="provider in MODEL_PROVIDER_OPTIONS"
            :key="provider.id"
            :label="provider.name"
            :value="provider.id"
          >
            <div class="provider-option">
              <span>{{ provider.name }}</span>
              <el-tag v-if="provider.recommended" size="small" type="success">推荐</el-tag>
            </div>
          </el-option>
        </el-select>
        <div class="api-provider-desc">{{ selectedProvider.description }}</div>
      </el-form-item>

      <el-form-item label="API Key">
        <el-input
          v-model="apiConfigForm.apiKey"
          type="password"
          :placeholder="selectedProvider.apiKeyPlaceholder"
          show-password
          clearable
        />
      </el-form-item>

      <el-form-item label="Base URL">
        <el-input
          v-model="apiConfigForm.baseURL"
          placeholder="例如：https://api.minimaxi.com/v1"
          clearable
        />
      </el-form-item>

      <el-form-item label="模型名称">
        <el-select
          v-model="apiConfigForm.model"
          filterable
          allow-create
          default-first-option
          style="width: 100%"
          placeholder="请选择或输入模型名"
        >
          <el-option
            v-for="model in selectedProvider.models"
            :key="model"
            :label="model"
            :value="model"
          />
        </el-select>
        <div class="api-provider-desc">可以直接输入其他兼容模型名；推荐先使用 {{ DEFAULT_API_PROVIDER.name }}。</div>
      </el-form-item>

      <div class="api-actions">
        <el-button type="primary" :disabled="!apiConfigForm.apiKey || !apiConfigForm.baseURL || !apiConfigForm.model" @click="handleSaveApiConfig">
          <el-icon><Check /></el-icon>
          保存 API 配置
        </el-button>
        <el-button plain @click="handleResetApiConfig">清空配置</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { APIConfig, APIProvider } from '@/types/resume'
import {
  DEFAULT_API_CONFIG,
  DEFAULT_API_PROVIDER,
  MODEL_PROVIDER_OPTIONS,
  getProviderOption
} from '@/config/modelProviders'

const emit = defineEmits<{
  saved: []
  reset: []
}>()

const API_CONFIG_KEY = 'chat-api-config'

const apiConfigForm = reactive<APIConfig>({ ...DEFAULT_API_CONFIG })

const selectedProvider = computed(() => {
  return getProviderOption(apiConfigForm.provider, apiConfigForm.baseURL)
})

const notifyApiConfigChanged = () => {
  window.dispatchEvent(new CustomEvent('resume-api-config-changed'))
}

const resetApiForm = () => {
  Object.assign(apiConfigForm, { ...DEFAULT_API_CONFIG })
}

const loadApiConfig = () => {
  resetApiForm()
  const savedConfig = localStorage.getItem(API_CONFIG_KEY)
  if (!savedConfig) return

  try {
    const parsed = JSON.parse(savedConfig) as Partial<APIConfig>
    const provider = getProviderOption(parsed.provider, parsed.baseURL)
    Object.assign(apiConfigForm, {
      provider: parsed.provider || provider.id,
      apiKey: parsed.apiKey || '',
      baseURL: parsed.baseURL || provider.baseURL,
      model: parsed.model || provider.recommendedModel
    })
  } catch (error) {
    console.warn('读取 API 配置失败:', error)
  }
}

const handleProviderChange = (providerId: APIProvider) => {
  const provider = getProviderOption(providerId)
  apiConfigForm.provider = provider.id
  apiConfigForm.baseURL = provider.baseURL
  apiConfigForm.model = provider.recommendedModel
}

const handleSaveApiConfig = () => {
  if (!apiConfigForm.apiKey) {
    ElMessage.warning('请输入 API Key')
    return
  }
  if (!apiConfigForm.baseURL) {
    ElMessage.warning('请输入 Base URL')
    return
  }
  if (!apiConfigForm.model) {
    ElMessage.warning('请输入模型名称')
    return
  }

  localStorage.setItem(API_CONFIG_KEY, JSON.stringify(apiConfigForm))
  notifyApiConfigChanged()
  emit('saved')
  ElMessage.success('API 配置已保存')
}

const handleResetApiConfig = () => {
  localStorage.removeItem(API_CONFIG_KEY)
  resetApiForm()
  notifyApiConfigChanged()
  emit('reset')
  ElMessage.info('已清空 API 配置')
}

const handleExternalConfigChanged = () => {
  loadApiConfig()
}

onMounted(() => {
  loadApiConfig()
  window.addEventListener('resume-api-config-changed', handleExternalConfigChanged)
})

onBeforeUnmount(() => {
  window.removeEventListener('resume-api-config-changed', handleExternalConfigChanged)
})
</script>

<style scoped lang="scss">
.api-config-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.api-config-form {
  max-width: 560px;
}

.provider-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.api-provider-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
}

.api-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 768px) {
  .api-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
