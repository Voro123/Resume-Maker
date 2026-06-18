<template>
  <div class="config-backup-button">
    <el-button plain @click="visible = true">导入/导出配置</el-button>

    <el-dialog
      v-model="visible"
      title="导入/导出配置项"
      width="640px"
      :close-on-click-modal="false"
    >
      <ConfigBackupPanel @imported="handleImported" />

      <template #footer>
        <el-button @click="visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConfigBackupPanel from '@/components/ConfigBackupPanel.vue'

const visible = ref(false)

const handleImported = () => {
  visible.value = false
}
</script>

<style scoped>
.config-backup-button {
  display: inline-flex;
  align-items: center;
}
</style>
