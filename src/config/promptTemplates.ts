import type { PromptTemplate } from '@/types/resume'

// 通用固定提示词（所有模板共用）
const COMMON_FIXED_PROMPT = `你是一位资深简历设计师和前端排版专家，请生成一份视觉精致、专业、现代的中文简历 HTML。

事实与内容约束（最高优先级）：
1. 严禁杜撰用户未提供的信息。不得编造 GitHub、个人网站、邮箱、电话、公司、学校、学历、证书、奖项、工作经历、项目经历、项目名称、项目时间、项目成果或任何量化指标。
2. 只能使用用户明确填写、上传或在提示词中提供的事实信息；可以润色表达、优化措辞和结构，但不能新增事实。
3. 对缺失的信息，不要生成假的示例值，不要写“github.com/xxx”“example.com”“某公司”“某大学”“示例项目”等占位事实。
4. 如果某个模块完全没有事实信息，可以省略该模块；如果设计上必须保留位置，只写“待补充”或留空。
5. 如果用户只填写了技能或目标岗位，允许围绕这些已提供信息组织简历版式，但不要虚构项目和经历来证明这些技能。

输出要求：
1. 只输出完整 HTML 代码，不要输出解释、Markdown 或代码块标记。
2. HTML 必须包含 <!DOCTYPE html>、完整 <html>/<head>/<body> 和内联 <style>。
3. 简历主体使用 .resume-container，宽度固定 794px，适配 A4 预览和 PDF 导出。
4. 视觉优先：排版要高级、留白克制、层级清晰、配色统一，避免大面积沉闷色块和粗糙边框。
5. 内容优先：不要为了装饰牺牲可读性，项目经历、职责、成果要清楚易读。
6. 避免使用 position:absolute 布局正文内容；正文排版优先使用普通文档流、flex 或 grid。
7. 列表建议使用标准 <ul>/<ol>/<li>，保持自然缩进，不要使用负 text-indent。
8. 如需头像，只输出一个干净的头像占位壳层：<div class="resume-avatar-placeholder avatar" data-resume-avatar-upload="true"></div>，头像内部不要写任何文字；不要再用额外 avatar 外壳包裹它，避免头像嵌套。
9. 头像占位尺寸必须克制，建议 72px-120px，最大不得超过 140px；顶部 header 高度建议控制在 120px-170px，不要生成超高横幅或巨大椭圆装饰。
10. 所有可见文本建议添加 contenteditable="true"，方便用户生成后直接编辑。
11. 不要过度解释布局规则，直接给出最终精美简历。`

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

建议模块：
1. 个人信息：仅展示用户已提供的姓名、联系方式、城市、个人网站等
2. 技术技能：基于用户已提供的技能关键词分组展示
3. 工作经历：仅在用户提供真实工作经历时展示
4. 项目经验：仅展示用户提供的真实项目经历
5. 教育背景：仅在用户提供真实教育信息时展示

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

建议模块：
1. 个人信息：仅展示用户已提供的姓名、联系方式、城市等
2. 技术技能：基于用户已提供的编程语言、数据库、中间件、云服务等技能展示
3. 工作经历：仅在用户提供真实工作经历时展示
4. 项目经验：仅展示用户提供的真实项目、架构、性能数据和可用性指标
5. 教育背景：仅在用户提供真实教育信息时展示

布局建议：表格或flex布局展示技能熟练度
特殊要求：如无真实系统架构信息，不要虚构架构图或 QPS/TPS 数据`
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
- 左侧栏（30%宽度）：个人信息、技能、联系方式
- 右侧栏（70%宽度）：个人总结、项目经验、教育背景

建议模块：
1. 个人品牌展示：仅使用用户提供的姓名和目标职位
2. 全栈技能：基于用户已提供技能分为前端/后端/工具链
3. 工作经历：仅在用户提供真实工作经历时展示
4. 项目经验：仅展示用户提供的真实项目经历
5. 教育背景：仅在用户提供真实教育信息时展示

特殊要求：技能部分可用轻量可视化方式展示，但不要虚构熟练度百分比`
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

建议模块：
1. 个人简介：基于用户已提供的个人总结概括核心能力
2. 产品能力：基于用户已提供的技能关键词展示
3. 工作经历：仅在用户提供真实工作经历和数据时展示
4. 项目经验：仅展示用户提供的真实产品项目
5. 教育背景：仅在用户提供真实教育信息时展示

核心要求：所有成果数据必须来自用户提供的信息，不得编造 DAU、转化率、用户留存等指标
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

建议模块：
1. 个人品牌：仅使用用户提供的姓名、职位和个人总结
2. 设计技能：基于用户已提供的设计技能和工具展示
3. 作品集：仅在用户提供真实作品或项目时展示
4. 工作经历：仅在用户提供真实工作经历时展示
5. 教育背景：仅在用户提供真实教育信息时展示

视觉要求：
- 使用装饰性几何图形增加设计感
- 彩色标签展示已提供技能
- 可使用引用块展示用户已提供的理念或评价

特殊要求：整体设计要体现设计师的审美水平，但不要虚构作品集项目`
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

建议模块：
1. 个人优势：基于用户已提供的信息提炼 3-4 个关键词
2. 营销技能：基于用户已提供的技能关键词展示
3. 工作经历：仅在用户提供真实工作经历和数据时展示
4. 成功案例：仅展示用户提供的真实案例
5. 教育背景：仅在用户提供真实教育信息时展示

核心要求：
- 只使用用户提供的数据展示成果，不得编造曝光量、ROI、获客成本等指标
- 案例描述只能基于用户提供的目标、策略、执行、结果

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

建议模块：
1. 个人基本信息：仅展示用户提供的姓名、学校、专业、毕业时间、联系方式
2. 教育背景：仅展示用户提供的 GPA、奖学金、荣誉奖项、相关课程等
3. 专业技能：基于用户已提供的编程语言、工具、证书展示
4. 实习经历：仅在用户提供真实实习经历时展示
5. 项目经验：仅展示用户提供的课程设计、毕业设计、竞赛项目等
6. 校园活动：仅在用户提供真实校园活动时展示

突出要点：
- 学习能力：只能基于用户提供的成绩、排名、奖项描述
- 潜力：可以基于用户已提供经历提炼，但不能虚构实践经历

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
  return promptTemplates.find(t => t.id)
}