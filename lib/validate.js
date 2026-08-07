/* =============================================================
   观止东方 · 表单验证模块
   纯函数，无 DOM 依赖，可独立测试
   ============================================================= */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 单字段验证规则
 * @param {string} field - 字段名
 * @param {object} value - { name?, org?, email? }
 * @returns {{valid:boolean, error?:string}} 验证结果
 */
const RULES = {
  name: (v) => {
    if (!v || v.trim().length === 0) return { valid: false, error: '姓名 / Name 为必填项 / required' };
    if (v.trim().length < 2) return { valid: false, error: '姓名 / Name 至少 2 个字符' };
    return { valid: true };
  },
  email: (v) => {
    if (!v || v.trim().length === 0) return { valid: false, error: '邮箱 / Email 为必填项 / required' };
    if (!EMAIL_RE.test(v.trim())) return { valid: false, error: '请填写有效的邮箱地址' };
    return { valid: true };
  },
  org: (_v) => {
    // org 为可选字段
    return { valid: true };
  },
};

/**
 * 验证完整表单数据
 * @param {object} data - { name, org?, email }
 * @returns {{ok:boolean, errors:Array<{field:string, message:string}>}}
 */
function validateForm(data) {
  const errors = [];
  for (const [field, rule] of Object.entries(RULES)) {
    const value = data[field];
    const result = rule(value);
    if (!result.valid) {
      errors.push({ field, message: result.error });
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * 验证并返回适合 API 响应的结构
 * @returns {{ok:boolean, errors?:string[]}}
 */
function validateForAPI(data) {
  const result = validateForm(data);
  if (result.ok) return { ok: true };
  return { ok: false, errors: result.errors.map(e => e.message) };
}

module.exports = { validateForm, validateForAPI, RULES };
