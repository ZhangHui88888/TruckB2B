/**
 * SEO 核心配置 - 锚定关键词和约束规则
 * 
 * 这个配置用于约束 AI 自动优化，防止 SEO 偏离网站定位
 */

export const SEO_CONFIG = {
  // 网站基本信息
  site: {
    name: 'XKTRUCK',
    brand: 'XKLAMP',
    domain: 'xk-truck.cn',
    tagline: 'Heavy Truck Lights Supplier'
  },

  // 核心品牌 - 只优化这些品牌相关内容
  brands: [
    'VOLVO',
    'SCANIA', 
    'MERCEDES-BENZ',
    'MAN',
    'IVECO',
    'RENAULT',
    'DAF',
    'FORD'
  ],

  // 核心产品类型 - 主推产品
  products: {
    primary: ['headlamp', 'headlight', 'tail lamp', 'fog lamp'],  // 主营：车灯
    secondary: ['mirror', 'side mirror', 'rearview mirror'],       // 次要：后视镜
    tertiary: ['body parts']                                       // 少量：车身件
  },

  // 品牌定位关键词 - 必须在 SEO 中体现
  positioning: [
    'OEM quality',
    'factory direct',
    'wholesale',
    'professional',
    'manufacturer',
    'supplier'
  ],

  // 禁止出现的词汇 - 保护品牌形象
  blacklist: [
    'cheap',
    'cheapest', 
    'low price',
    'budget',
    'discount',
    'clearance',
    'used',
    'second hand',
    'replica',
    'copy'
  ],

  // 关键词分层管理
  keywords: {
    // 第一层：核心词（3-5个）- 首页主推，最高优先级
    core: [
      'heavy truck lights supplier',
      'truck lamp manufacturer china',
      'European truck lamps',
      'OEM truck lights wholesale'
    ],
    
    // 第二层：重要词（10-15个）- 分类页和品牌页主推
    important: [
      // Lights/Lamps 变体
      'heavy truck lamps supplier',
      'truck headlamp wholesale',
      'aftermarket truck lamps',
      'truck lighting factory',
      
      // 品牌词（每品牌一个主推词）
      'VOLVO truck headlamp',
      'SCANIA headlight',
      'MERCEDES truck lamp',
      'MAN truck headlamp',
      'IVECO truck lamp',
      'RENAULT truck light',
      'DAF headlight',
      'FORD truck lamp'
    ],
    
    // 第三层：扩展词 - 用于内容覆盖和 AI 优化参考
    extended: [
      // Lights/Lamps 同义词
      'truck lights manufacturer china',
      'truck headlight wholesale',
      'OEM truck lamps',
      'aftermarket truck lights',
      'European truck lights',
      'EU truck lamp supplier',
      
      // 品牌变体（lamp/light 互换）
      'VOLVO truck headlight',
      'SCANIA headlamp',
      'MERCEDES truck light',
      'MAN truck headlight',
      'IVECO truck light',
      'RENAULT truck lamp',
      'DAF headlamp',
      'FORD truck light'
    ]
  },

  // 页面 SEO 规则
  pages: {
    // 首页 - 手动控制，不自动更新
    '/': {
      autoUpdate: false,
      title: 'Heavy Truck Lights Supplier | XKTRUCK',
      description: 'Professional heavy truck lights supplier - VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, FORD. OEM quality headlamps, tail lamps, fog lamps, mirrors. Factory direct pricing, global shipping.'
    },
    
    // 关于页 - 手动控制
    '/about': {
      autoUpdate: false,
      title: 'About Us | XKTRUCK - Heavy Truck Lights Manufacturer',
      description: 'XKTRUCK - Professional heavy truck lights manufacturer with 35,000㎡ factory in China. OEM quality parts for VOLVO, SCANIA, MERCEDES-BENZ, MAN, and more.'
    },
    
    // 联系页 - 手动控制
    '/contact': {
      autoUpdate: false,
      title: 'Contact Us | XKTRUCK',
      description: 'Contact XKTRUCK for heavy truck lights inquiries. Get quotes for VOLVO, SCANIA, MERCEDES-BENZ, MAN parts. WhatsApp: +86 130-6287-0118'
    },
    
    // 产品列表页 - 可自动优化
    '/products': {
      autoUpdate: true,
      titleTemplate: '{category} for {brand} Trucks | XKTRUCK',
      descriptionTemplate: 'Browse {count}+ {category} for {brand} trucks. OEM quality, factory direct pricing.'
    },
    
    // 产品详情页 - 自动生成
    '/products/*': {
      autoUpdate: true,
      titleTemplate: '{productName} - {brand} | XKTRUCK',
      descriptionTemplate: '{productName} (OE: {oeNumber}) for {brand} {model}. OEM quality truck light, factory direct.'
    },
    
    // 博客页 - 可自动优化
    '/blog/*': {
      autoUpdate: true
    }
  },

  // AI 优化约束
  aiConstraints: {
    // 标题最大长度
    maxTitleLength: 60,
    // 描述最大长度
    maxDescriptionLength: 160,
    // 每周最多更新页面数
    maxUpdatesPerWeek: 20,
    // 只优化排名 5-30 的关键词（接近首页但还没上去的）
    positionRange: { min: 5, max: 30 },
    // 最低展示量要求
    minImpressions: 10,
    // CTR 低于此值才需要优化
    maxCTR: 0.05
  }
};

/**
 * 验证 SEO 内容是否符合约束
 */
export function validateSEO(title, description) {
  const errors = [];
  
  // 检查长度
  if (title && title.length > SEO_CONFIG.aiConstraints.maxTitleLength) {
    errors.push(`Title too long: ${title.length} > ${SEO_CONFIG.aiConstraints.maxTitleLength}`);
  }
  
  if (description && description.length > SEO_CONFIG.aiConstraints.maxDescriptionLength) {
    errors.push(`Description too long: ${description.length} > ${SEO_CONFIG.aiConstraints.maxDescriptionLength}`);
  }
  
  // 检查黑名单词汇
  const content = `${title} ${description}`.toLowerCase();
  for (const word of SEO_CONFIG.blacklist) {
    if (content.includes(word.toLowerCase())) {
      errors.push(`Blacklisted word found: "${word}"`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 检查页面是否允许自动更新
 */
export function canAutoUpdate(pagePath) {
  // 精确匹配
  if (SEO_CONFIG.pages[pagePath]) {
    return SEO_CONFIG.pages[pagePath].autoUpdate;
  }
  
  // 通配符匹配
  for (const [pattern, config] of Object.entries(SEO_CONFIG.pages)) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (pagePath.startsWith(prefix)) {
        return config.autoUpdate;
      }
    }
  }
  
  // 默认不允许自动更新
  return false;
}
