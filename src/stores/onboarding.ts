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

const formatProjectForPrompt = (project: CandidateProjectExperience, index: number) => {
  const projectBlock = compactLines([
    ['项目名称', project.name || `项目 ${index + 1}`],
    ['项目时间', project.dateRange],
    ['担任角色', project.role],
    ['技术栈', project.techStack],
    ['项目简介', project.description],
    ['负责内容', project.responsibilities],
    ['项目成果/指标', project.achievements],
    ['补充原始信息', project.rawNotes]
  ])

  return projectBlock ? `### 项目 ${index + 1}\n${projectBlock}` : ''
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

    const sections = ['## 候选人基础信息']

    if (basicBlock) {
      sections.push(basicBlock)
    }

    const projectBlocks = profile.value.projects
      .map(formatProjectForPrompt)
      .filter(Boolean)
      .join('\n\n')

    if (projectBlocks) {
      sections.push(`\n## 项目经历\n${projectBlocks}`)
    }

    sections.push('\n请优先使用以上真实信息生成简历，不要随意编造与这些信息冲突的内容。对于信息缺失的模块，可以用更通用、可编辑的占位内容补齐。')

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