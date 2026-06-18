<template>
  <div class="config-backup-panel">
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="导出的配置文件会包含本机保存的 API Key，请只在自己的设备之间迁移，不要发给他人。"
    />

    <div class="backup-card">
      <div class="backup-info">
        <h3>导出配置项</h3>
        <p>将 API 配置、候选人基础信息、项目经历和首次引导状态导出为 JSON 文件。</p>
      </div>
      <el-button type="primary" @click="handleExportConfig">导出配置</el-button>
    </div>

    <div class="backup-card">
      <div class="backup-info">
        <h3>导入配置项</h3>
        <p>选择之前导出的 JSON 文件，导入后会覆盖当前浏览器中的对应配置。</p>
      </div>
      <input ref="fileInputRef" class="backup-file-input" type="file" accept="application/json,.json" @change="handleImportFileChange" />
      <el-button plain @click="fileInputRef?.click()">导入配置</el-button>
    </div>

    <div class="backup-detail">
      <strong>包含内容：</strong>
      <span>API Key / 模型配置、候选人基础信息、多个项目经历、是否已完成首次引导。</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useOnboardingStore } from '@/stores/onboarding'

const emit = defineEmits<{
  imported: []
}>()

const onboardingStore = useOnboardingStore()
const fileInputRef = ref<HTMLInputElement>()

const CONFIG_VERSION = 1
const API_CONFIG_KEY = 'chat-api-config'
const ONBOARDING_PROFILE_KEY = 'resume-onboarding-profile'
const ONBOARDING_COMPLETED_KEY = 'resume-onboarding-completed'

interface ResumeMakerBackupFile {
  app: 'resume-maker'
  version: number
  exportedAt: string
  localStorage: Record<string, string | null>
}

const safeFileNamePart = (value: string) => value.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '')

const downloadJsonFile = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const handleExportConfig = () => {
  onboardingStore.loadFromLocalStorage()

  const backup: ResumeMakerBackupFile = {
    app: 'resume-maker',
    version: CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: {
      [API_CONFIG_KEY]: localStorage.getItem(API_CONFIG_KEY),
      [ONBOARDING_PROFILE_KEY]: localStorage.getItem(ONBOARDING_PROFILE_KEY),
      [ONBOARDING_COMPLETED_KEY]: localStorage.getItem(ONBOARDING_COMPLETED_KEY)
    }
  }

  const name = onboardingStore.profile?.basicInfo.name || 'resume-maker'
  const filename = `${safeFileNamePart(name) || 'resume-maker'}-config-${new Date().toISOString().slice(0, 10)}.json`
  downloadJsonFile(filename, backup)
  ElMessage.success('配置已导出')
}

const isBackupFile = (value: unknown): value is ResumeMakerBackupFile => {
  if (!value || typeof value !== 'object') return false

  const data = value as Partial<ResumeMakerBackupFile>
  return data.app === 'resume-maker' && typeof data.version === 'number' && Boolean(data.localStorage && typeof data.localStorage === 'object')
}

const restoreLocalStorageValue = (key: string, value: string | null | undefined) => {
  if (value === null || typeof value === 'undefined') {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(key, value)
}

const importBackup = async (backup: ResumeMakerBackupFile) => {
  await ElMessageBox.confirm(
    '导入后会覆盖当前浏览器中已保存的 API 配置和候选人信息。确认继续？',
    '导入配置项',
    {
      confirmButtonText: '确认导入',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )

  restoreLocalStorageValue(API_CONFIG_KEY, backup.localStorage[API_CONFIG_KEY])
  restoreLocalStorageValue(ONBOARDING_PROFILE_KEY, backup.localStorage[ONBOARDING_PROFILE_KEY])
  restoreLocalStorageValue(ONBOARDING_COMPLETED_KEY, backup.localStorage[ONBOARDING_COMPLETED_KEY] ?? 'true')

  onboardingStore.loadFromLocalStorage()
  window.dispatchEvent(new CustomEvent('resume-api-config-changed'))
  emit('imported')
  ElMessage.success('配置已导入')
}

const handleImportFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''))
      if (!isBackupFile(parsed)) {
        ElMessage.error('配置文件格式不正确')
        return
      }

      await importBackup(parsed)
    } catch (error) {
      if (error === 'cancel') return
      ElMessage.error('导入失败，请确认文件是否为有效 JSON 配置文件')
    } finally {
      input.value = ''
    }
  }
  reader.onerror = () => {
    ElMessage.error('读取配置文件失败')
    input.value = ''
  }
  reader.readAsText(file)
}
</script>

<style scoped lang="scss">
.config-backup-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.backup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #fafafa;
}

.backup-info {
  min-width: 0;

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    color: #303133;
  }

  p {
    margin: 0;
    color: #606266;
    line-height: 1.5;
    font-size: 13px;
  }
}

.backup-detail {
  padding: 12px 14px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.backup-file-input {
  display: none;
}

@media (max-width: 768px) {
  .backup-card {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
