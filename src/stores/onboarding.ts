import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CandidateBasicInfo, CandidateProfile, ProjectExperienceSource } from '@/types/resume'

const STORAGE_KEY = 'resume-onboarding-profile'
const COMPLETED_KEY = 'resume-onboarding-completed'

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

const safeParseProfile = (raw: string | null): CandidateProfile | null => {
  if (!raw) return null

  try {
    return JSON.parse(raw) as CandidateProfile
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

export const useOnboardingStore = defineStore('onboarding', () => {
  const profile = ref<CandidateProfile | null>(null)
  const isCompleted = ref(false)

  const loadFromLocalStorage = () => {
    profile.value = safeParseProfile(localStorage.getItem(STORAGE_KEY))
    isCompleted.value = localStorage.getItem(COMPLETED_KEY) === 'true'
  }

  const saveProfile = (
    basicInfo: CandidateBasicInfo,
    projectExperience: string,
    projectSource: ProjectExperienceSource = 'manual',
    aiOptimizedAt?: number
  ) => {
    const nextProfile: CandidateProfile = {
      basicInfo: { ...basicInfo },
      projectExperience,
      projectSource,
      aiOptimizedAt,
      updatedAt: Date.now()
    }

    profile.value = nextProfile
    isCompleted.value = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile))
    localStorage.setItem(COMPLETED_KEY, 'true')
  }

  const updateProjectExperience = (projectExperience: string, projectSource: ProjectExperienceSource) => {
    if (!profile.value) return

    saveProfile(
      profile.value.basicInfo,
      projectExperience,
      projectSource,
      projectSource === 'ai-polished' ? Date.now() : profile.value.aiOptimizedAt
    )
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
    return Boolean(profile.value?.basicInfo.name || profile.value?.projectExperience)
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

    if (profile.value.projectExperience.trim()) {
      sections.push(`\n## 项目经历\n${profile.value.projectExperience.trim()}`)
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
    updateProjectExperience,
    markCompleted,
    resetOnboarding,
    createEmptyBasicInfo
  }
})
