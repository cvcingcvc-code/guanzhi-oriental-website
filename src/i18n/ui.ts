import type { ContentLocale } from '../content/public-content';

export const UI_TEXT = {
  'zh-CN': {
    nav: { about: '关于', capabilities: '解决方案', motifs: '产品实验室', jiangnan: '入江南', partners: '合作对象', contact: '合作' },
    sections: { about: 'ABOUT / 定位', capabilities: 'SOLUTIONS / 核心能力', motifs: 'PRODUCT STUDIO / 产品实验室', jiangnan: 'ENTERING JIANGNAN / 入江南', partners: 'FOR PARTNERS / 合作对象' },
    languageLabel: '网站语言', navigationLabel: '主要导航', homeLabel: '观止东方首页', menuOpen: '打开菜单', menuClose: '关闭菜单', scroll: '继续探索',
    switching: '正在切换语言…', switchFailed: '语言内容暂时无法加载，已保留当前页面。',
    themeLabel: '预览风格', themeTip: '按 T 快速切换',
    themes: {
      nocturne: { label: '宣纸编辑', note: '米白 / 墨绿 / 朱砂' },
      archive: { label: '青瓷研究', note: '灰绿 / 青瓷 / 文献感' },
      vermilion: { label: '暖砂策展', note: '暖砂 / 棕墨 / 朱砂' },
    },
    inquiry: {
      close: '关闭合作咨询', kicker: 'PARTNERSHIP INQUIRY', title: '谈谈您的项目',
      name: '您的称呼', namePlaceholder: '姓名 / 机构', email: '联系邮箱', emailPlaceholder: 'name@example.com',
      brief: '合作需求', briefPlaceholder: '项目背景、目标客群与大致时间', submit: '提交合作意向', submitting: '正在提交…',
      successLabel: '提交成功', successTitle: '感谢您的关注。', successBody: '合作咨询已成功提交，我们会尽快与您联系。', back: '返回网站',
      nameError: '请填写至少 2 个字符的姓名或机构名称。', emailError: '请填写有效的联系邮箱。', briefError: '请至少用 6 个字符简要说明合作需求。',
      validationError: '提交内容未通过校验，请检查姓名、邮箱和合作需求。', rateError: '提交过于频繁，请稍后再试。', serverError: '服务暂时不可用，请稍后重试。', genericError: '提交失败，请检查填写内容。',
      networkError: (email: string) => `网络连接失败，请稍后重试或直接邮件联系 ${email}。`,
    },
    operatedBy: '运营主体',
  },
  en: {
    nav: { about: 'About', capabilities: 'Capabilities', motifs: 'Product Studio', jiangnan: 'Into Jiangnan', partners: 'Partners', contact: 'Partnership' },
    sections: { about: 'ABOUT', capabilities: 'CAPABILITIES', motifs: 'PRODUCT STUDIO', jiangnan: 'INTO JIANGNAN', partners: 'FOR PARTNERS' },
    languageLabel: 'Website language', navigationLabel: 'Main navigation', homeLabel: 'Guanzhi Oriental home', menuOpen: 'Open menu', menuClose: 'Close menu', scroll: 'Scroll to explore',
    switching: 'Switching language…', switchFailed: 'The requested language is temporarily unavailable. Current content has been kept.',
    themeLabel: 'Preview style', themeTip: 'Press T to switch',
    themes: {
      nocturne: { label: 'Paper Editorial', note: 'Ivory / Ink / Cinnabar' },
      archive: { label: 'Celadon Archive', note: 'Grey-green / Celadon / Editorial' },
      vermilion: { label: 'Warm Sand', note: 'Sand / Brown Ink / Cinnabar' },
    },
    inquiry: {
      close: 'Close partnership inquiry', kicker: 'PARTNERSHIP INQUIRY', title: 'Tell us about your project',
      name: 'Your name', namePlaceholder: 'Name / organization', email: 'Email', emailPlaceholder: 'name@example.com',
      brief: 'Project brief', briefPlaceholder: 'Background, audience and approximate timing', submit: 'Send inquiry', submitting: 'Sending…',
      successLabel: 'Sent', successTitle: 'Thank you for reaching out.', successBody: 'Your partnership inquiry has been received. We will be in touch shortly.', back: 'Return to website',
      nameError: 'Please enter at least 2 characters for your name or organization.', emailError: 'Please enter a valid email address.', briefError: 'Please describe your partnership needs in at least 6 characters.',
      validationError: 'Please check your name, email and project brief.', rateError: 'Too many submissions. Please try again later.', serverError: 'The service is temporarily unavailable. Please try again later.', genericError: 'Unable to send your inquiry. Please check the form.',
      networkError: (email: string) => `Network connection failed. Please try again or email ${email}.`,
    },
    operatedBy: 'Operated by',
  },
} as const satisfies Record<ContentLocale, object>;
