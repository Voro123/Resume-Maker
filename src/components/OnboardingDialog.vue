<template>
  <el-dialog
    v-model="visible"
    title="项目设置"
    width="920px"
    :close-on-click-modal="false"
    class="onboarding-dialog"
  >
    <el-tabs v-model="activeSettingsTab" class="settings-tabs">
      <el-tab-pane label="API 配置" name="api">
        <div class="dialog-body api-settings-body">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="API Key 仅保存在浏览器 localStorage 中，用于调用后端生成简历和优化项目经历。"
          />

          <el-form label-position="top" class="api-config-form">
            <el-form-item label="API Key">
              <el-input
                v-model="apiConfigForm.apiKey"
                type="password"
                placeholder="请输入 MiniMax API Key"
                show-password
                clearable
              />
            </el-form-item>

            <el-form-item label="模型选择">
              <el-select v-model="apiConfigForm.model" style="width: 100%">
                <el-option label="MiniMax-M3" value="MiniMax-M3" />
              </el-select>
            </el-form-item>

            <div class="api-actions">
              <el-button type="primary" :disabled="!apiConfigForm.apiKey" @click="handleSaveApiConfig">
                <el-icon><Check /></el-icon>
                保存 API 配置
              </el-button>
              <el-button plain @click="handleResetApiConfig">清空配置</el-button>
            </div>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane label="候选人信息" name="profile">
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
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="默认通过 AI 问答挖掘项目经历；需要精修字段时，可以切换到结构化填写。"
            />

            <div class="project-toolbar">
              <el-tabs v-model="activeProjectId" type="card" class="project-tabs">
                <el-tab-pane
                  v-for="(project, index) in projects"
                  :key="project.id"
                  :name="project.id"
                  :label="project.name || project.company || `项目 ${index + 1}`"
                />
              </el-tabs>
              <div class="project-toolbar-actions">
                <el-button type="primary" plain size="small" @click="addProject">
                  <el-icon><Plus /></el-icon>
                  新增项目
                </el-button>
                <el-button
                  type="danger"
                  plain
                  size="small"
                  :disabled="projects.length <= 1"
                  @click="removeCurrentProject"
                >
                  <el-icon><Delete /></el-icon>
                  删除当前项目
                </el-button>
              </div>
            </div>

            <el-radio-group v-model="projectMode" class="mode-switch">
              <el-radio-button label="qa">AI 问答挖掘</el-radio-button>
              <el-radio-button label="manual">结构化填写</el-radio-button>
            </el-radio-group>

            <div v-if="projectMode === 'qa'" class="qa-panel">
              <div class="question-card">
                <div class="question-index">
                  当前项目：{{ currentProject.name || currentProject.company || currentProjectLabel }} · 问题 {{ currentQuestionIndex + 1 }} / {{ projectQuestions.length }}
                </div>
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
                <el-button v-else type="success" @click="buildProjectFromQa">生成当前项目草稿</el-button>
              </div>
            </div>

            <div v-else class="manual-panel">
              <el-form label-position="top">
                <div class="form-grid">
                  <el-form-item label="公司">
                    <el-input v-model="currentProject.company" placeholder="例如：腾讯 / 字节跳动 / XX 科技有限公司" clearable />
                  </el-form-item>
                  <el-form-item label="部门">
                    <el-input v-model="currentProject.department" placeholder="例如：数据平台部 / AI 应用团队" clearable />
                  </el-form-item>
                  <el-form-item label="项目名称">
                    <el-input v-model="currentProject.name" placeholder="例如：AI 简历生成器" clearable />
                  </el-form-item>
                  <el-form-item label="项目时间">
                    <el-input v-model="currentProject.dateRange" placeholder="例如：2024.03 - 2024.06" clearable />
                  </el-form-item>
                  <el-form-item label="担任角色">
                    <el-input v-model="currentProject.role" placeholder="例如：前端负责人 / 全栈开发" clearable />
                  </el-form-item>
                  <el-form-item label="技术栈">
                    <el-input v-model="currentProject.techStack" placeholder="例如：Vue3、TypeScript、Pinia、Node.js" clearable />
                  </el-form-item>
                </div>

                <el-form-item label="项目简介">
                  <el-input
                    v-model="currentProject.description"
                    type="textarea"
                    :rows="3"
                    placeholder="这个项目面向谁、解决什么问题、核心功能是什么。"
                  />
                </el-form-item>

                <el-form-item label="负责内容">
                  <el-input
                    v-model="currentProject.responsibilities"
                    type="textarea"
                    :rows="4"
                    placeholder="建议写你本人负责的模块、方案设计、开发实现、协作推进等。"
                  />
                </el-form-item>

                <el-form-item label="项目成果 / 量化指标">
                  <el-input
                    v-model="currentProject.achievements"
                    type="textarea"
                    :rows="3"
                    placeholder="例如：将生成耗时降低 30%；支持 10+ 模板；提升投递效率等。没有真实数据时可不填。"
                  />
                </el-form-item>

                <el-form-item label="补充原始信息">
                  <el-input
                    v-model="currentProject.rawNotes"
                    type="textarea"
                    :rows="3"
                    placeholder="写得粗糙也没关系，可以先记录背景、难点、亮点，后续让 AI 优化。"
                  />
                </el-form-item>
              </el-form>
            </div>

            <div class="polish-actions">
              <el-button type="primary" plain :loading="isPolishing" @click="handlePolishProject">
                <el-icon><MagicStick /></el-icon>
                AI 优化全部项目经历
              </el-button>
              <span class="tip-text">需要先配置 API Key；未配置时仍可保存结构化项目。</span>
            </div>
          </div>

          <div v-else class="step-panel preview-panel">
            <el-alert
              type="success"
              :closable="false"
              show-icon
              title="确认后，这些信息会在生成简历时自动作为上下文使用。你也可以稍后通过设置图标重新填写。"
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
              <div v-if="filledProjects.length" class="project-preview-list">
                <div v-for="(project, index) in filledProjects" :key="project.id" class="project-preview-item">
                  <strong>{{ index + 1 }}. {{ project.name || project.company || '未命名项目' }}</strong>
                  <p v-if="project.company">公司：{{ project.company }}</p>
                  <p v-if="project.department">部门：{{ project.department }}</p>
                  <p v-if="project.dateRange">时间：{{ project.dateRange }}</p>
                  <p v-if="project.role">角色：{{ project.role }}</p>
                  <p v-if="project.techStack">技术栈：{{ project.techStack }}</p>
                  <p v-if="project.description">简介：{{ project.description }}</p>
                  <p v-if="project.responsibilities">负责：{{ project.responsibilities }}</p>
                  <p v-if="project.achievements">成果：{{ project.achievements }}</p>
                </div>
              </div>
              <span v-else>未填写</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="配置迁移" name="backup">
        <div class="dialog-body backup-settings-body">
          <ConfigBackupPanel @imported="handleConfigImported" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div v-if="activeSettingsTab === 'profile'" class="dialog-footer">
        <el-button @click="handleSkip">稍后填写</el-button>
        <div>
          <el-button v-if="activeStep > 0" @click="activeStep--">上一步</el-button>
          <el-button v-if="activeStep < 2" type="primary" @click="activeStep++">下一步</el-button>
          <el-button v-else type="primary" @click="handleSave">保存并开始生成</el-button>
        </div>
      </div>
      <div v-else class="dialog-footer api-footer">
        <span class="tip-text">{{ activeSettingsTab === 'api' ? '保存后主界面会自动刷新 API 配置状态。' : '导入配置后会自动刷新本页已保存的信息。' }}</span>
        <el-button @click="visible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Check, Delete, MagicStick, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { CandidateBasicInfo, CandidateProjectExperience } from '@/types/resume'
import ConfigBackupPanel from '@/components/ConfigBackupPanel.vue'
import { generateResumeDataViaBackend } from '@/utils/backend-api'
import { useOnboardingStore } from '@/stores/onboarding'

const onboardingStore = useOnboardingStore()
const API_CONFIG_KEY = 'chat-api-config'

type SettingsTab = 'api' | 'profile' | 'backup'

const visible = ref(false)
const activeSettingsTab = ref<SettingsTab>('api')
const activeStep = ref(0)
const projectMode = ref<'qa' | 'manual'>('qa')
const currentQuestionIndex = ref(0)
const qaAnswers = ref<string[]>([])
const isPolishing = ref(false)
const projects = ref<CandidateProjectExperience[]>([onboardingStore.createEmptyProject()])
const activeProjectId = ref(projects.value[0].id)

const apiConfigForm = reactive({
  apiKey: '',
  baseURL: 'https://api.minimaxi.com/v1',
  model: 'MiniMax-M3'
})

const basicInfo = reactive<CandidateBasicInfo>(onboardingStore.createEmptyBasicInfo())

const projectQuestions = [
  {
    question: '这个项目属于哪家公司、哪个部门？',
    helper: '只填写真实存在的信息；不方便透露或没有公司/部门时可以留空。',
    placeholder: '例如：XX 科技有限公司 / 数据平台部；或：个人项目 / 无部门。'
  },
  {
    question: '这个项目叫什么？解决了什么问题？',
    helper: '描述业务背景、目标用户、核心痛点。',
    placeholder: '例如：企业内部低代码表单平台，解决运营人员无法自主搭建活动表单的问题。'
  },
  {
    question: '项目周期和你的角色是什么？',
    helper: '补充项目时间、团队规模、你的身份和职责范围。',
    placeholder: '例如：2024.03-2024.06，担任前端核心开发，负责编辑器和发布流程。'
  },
  {
    question: '用了哪些技术栈或关键方案？',
    helper: '可以包含框架、工程化、性能优化、AI 能力、后端/数据库等。',
    placeholder: '例如：Vue3、TypeScript、Pinia、Element Plus、JSON Schema、虚拟滚动、组件懒加载。'
  },
  {
    question: '你具体负责了哪些模块？有哪些难点？',
    helper: '简历里最有价值的是“负责内容 + 难点 + 方法”。',
    placeholder: '例如：负责拖拽画布、字段联动和实时预览，通过依赖图解决复杂联动性能问题。'
  },
  {
    question: '最终结果如何？有没有真实的量化指标？',
    helper: '只能填写真实数据；如果没有准确数据，可以写非量化结果或留空。',
    placeholder: '例如：上线后服务 20+ 业务活动；或：提升了团队内部配置效率。'
  }
]

const currentQuestion = computed(() => projectQuestions[currentQuestionIndex.value])

const currentProject = computed<CandidateProjectExperience>(() => {
  return projects.value.find((project) => project.id === activeProjectId.value) || projects.value[0]
})

const currentProjectIndex = computed(() => {
  return Math.max(projects.value.findIndex((project) => project.id === activeProjectId.value), 0)
})

const currentProjectLabel = computed(() => `项目 ${currentProjectIndex.value + 1}`)

const contactPreview = computed(() => {
  return [basicInfo.phone, basicInfo.email, basicInfo.city].filter(Boolean).join(' / ')
})

const hasProjectContent = (project: CandidateProjectExperience) => {
  return Boolean(
    project.company.trim() ||
      project.department.trim() ||
      project.name.trim() ||
      project.dateRange.trim() ||
      project.role.trim() ||
      project.techStack.trim() ||
      project.description.trim() ||
      project.responsibilities.trim() ||
      project.achievements.trim() ||
      project.rawNotes.trim()
  )
}

const filledProjects = computed(() => projects.value.filter(hasProjectContent))

const notifyApiConfigChanged = () => {
  window.dispatchEvent(new CustomEvent('resume-api-config-changed'))
}

const loadApiConfig = () => {
  const savedConfig = localStorage.getItem(API_CONFIG_KEY)
  Object.assign(apiConfigForm, {
    apiKey: '',
    baseURL: 'https://api.minimaxi.com/v1',
    model: 'MiniMax-M3'
  })

  if (!savedConfig) return

  try {
    const parsed = JSON.parse(savedConfig)
    Object.assign(apiConfigForm, {
      apiKey: parsed.apiKey || '',
      baseURL: parsed.baseURL || 'https://api.minimaxi.com/v1',
      model: parsed.model || 'MiniMax-M3'
    })
  } catch (error) {
    console.warn('读取 API 配置失败:', error)
  }
}

const handleSaveApiConfig = () => {
  if (!apiConfigForm.apiKey) {
    ElMessage.warning('请输入 API Key')
    return
  }

  localStorage.setItem(API_CONFIG_KEY, JSON.stringify(apiConfigForm))
  notifyApiConfigChanged()
  ElMessage.success('API 配置已保存')
}

const handleResetApiConfig = () => {
  localStorage.removeItem(API_CONFIG_KEY)
  loadApiConfig()
  notifyApiConfigChanged()
  ElMessage.info('已清空 API 配置')
}

const resetQaState = () => {
  currentQuestionIndex.value = 0
  qaAnswers.value = []
}

const ensureProject = () => {
  if (!projects.value.length) {
    const project = onboardingStore.createEmptyProject()
    projects.value = [project]
    activeProjectId.value = project.id
  }
}

const restoreProfile = () => {
  Object.assign(basicInfo, onboardingStore.createEmptyBasicInfo())
  projects.value = [onboardingStore.createEmptyProject()]
  activeProjectId.value = projects.value[0].id
  projectMode.value = 'qa'
  resetQaState()

  if (!onboardingStore.profile) return

  Object.assign(basicInfo, onboardingStore.profile.basicInfo)
  projects.value = onboardingStore.profile.projects?.length
    ? onboardingStore.profile.projects.map((project) => ({ ...onboardingStore.createEmptyProject(), ...project }))
    : [onboardingStore.createEmptyProject()]
  activeProjectId.value = projects.value[0].id
}

const reloadSavedSettings = () => {
  onboardingStore.loadFromLocalStorage()
  loadApiConfig()
  restoreProfile()
  ensureProject()
}

const openDialog = (event?: Event) => {
  const detail = (event as CustomEvent<{ tab?: SettingsTab }>)?.detail
  reloadSavedSettings()
  activeStep.value = 0
  activeSettingsTab.value = detail?.tab || 'api'
  visible.value = true
}

const handleConfigImported = () => {
  reloadSavedSettings()
  notifyApiConfigChanged()
}

const addProject = () => {
  const project = onboardingStore.createEmptyProject()
  projects.value.push(project)
  activeProjectId.value = project.id
  projectMode.value = 'qa'
  resetQaState()
}

const removeCurrentProject = () => {
  if (projects.value.length <= 1) return

  const removeIndex = currentProjectIndex.value
  const nextProjects = projects.value.filter((project) => project.id !== activeProjectId.value)
  projects.value = nextProjects
  activeProjectId.value = nextProjects[Math.min(removeIndex, nextProjects.length - 1)].id
  resetQaState()
}

const buildProjectFromQa = () => {
  const answers = projectQuestions.map((item, index) => qaAnswers.value[index]?.trim() || '')
  const [companyAndDepartment, overview, roleAndTime, techStack, responsibilities, achievements] = answers

  if (companyAndDepartment) {
    currentProject.value.rawNotes = [currentProject.value.rawNotes, `公司/部门：${companyAndDepartment}`].filter(Boolean).join('\n')
  }
  if (overview) {
    currentProject.value.description = [currentProject.value.description, overview].filter(Boolean).join('\n')
  }
  if (roleAndTime) {
    currentProject.value.rawNotes = [currentProject.value.rawNotes, `时间/角色：${roleAndTime}`].filter(Boolean).join('\n')
  }
  if (techStack && !currentProject.value.techStack) {
    currentProject.value.techStack = techStack
  } else if (techStack) {
    currentProject.value.rawNotes = [currentProject.value.rawNotes, `技术栈补充：${techStack}`].filter(Boolean).join('\n')
  }
  if (responsibilities) {
    currentProject.value.responsibilities = [currentProject.value.responsibilities, responsibilities].filter(Boolean).join('\n')
  }
  if (achievements) {
    currentProject.value.achievements = [currentProject.value.achievements, achievements].filter(Boolean).join('\n')
  }
  currentProject.value.source = 'qa'
  projectMode.value = 'manual'
  resetQaState()
  ElMessage.success('已根据问答补充当前项目，可继续切换到结构化填写精修')
}

const formatProjectsAsText = () => {
  return filledProjects.value
    .map((project, index) => {
      return [
        `项目 ${index + 1}`,
        project.company ? `公司：${project.company}` : '',
        project.department ? `部门：${project.department}` : '',
        project.name ? `项目名称：${project.name}` : '',
        project.dateRange ? `项目时间：${project.dateRange}` : '',
        project.role ? `担任角色：${project.role}` : '',
        project.techStack ? `技术栈：${project.techStack}` : '',
        project.description ? `项目简介：${project.description}` : '',
        project.responsibilities ? `负责内容：${project.responsibilities}` : '',
        project.achievements ? `项目成果：${project.achievements}` : '',
        project.rawNotes ? `补充信息：${project.rawNotes}` : ''
      ].filter(Boolean).join('\n')
    })
    .join('\n\n')
}

const normalizeAiProject = (project: Record<string, unknown>, index: number): CandidateProjectExperience => {
  const techStack = Array.isArray(project.techStack) ? project.techStack.join('、') : String(project.techStack || '')
  const dateRange = [project.startDate, project.endDate].filter(Boolean).join(' - ') || String(project.dateRange || '')
  const responsibilities = Array.isArray(project.responsibilities)
    ? project.responsibilities.join('\n')
    : String(project.responsibilities || '')
  const achievements = Array.isArray(project.achievements)
    ? project.achievements.join('\n')
    : String(project.achievements || '')

  return {
    ...onboardingStore.createEmptyProject(),
    id: projects.value[index]?.id || onboardingStore.createEmptyProject().id,
    company: String(project.company || projects.value[index]?.company || ''),
    department: String(project.department || projects.value[index]?.department || ''),
    name: String(project.name || projects.value[index]?.name || ''),
    dateRange,
    role: String(project.role || projects.value[index]?.role || ''),
    techStack,
    description: String(project.description || projects.value[index]?.description || ''),
    responsibilities,
    achievements,
    rawNotes: String(project.rawNotes || projects.value[index]?.rawNotes || ''),
    source: 'ai-polished',
    aiOptimizedAt: Date.now()
  }
}

const buildPolishPrompt = () => {
  return `请基于以下候选人信息，提炼并优化多个项目经历。要求：\n1. 每个项目都保留为独立项目，不要合并不同项目。\n2. 项目经历要适合简历展示，可以突出公司、部门、项目名称、时间、角色、技术栈、职责、技术方案、难点和结果。\n3. 可以润色用户已提供的信息，但严禁编造用户未提供的公司、部门、项目、指标、时间或成果。\n4. 缺少指标时不要编造数字；可以保守改写为“提升了交付效率”等非量化表达。\n\n基础信息：\n${JSON.stringify(basicInfo, null, 2)}\n\n项目经历：\n${formatProjectsAsText()}`
}

const handlePolishProject = async () => {
  if (!filledProjects.value.length) {
    ElMessage.warning('请先填写至少一个项目经历')
    return
  }

  const apiConfig = JSON.parse(localStorage.getItem(API_CONFIG_KEY) || '{}')
  if (!apiConfig.apiKey) {
    ElMessage.warning('请先配置 API Key，再使用 AI 优化')
    activeSettingsTab.value = 'api'
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
      rawText: formatProjectsAsText(),
      generatedHTML: '',
      generatedCSS: ''
    }) as { projects?: Array<Record<string, unknown>> }

    if (data.projects?.length) {
      projects.value = data.projects.map(normalizeAiProject)
      activeProjectId.value = projects.value[0].id
      projectMode.value = 'manual'
      ElMessage.success('AI 已优化全部项目经历')
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
  onboardingStore.saveProfile(basicInfo, filledProjects.value)
  visible.value = false
  ElMessage.success('基础信息已保存，生成简历时会自动带入')
}

const handleSkip = () => {
  onboardingStore.markCompleted()
  visible.value = false
  ElMessage.info('已跳过首次引导，可稍后重新填写')
}

onMounted(() => {
  reloadSavedSettings()
  visible.value = onboardingStore.needsOnboarding
  activeSettingsTab.value = 'api'
  window.addEventListener('resume-open-onboarding', openDialog)
})

onBeforeUnmount(() => {
  window.removeEventListener('resume-open-onboarding', openDialog)
})
</script>

<style scoped lang="scss">
.settings-tabs {
  margin-top: -8px;
}

.dialog-body {
  margin-top: 24px;
  min-height: 520px;
}

.api-settings-body {
  min-height: 280px;
}

.backup-settings-body {
  min-height: 360px;
}

.api-config-form {
  max-width: 520px;
}

.api-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

.project-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.project-tabs {
  flex: 1;
  min-width: 0;
}

.project-toolbar-actions,
.qa-actions,
.polish-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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
  max-height: 220px;
  overflow-y: auto;
}

.project-preview-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.project-preview-item {
  padding-bottom: 12px;
  border-bottom: 1px dashed #dcdfe6;

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.api-footer {
  justify-content: space-between;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .api-actions,
  .project-toolbar,
  .project-toolbar-actions,
  .qa-actions,
  .polish-actions,
  .dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>