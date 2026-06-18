import type { PromptTemplate } from '@/types/resume'

// 通用固定提示词（所有模板共用）
const COMMON_FIXED_PROMPT = `你是一位资深简历设计师和前端排版专家，请生成一份视觉精致、专业、现代的中文简历 HTML。

输出要求：
1. 只输出完整 HTML 代码，不要输出解释、Markdown 或代码块标记。
2. HTML 必须包含 <!DOCTYPE html>、完整 <html>/<head>/<body> 和内联 <style>。
3. 简历主体使用 .resume-container，宽度固定 794px，适配 A4 预览和 PDF 导出。
4. 视觉优先：排版要高级、留白克制、层级清晰、配色统一，避免大面积沉闷色块和粗糙边框。
5. 内容优先：不要为了装饰牺牲可读性，项目经历、职责、成果要清楚易读。
6. 避免使用 position:absolute 布局正文内容；正文排版优先使用普通文档流、flex 或 grid。
7. 列表建议使用标准 <ul>/<ol>/<li>，保持自然缩进，不要使用负 text-indent。
8. 如需头像，只输出一个干净的头像占位壳层：<div class="resume-avatar-placeholder avatar" data-resume-avatar-upload="true"></div>，头像内部不要写任何文字。头像上传交互由前端负责。
9. 所有可见文本建议添加 contenteditable="true"，方便用户生成后直接编辑。
10. 不要过度解释布局规则，直接给出最终精美简历。`

// 预设提示词模板
export const promptTemplates: PromptTemplate[] = [
  // 技术类
  {
    id: 'tech-frontend',
    name: '前端工程师',
    description: '适用于前端开发岗位，突出技术栈和项目经验',
    category: 'tech',
    icon: '💻',
    prompt: '', // 将由 fixedPrompt + editablePrompt 组合
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：现代简约，专业大气
主色调：深蓝色 (#1a365d) + 浅灰色 (#f7fafc)
字体：微软雅黑，14-16px

必备模块：
1. 个人信息：姓名、联系方式、GitHub/个人网站链接
2. 技术技能：分为前端框架(React/Vue等)、编程语言(JS/TS等)、工具链(Webpack/Vite等)
3. 工作经历：突出技术难点、解决方案、性能提升等
4. 项目经验：包含技术栈、项目职责、量化成果
5. 教育背景

布局建议：单栏或轻量双栏均可，保证信息密度和可读性
特殊要求：技能部分可用标签、分组或细进度条展示，不要过度装饰`
  },
  {
    id: 'tech-backend',
    name: '后端工程师',
    description: '适用于后端开发岗位，强调架构设计和性能优化',
    category: 'tech',
    icon: '⚙️',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：专业稳重，结构清晰
主色调：深绿色 (#2f855a) + 白色
字体：现代无衬线字体，14-16px

必备模块：
1. 个人信息
2. 技术技能：编程语言、数据库(MySQL/Redis等)、中间件(Kafka/RabbitMQ等)、云服务
3. 工作经历：突出系统架构设计、性能优化、高并发处理经验
4. 项目经验：包含系统架构描述、QPS/TPS优化数据、可用性指标
5. 教育背景

布局建议：用分组卡片或清晰标题展示技能和项目，整体稳重简洁`
  },
  {
    id: 'tech-fullstack',
    name: '全栈工程师',
    description: '适用于全栈岗位，均衡展示前后端能力',
    category: 'tech',
    icon: '🚀',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：现代创意，但保持商务可读
主色调：紫蓝色系 (#667eea / #764ba2) + 白色
字体：现代无衬线字体，14-16px

布局结构：
- 可以使用轻量双栏：左侧个人信息和技能，右侧经历和项目
- 控制左侧栏宽度，不要让深色侧栏占比过大

必备模块：
1. 个人品牌展示（姓名+职位）
2. 全栈技能：前后端技术栈分别列出
3. 工作经历：全栈项目经验
4. 项目经验：包含技术选型和架构决策
5. 教育背景

特殊要求：视觉可以有设计感，但不要牺牲简洁和留白`
  },

  // 产品类
  {
    id: 'pm',
    name: '产品经理',
    description: '适用于产品经理岗位，突出需求分析和产品规划',
    category: 'product',
    icon: '📱',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：简洁商务，数据驱动
主色调：深橙色 (#c05621) + 浅灰 (#edf2f7)
字体：商务风格字体，14-16px

必备模块：
1. 个人简介：3-5句话概括产品理念和核心能力
2. 产品能力：需求分析、原型设计、数据分析、项目管理、跨团队协作
3. 工作经历：突出产品成果，必须用数据说话（如DAU增长、转化率提升、用户留存等）
4. 项目经验：包含产品从0到1、版本迭代、功能优化等
5. 教育背景（如有MBA/相关证书可突出）

核心要求：所有工作经历和项目描述尽量包含量化数据
布局建议：时间线或卡片式布局`
  },

  // 设计类
  {
    id: 'design-ui',
    name: 'UI/UX设计师',
    description: '适用于设计岗位，展示设计作品和创意能力',
    category: 'design',
    icon: '🎨',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：创意时尚，视觉冲击力强但保持可打印
主色调：珊瑚红 (#ff6b6b) + 薄荷绿 (#4ecdc4) + 白色
字体：现代设计感字体，14-16px

必备模块：
1. 个人品牌：大号字体展示姓名和职位，可加装饰元素
2. 设计技能：UI设计、交互设计、设计工具(Figma/Sketch等)、设计系统
3. 作品集：用网格展示设计作品（可用占位图+项目描述）
4. 工作经历：设计项目和团队协作
5. 教育背景

视觉要求：
- 可以使用装饰性几何图形增加设计感
- 彩色标签展示技能
- 作品集部分用卡片式布局
- 整体要体现设计师的审美水平`
  },

  // 市场类
  {
    id: 'marketing',
    name: '市场营销',
    description: '适用于市场推广岗位，强调营销案例和数据分析',
    category: 'marketing',
    icon: '📈',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：活力商务，结果导向
主色调：商务蓝 (#2c5282) + 活力橙 (#ed8936)
字体：现代商务字体，14-16px

必备模块：
1. 个人优势：3-4个核心关键词（如：品牌策划、增长黑客、数据驱动）
2. 营销技能：数字营销、品牌策划、数据分析、内容运营、SEM/SEO
3. 工作经历：突出营销案例和ROI数据
4. 成功案例：用时间线展示重要营销活动
5. 教育背景

核心要求：
- 用数据展示成果：如"提升品牌曝光量200%"、"获客成本降低30%"
- 案例描述包含：目标、策略、执行、结果

布局建议：可用图标+数据的方式展示关键成果`
  },

  // 应届生
  {
    id: 'fresh-grad',
    name: '应届生/实习生',
    description: '适用于应届毕业生，突出学业成绩和实习经历',
    category: 'fresh',
    icon: '🎓',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：清新简洁，朝气蓬勃
主色调：青春绿 (#38a169) + 白色
字体：清新字体，14-16px

必备模块：
1. 个人基本信息：姓名、学校、专业、毕业时间、联系方式
2. 教育背景：GPA（如3.5/4.0以上）、奖学金、荣誉奖项、相关课程
3. 专业技能：编程语言、工具、证书（英语四六级等）
4. 实习经历：公司、岗位、工作内容、收获（如有）
5. 项目经验：课程设计、毕业设计、竞赛项目（如ACM、数学建模等）
6. 校园活动：学生会、社团、志愿者、组织活动经验

突出要点：
- 学习能力：强调成绩排名、竞赛获奖
- 潜力：突出快速学习和适应能力
- 实践：如有项目或实习经验重点描述

布局建议：教育背景放在前面，突出学术能力`
  },

  // 自定义
  {
    id: 'custom',
    name: '自定义提示词',
    description: '手动输入提示词，完全自定义简历风格和内容',
    category: 'custom',
    icon: '✏️',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: ''
  }
]

// 根据分类获取模板
export const getTemplatesByCategory = (category: string) => {
  if (category === 'all') return promptTemplates
  return promptTemplates.filter(t => t.category === category)
}

// 获取所有分类
export const getCategories = () => {
  const categorySet = new Set(promptTemplates.map(t => t.category))
  const categoryList = [
    { id: 'all', name: '全部' }
  ]
  
  categorySet.forEach(cat => {
    const nameMap: Record<string, string> = {
      'tech': '技术类',
      'product': '产品类',
      'design': '设计类',
      'marketing': '市场类',
      'fresh': '应届生',
      'custom': '自定义'
    }
    categoryList.push({ id: cat, name: nameMap[cat] || cat })
  })
  
  return categoryList
}

// 根据ID获取模板
export const getTemplateById = (id: string) => {
  return promptTemplates.find(t => t.id === id)
}