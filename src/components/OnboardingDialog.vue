<template>
  <el-dialog
    v-model="visible"
    title="先填写简历基础信息"
    width="760px"
    :close-on-click-modal="false"
    class="onboarding-dialog"
  >
    <el-steps :active="activeStep" finish-status="success" align-center>
      <el-step title="基础信息" />
      <el-step title="项目经历" />
      <el-step title="确认生成" />
    </el-steps>

    <div class="dialog-body">
      <div v-if="activeStep === 0" class="step-panel">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="姓名、年龄、联系方式等信息会作为生成简历的真实上下文，后续生成时会自动拼进提示词。"
        />

        <el-form label-position="top" class="basic-form">
          <div class="form-grid">
            <el-form-item label="姓名">
              <el-input v-model="basicInfo.name" placeholder="例如：张三" clearable />
            </el-form-item>
            <el-form-item label="年龄">
              <el-input v-model="basicInfo.age" placeholder="例如：25" clearable />
            </el-form-item>
            <el-form-item label="求职目标/岗位">
              <el-input v-model="basicInfo.targetRole" placeholder="例如：前端工程师" clearable />
            </el-form-item>
            <el-form-item label="所在城市">
              <el-input v-model="basicInfo.city" placeholder="例如：上海" clearable />
            </el-form-item>
            <el-form-item label="电话">
              <el-input v-model="basicInfo.phone" placeholder="例如：138xxxx8888" clearable />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="basicInfo.email" placeholder="例如：name@example.com" clearable />
            </el-form-item>
          </div>

          <el-form-item label="教育背景">
            <el-input
              v-model="basicInfo.education"
              type="textarea"
              :rows="2"
              placeholder="例如：XX大学 / 软件工程 / 本科 / 2020-2024"
            />
          </el-form-item>

          <el-form-item label="技能关键词">
            <el-input
              v-model="basicInfo.skills"
              type="textarea"
              :rows="2"
              placeholder="例如：Vue3、TypeScript、Node.js、性能优化、组件库开发"
            />
          </el-form-item>

          <el-form-item label="个人总结 / 求职亮点">
            <el-input
              v-model="basicInfo.selfSummary"
              type="textarea"
              :rows="3"
              placeholder="用一两句话描述你的优势，例如：有完整项目从 0 到 1 落地经验，擅长复杂表单和可视化编辑器。"
            />
          </el-form-item>
        </el-form>
      </div>

      <div v-else-if="activeStep === 1" class="step-panel">
        <el-radio-group v-model="projectMode" class="mode-switch">
          <el-radio-button label="manual">直接填写</el-radio-button>
          <el-radio-button label="qa">AI 问答挖掘</el-radio-button>
        </el-radio-group>

        <div v-if="projectMode === 'manual'" class="manual-panel">
          <el-input
            v-model="projectDraft"
            type="textarea"
            :rows="12"
            placeholder="请写下你的项目经历。建议包含：项目名称、时间、角色、技术栈、你负责的内容、最终结果/指标。"
          />
          <div class="tip-text">
            写得粗糙也没关系，点击“AI 优化项目经历”后会尝试改成更适合简历的表达。
          </div>
        </div>

        <div v-else class="qa-panel">
          <div class="question-card">
            <div class="question-index">问题 {{ currentQuestionIndex + 1 }} / {{ projectQuestions.length }}</div>
            <h3>{{ currentQuestion.question }}</h3>
            <p>{{ currentQuestion.helper }}</p>
            <el-input
              v-model="qaAnswers[currentQuestionIndex]"
              type="textarea"
              :rows="5"
              :placeholder="currentQuestion.placeholder"
            />
          </div>

          <div class="qa-actions">
            <el-button :disabled="currentQuestionIndex === 0" @click="currentQuestionIndex--">上一题</el-button>
            <el-button v-if="currentQuestionIndex < projectQuestions.length - 1" type="primary" @click="currentQuestionIndex++">下一题</el-button>
            <el-button v-else type="success" @click="buildProjectFromQa">生成项目草稿</el-button>
          </div>

          <el-input
            v-model="projectDraft"
            type="textarea"
            :rows="8"
            placeholder="问答生成的项目草稿会出现在这里，你也可以继续手动修改。"
          />
        </div>

        <div class="polish-actions">
          <el-button type="primary" plain :loading="isPolishing" @click="handlePolishProject">
            <el-icon><MagicStick /></el-icon>
            AI 优化项目经历
          </el-button>
          <span class="tip-text">需要先在左侧配置 API Key；未配置时仍可保存原始草稿。</span>
        </div>
      </div>

      <div v-else class="step-panel preview-panel">
        <el-alert
          type="success"
          :closable="false"
          show-icon
          title="确认后，这些信息会在生成简历时自动作为上下文使用。你也可以稍后重新填写。"
        />

        <h3>基础信息</h3>
        <div class="preview-box">
          <p><strong>姓名：</strong>{{ basicInfo.name || '未填写' }}</p>
          <p><strong>年龄：</strong>{{ basicInfo.age || '未填写' }}</p>
          <p><strong>求职目标：</strong>{{ basicInfo.targetRole || '未填写' }}</p>
          <p><strong>联系方式：</strong>{{ contactPreview || '未填写' }}</p>
          <p><strong>教育背景：</strong>{{ basicInfo.education || '未填写' }}</p>
          <p><strong>技能：</strong>{{ basicInfo.skills || '未填写' }}</p>
          <p><strong>总结：</strong>{{ basicInfo.selfSummary || '未填写' }}</p>
        </div>

        <h3>项目经历</h3>
        <div class="preview-box project-preview">
          {{ projectDraft || '未填写' }}
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleSkip">稍后填写</el-button>
        <div>
          <el-button v-if="activeStep > 0" @click="activeStep--">上一步</el-button>
          <el-button v-if="activeStep < 2" type="primary" @click="activeStep++">下一步</el-button>
          <el-button v-else type="primary" @click="handleSave">保存并开始生成</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { CandidateBasicInfo, ProjectExperienceSource } from '@/types/resume'
import { generateResumeDataViaBackend } from '@/utils/backend-api'
import { useOnboardingStore } from '@/stores/onboarding'

const onboardingStore = useOnboardingStore()

const visible = ref(false)
const activeStep = ref(0)
const projectMode = ref<'manual' | 'qa'>('manual')
const currentQuestionIndex = ref(0)
const projectDraft = ref('')
const qaAnswers = ref<string[]>([])
const isPolishing = ref(false)

const basicInfo = reactive<CandidateBasicInfo>(onboardingStore.createEmptyBasicInfo())

const projectQuestions = [
  {
    question: '这个项目叫什么？解决了什么问题？',
    helper: '描述业务背景、目标用户、核心痛点。',
    placeholder: '例如：企业内部低代码表单平台，解决运营人员无法自主搭建活动表单的问题。'
  },
  {
    question: '你在项目中担任什么角色？负责哪些模块？',
    helper: '重点写你直接负责的工作，而不是团队整体做了什么。',
    placeholder: '例如：担任前端核心开发，负责拖拽编辑器、动态渲染器、权限控制和发布流程。'
  },
  {
    question: '用了哪些技术栈或关键方案？',
    helper: '可以包含框架、工程化、性能优化、AI 能力、后端/数据库等。',
    placeholder: '例如：Vue3、TypeScript、Pinia、Element Plus、JSON Schema、虚拟滚动、组件懒加载。'
  },
  {
    question: '项目有哪些难点？你是怎么解决的？',
    helper: '简历里最有价值的是“难点 + 方法 + 结果”。',
    placeholder: '例如：复杂表单联动性能差，通过依赖图和按需渲染把首屏渲染时间降低 40%。'
  },
  {
    question: '最终结果如何？有没有可量化指标？',
    helper: '尽量补充数据：效率提升、用户量、准确率、耗时下降、成本减少等。',
    placeholder: '例如：上线后服务 20+ 业务活动，表单搭建时间从 2 天缩短到 30 分钟。'
  }
]

const currentQuestion = computed(() => projectQuestions[currentQuestionIndex.value])

const contactPreview = computed(() => {
  return [basicInfo.phone, basicInfo.email, basicInfo.city].filter(Boolean).join(' / ')
})

const restoreProfile = () => {
  if (!onboardingStore.profile) return

  Object.assign(basicInfo, onboardingStore.profile.basicInfo)
  projectDraft.value = onboardingStore.profile.projectExperience
  projectMode.value = onboardingStore.profile.projectSource === 'qa' ? 'qa' : 'manual'
}

const buildProjectFromQa = () => {
  const lines = projectQuestions
    .map((item, index) => {
      const answer = qaAnswers.value[index]?.trim()
      return answer ? `【${item.question}】\n${answer}` : ''
    })
    .filter(Boolean)

  projectDraft.value = lines.join('\n\n')
  projectMode.value = 'manual'
  ElMessage.success('已根据问答生成项目草稿，可继续编辑或使用 AI 优化')
}

const formatProjectList = (projects: Array<Record<string, unknown>>) => {
  return projects
    .map((project) => {
      const name = String(project.name || '未命名项目')
      const role = String(project.role || '')
      const dateRange = [project.startDate, project.endDate].filter(Boolean).join(' - ')
      const techStack = Array.isArray(project.techStack) ? project.techStack.join('、') : String(project.techStack || '')
      const description = String(project.description || '')

      return [
        `项目名称：${name}`,
        role ? `担任角色：${role}` : '',
        dateRange ? `项目时间：${dateRange}` : '',
        techStack ? `技术栈：${techStack}` : '',
        description ? `项目描述：${description}` : ''
      ].filter(Boolean).join('\n')
    })
    .join('\n\n')
}

const buildPolishPrompt = () => {
  return `请基于以下候选人信息，提炼并优化项目经历。要求：\n1. 项目经历要适合简历展示，突出职责、技术方案、难点和结果。\n2. 尽量使用动作动词和可量化表达。\n3. 不要编造与用户描述明显冲突的信息；缺少指标时可写成“提升了交付效率”等保守表达。\n\n基础信息：\n${JSON.stringify(basicInfo, null, 2)}\n\n项目草稿：\n${projectDraft.value}`
}

const handlePolishProject = async () => {
  if (!projectDraft.value.trim()) {
    ElMessage.warning('请先填写或通过问答生成项目经历')
    return
  }

  const apiConfig = JSON.parse(localStorage.getItem('chat-api-config') || '{}')
  if (!apiConfig.apiKey) {
    ElMessage.warning('请先在左侧配置 API Key，再使用 AI 优化')
    return
  }

  isPolishing.value = true
  try {
    const data = await generateResumeDataViaBackend(apiConfig, buildPolishPrompt(), {
      personal: {
        name: basicInfo.name,
        avatar: '',
        title: basicInfo.targetRole,
        phone: basicInfo.phone,
        email: basicInfo.email,
        location: basicInfo.city,
        website: ''
      },
      rawText: projectDraft.value,
      generatedHTML: '',
      generatedCSS: ''
    }) as { projects?: Array<Record<string, unknown>> }

    if (data.projects?.length) {
      projectDraft.value = formatProjectList(data.projects)
      ElMessage.success('AI 已优化项目经历')
    } else {
      ElMessage.warning('AI 未返回项目经历，请补充更多项目信息后重试')
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI 优化失败'
    ElMessage.error(message)
  } finally {
    isPolishing.value = false
  }
}

const handleSave = () => {
  const projectSource: ProjectExperienceSource = projectMode.value === 'qa' ? 'qa' : 'manual'
  onboardingStore.saveProfile(basicInfo, projectDraft.value, projectSource)
  visible.value = false
  ElMessage.success('基础信息已保存，生成简历时会自动带入')
}

const handleSkip = () => {
  onboardingStore.markCompleted()
  visible.value = false
  ElMessage.info('已跳过首次引导，可稍后重新填写')
}

onMounted(() => {
  onboardingStore.loadFromLocalStorage()
  restoreProfile()
  visible.value = onboardingStore.needsOnboarding
})
</script>

<style scoped lang="scss">
.dialog-body {
  margin-top: 24px;
  min-height: 480px;
}

.step-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.basic-form {
  margin-top: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.mode-switch {
  align-self: flex-start;
}

.question-card {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #f8fafc;

  h3 {
    margin: 6px 0 8px;
    font-size: 16px;
    color: #303133;
  }

  p {
    margin: 0 0 12px;
    color: #606266;
    line-height: 1.5;
  }
}

.question-index,
.tip-text {
  font-size: 12px;
  color: #909399;
}

.qa-panel,
.manual-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qa-actions,
.polish-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-panel h3 {
  margin: 6px 0 0;
  font-size: 15px;
  color: #303133;
}

.preview-box {
  padding: 14px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  line-height: 1.7;
  white-space: pre-wrap;

  p {
    margin: 0 0 4px;
  }
}

.project-preview {
  max-height: 180px;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .qa-actions,
  .polish-actions,
  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
