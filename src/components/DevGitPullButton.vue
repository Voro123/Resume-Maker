<template>
  <div v-if="isDev" class="dev-git-pull-button">
    <el-button size="small" type="primary" plain :loading="isPulling" @click="handlePullLatest">
      {{ isPulling ? '拉取中...' : '拉取最新代码' }}
    </el-button>
    <el-button v-if="lastSuccess" size="small" text @click="reloadPage">刷新页面</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const isDev = import.meta.env.DEV
const isPulling = ref(false)
const lastSuccess = ref(false)

type PullResponse = {
  success: boolean
  stdout?: string
  stderr?: string
  error?: string
}

const handlePullLatest = async () => {
  try {
    await ElMessageBox.confirm(
      '确认执行 git pull 拉取最新代码？\n\n仅本地开发环境可用。拉取完成后建议刷新页面。',
      '拉取最新代码',
      {
        confirmButtonText: '确认拉取',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch {
    return
  }

  isPulling.value = true
  lastSuccess.value = false

  try {
    const response = await fetch('/__dev__/git-pull', {
      method: 'POST'
    })
    const data = (await response.json()) as PullResponse

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.stderr || '拉取失败')
    }

    lastSuccess.value = true
    ElMessage.success(data.stdout?.trim() || '已拉取最新代码，请刷新页面')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '拉取失败'
    ElMessage.error(message)
  } finally {
    isPulling.value = false
  }
}

const reloadPage = () => {
  window.location.reload()
}
</script>

<style scoped lang="scss">
.dev-git-pull-button {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>