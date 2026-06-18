import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CandidateBasicInfo,
  CandidateProfile,
  CandidateProjectExperience,
  ProjectExperienceSource
} from '@/types/resume'

const STORAGE_KEY = 'resume-onboarding-profile'
const COMPLETED_KEY = 'resume-onboarding-completed'

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const createEmptyBasicInfo = (): CandidateBasicInfo => ({
  name: '',
  age: '',
  targetRole: '',
  phone: '',
  email: '',
  city: '',
  education: '',
  skills: '',
  selfSummary: ''
})

const createEmptyProject = (): CandidateProjectExperience => ({
  id: createId(),
  name: '',
  dateRange: '',
  role: '',
  techStack: '',
  description: '',
  responsibilities: '',
  achievements: '',
  rawNotes: '',
  source: 'manual'
})

const normalizeProject = (project: Partial<CandidateProjectExperience>): CandidateProjectExperience => ({
  ...createEmptyProject(),
  ...project,
  id: project.id || createId(),
  source: project.source || 'manual'
})

const migrateLegacyProfile = (profile: CandidateProfile): CandidateProfile => {
  if (Array.isArray(profile.projects)) {
    return {
      ...profile,
      projects: profile.projects.map(normalizeProject)
    }
  }

  const legacyProject = profile.projectExperience?.trim()
  return {
    ...profile,
    projects: legacyProject
      ? [
          normalizeProject({
            name: '项目经历',
            rawNotes: legacyProject,
            description: legacyProject,
            source: profile.projectSource || 'manual',
            aiOptimizedAt: profile.aiOptimizedAt
          })
        ]
      : []
  }
}

const safeParseProfile = (raw: string | null): CandidateProfile | null => {
  if (!raw) return null

  try {
    return migrateLegacyProfile(JSON.parse(raw) as CandidateProfile)
  } catch (error) {
    console.warn('读取首次引导信息失败:', error)
    return null
  }
}

const compactLines = (lines: Array<[string, string]>) => {
  return lines
    .filter(([, value]) => value && value.trim())
    .map(([label, value]) => `- ${label}：${value.trim()}`)
    .join('\n')
}

const hasProjectContent = (project: CandidateProjectExperience) => {
  return Boolean(
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

const formatProjectForPrompt = (project: CandidateProjectExperience, index: number) => {
  if (!hasProjectContent(project)) return ''

  const projectBlock = compactLines([
    ['项目名称', project.name],
    ['项目时间', project.dateRange],
    ['担任角色', project.role],
    ['技术栈', project.techStack],
    ['项目简介', project.description],
    ['负责内容', project.responsibilities],
    ['项目成果/指标', project.achievements],
    ['补充原始信息', project.rawNotes]
  ])

  return projectBlock ? `### 用户填写的项目 ${index + 1}\n${projectBlock}` : ''
}

export const useOnboardingStore = defineStore('onboarding', () => {
  const profile = ref<CandidateProfile | null>(null)
  const isCompleted = ref(false)

  const loadFromLocalStorage = () => {
    profile.value = safeParseProfile(localStorage.getItem(STORAGE_KEY))
    isCompleted.value = localStorage.getItem(COMPLETED_KEY) === 'true'
  }

  const saveProfile = (basicInfo: CandidateBasicInfo, projects: CandidateProjectExperience[]) => {
    const nextProfile: CandidateProfile = {
      basicInfo: { ...basicInfo },
      projects: projects.map(normalizeProject),
      updatedAt: Date.now()
    }

    profile.value = nextProfile
    isCompleted.value = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile))
    localStorage.setItem(COMPLETED_KEY, 'true')
  }

  const updateProjects = (projects: CandidateProjectExperience[]) => {
    if (!profile.value) return
    saveProfile(profile.value.basicInfo, projects)
  }

  const markCompleted = () => {
    isCompleted.value = true
    localStorage.setItem(COMPLETED_KEY, 'true')
  }

  const resetOnboarding = () => {
    profile.value = null
    isCompleted.value = false
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(COMPLETED_KEY)
  }

  const needsOnboarding = computed(() => !isCompleted.value)

  const hasProfile = computed(() => {
    return Boolean(profile.value?.basicInfo.name || profile.value?.projects?.some((project) => project.name || project.description || project.rawNotes))
  })

  const formattedPromptBlock = computed(() => {
    if (!profile.value) return ''

    const basic = profile.value.basicInfo
    const basicBlock = compactLines([
      ['姓名', basic.name],
      ['年龄', basic.age],
      ['求职目标/岗位', basic.targetRole],
      ['电话', basic.phone],
      ['邮箱', basic.email],
      ['城市', basic.city],
      ['教育背景', basic.education],
      ['技能关键词', basic.skills],
      ['个人总结', basic.selfSummary]
    ])

    const sections = [
      '## 用户已填写的真实信息',
      '以下内容是用户明确提供的信息。只能基于这些事实生成简历，可以润色表达，但不能新增事实。未填写的姓名、联系方式、链接、公司、学校、经历、项目、成果、指标等一律不要编造。'
    ]

    if (basicBlock) {
      sections.push('\n### 基础信息')
      sections.push(basicBlock)
    }

    const projectBlocks = profile.value.projects
      .map(formatProjectForPrompt)
      .filter(Boolean)
      .join('\n\n')

    if (projectBlocks) {
      sections.push(`\n### 用户填写的项目经历\n${projectBlocks}`)
    }

    sections.push('\n## 事实使用规则\n- 必须优先使用以上用户真实信息。\n- 严禁生成用户未提供的 GitHub、个人网站、邮箱、电话、公司、学校、证书、奖项、工作经历、项目经历、项目名称、项目时间、项目成果或量化指标。\n- 信息缺失时请省略对应模块，或在必要位置写“待补充”；不要用示例信息、虚构链接或虚构经历补齐。\n- 可以对用户已提供的项目职责和成果进行语言润色，但不得新增未提供的项目背景、技术栈、指标或结果。')

    return sections.join('\n')
  })

  return {
    profile,
    isCompleted,
    needsOnboarding,
    hasProfile,
    formattedPromptBlock,
    loadFromLocalStorage,
    saveProfile,
    updateProjects,
    markCompleted,
    resetOnboarding,
    createEmptyBasicInfo,
    createEmptyProject
  }
})