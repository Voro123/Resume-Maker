import type { PromptTemplate } from '@/types/resume'

// 通用固定提示词（所有模板共用）
const COMMON_FIXED_PROMPT = `你是一位专业的前端开发和简历设计专家。请根据用户的要求生成一份高质量的中文简历HTML。

重要要求：
1. 直接输出完整的HTML代码，包含 <!DOCTYPE html> 声明和所有内容
2. HTML必须是完整的、可直接在浏览器中打开和打印（A4尺寸）的单文件
3. 所有CSS样式必须内联在 <style> 标签中
4. 使用语义化HTML5标签，确保良好的可读性
5. 页面尺寸严格遵循A4纸张大小（210mm × 297mm）
6. 使用中文标准字体：微软雅黑、宋体等，确保跨平台显示一致
7. 避免使用JavaScript，保证静态HTML的兼容性
8. 配色专业、印刷友好（避免渐变、阴影等印刷效果不佳的效果）
9. 输出格式：只返回HTML代码，不要添加任何解释、注释或markdown代码块标记
10. ⚠️ 禁止在 body 或外层容器（如 .page-wrapper、.resume-container 等）设置 padding 或 margin，内容区域必须紧贴页面边缘，由内部元素自行控制间距
11. 如需头像，请使用 <img> 标签或可识别的头像容器，并添加 avatar/photo/portrait 等 class 名；头像区域必须为独立元素，方便用户点击上传替换
12. 列表必须使用标准 <ul>/<ol>/<li>，并设置 list-style-position: outside、ul/ol padding-left 至少 1.4em、li 不要使用负 text-indent，禁止让列表符号和文字重叠`

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

布局建议：单栏或双栏均可，保证信息密度和可读性
特殊要求：技能部分可用标签或进度条展示熟练度`
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
字体：等宽字体风格，14-16px

必备模块：
1. 个人信息
2. 技术技能：编程语言、数据库(MySQL/Redis等)、中间件(Kafka/RabbitMQ等)、云服务
3. 工作经历：突出系统架构设计、性能优化、高并发处理经验
4. 项目经验：包含系统架构描述、QPS/TPS优化数据、可用性指标
5. 教育背景

布局建议：表格或flex布局展示技能熟练度
特殊要求：可用简洁的架构图描述（纯CSS或文字描述）`
  },
  {
    id: 'tech-fullstack',
    name: '全栈工程师',
    description: '适用于全栈岗位，均衡展示前后端能力',
    category: 'tech',
    icon: '🚀',
    prompt: '',
    fixedPrompt: COMMON_FIXED_PROMPT,
    editablePrompt: `设计风格：现代创意，双栏布局
主色调：渐变紫色系 (#667eea → #764ba2)
字体：现代无衬线字体，14-16px

布局结构：
- 左侧栏（30%宽度）：个人信息、技能雷达图（用CSS实现）、联系方式
- 右侧栏（70%宽度）：工作经历、项目经验、教育背景

必备模块：
1. 个人品牌展示（姓名+职位大号字体）
2. 全栈技能：前后端技术栈分别列出
3. 工作经历：全栈项目经验
4. 项目经验：包含技术选型和架构决策
5. 教育背景

特殊要求：技能部分用可视化方式展示（CSS图表）`
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

核心要求：所有工作经历和项目描述必须包含量化数据
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
    editablePrompt: `设计风格：创意时尚，视觉冲击力强
主色调：珊瑚红 (#ff6b6b) + 薄荷绿 (#4ecdc4) + 白色
字体：设计感强的字体，14-16px

必备模块：
1. 个人品牌：大号字体展示姓名和职位，可加装饰元素
2. 设计技能：UI设计、交互设计、设计工具(Figma/Sketch等)、设计系统
3. 作品集：用网格展示设计作品（可用占位图+项目描述）
4. 工作经历：设计项目和团队协作
5. 教育背景

视觉要求：
- 使用装饰性几何图形增加设计感
- 彩色标签展示技能
- 引用块展示设计理念和用户评价
- 作品集部分用卡片式布局

特殊要求：整体设计要体现设计师的审美水平`
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