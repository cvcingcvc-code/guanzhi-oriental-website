/* =============================================================
   观止东方 · 表单验证测试
   运行: node --test tests/validate.test.js
   ============================================================= */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateForm, validateForAPI } = require('../lib/validate');

describe('validateForm', () => {
  describe('name 字段', () => {
    it('空字符串应返回错误', () => {
      const r = validateForm({ name: '', email: 'test@test.com' });
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some(e => e.field === 'name'));
    });

    it('纯空格应返回错误', () => {
      const r = validateForm({ name: '   ', email: 'test@test.com' });
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some(e => e.field === 'name'));
    });

    it('缺失字段应返回错误', () => {
      const r = validateForm({ email: 'test@test.com' });
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some(e => e.field === 'name'));
    });

    it('单字符应返回错误', () => {
      const r = validateForm({ name: '张', email: 'test@test.com' });
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some(e => e.field === 'name' && e.message.includes('2')));
    });

    it('2 个字符应通过', () => {
      const r = validateForm({ name: '张三', email: 'test@test.com' });
      assert.strictEqual(r.ok, true);
    });

    it('中文姓名应通过', () => {
      const r = validateForm({ name: '欧阳修文', email: 'test@test.com' });
      assert.strictEqual(r.ok, true);
    });

    it('英文姓名应通过', () => {
      const r = validateForm({ name: 'John Smith', email: 'test@test.com' });
      assert.strictEqual(r.ok, true);
    });

    it('前后空格应被 trim', () => {
      const r = validateForm({ name: '  李白  ', email: 'test@test.com' });
      assert.strictEqual(r.ok, true);
    });
  });

  describe('email 字段', () => {
    it('空字符串应返回错误', () => {
      const r = validateForm({ name: '张三', email: '' });
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some(e => e.field === 'email'));
    });

    it('缺失字段应返回错误', () => {
      const r = validateForm({ name: '张三' });
      assert.strictEqual(r.ok, false);
      assert.ok(r.errors.some(e => e.field === 'email'));
    });

    it('缺少 @ 应返回错误', () => {
      const r = validateForm({ name: '张三', email: 'testtest.com' });
      assert.strictEqual(r.ok, false);
    });

    it('缺少域名应返回错误', () => {
      const r = validateForm({ name: '张三', email: 'test@' });
      assert.strictEqual(r.ok, false);
    });

    it('缺少 TLD 应返回错误', () => {
      const r = validateForm({ name: '张三', email: 'test@test' });
      assert.strictEqual(r.ok, false);
    });

    it('标准邮箱应通过', () => {
      const r = validateForm({ name: '张三', email: 'user@example.com' });
      assert.strictEqual(r.ok, true);
    });

    it('含加号邮箱应通过', () => {
      const r = validateForm({ name: '张三', email: 'user+tag@example.com' });
      assert.strictEqual(r.ok, true);
    });

    it('含点号邮箱应通过', () => {
      const r = validateForm({ name: '张三', email: 'first.last@sub.example.com' });
      assert.strictEqual(r.ok, true);
    });

    it('中文域名邮箱应通过', () => {
      const r = validateForm({ name: '张三', email: 'user@测试.cn' });
      assert.strictEqual(r.ok, true);
    });
  });

  describe('org 字段', () => {
    it('空值应通过 (可选字段)', () => {
      const r = validateForm({ name: '张三', email: 'a@b.com', org: '' });
      assert.strictEqual(r.ok, true);
    });

    it('缺失应通过 (可选字段)', () => {
      const r = validateForm({ name: '张三', email: 'a@b.com' });
      assert.strictEqual(r.ok, true);
    });

    it('有值应通过', () => {
      const r = validateForm({ name: '张三', email: 'a@b.com', org: '某旅行社' });
      assert.strictEqual(r.ok, true);
    });
  });

  describe('组合场景', () => {
    it('全部有效应通过', () => {
      const r = validateForm({ name: '张三', email: 'zhang@example.com', org: '杭州XX旅行社' });
      assert.strictEqual(r.ok, true);
      assert.strictEqual(r.errors.length, 0);
    });

    it('name 和 email 同时无效应返回两个错误', () => {
      const r = validateForm({ name: '', email: 'invalid' });
      assert.strictEqual(r.ok, false);
      assert.strictEqual(r.errors.length, 2);
    });

    it('validateForAPI 正确格式应返回 ok:true', () => {
      const r = validateForAPI({ name: '张三', email: 'a@b.com' });
      assert.strictEqual(r.ok, true);
      assert.strictEqual(r.errors, undefined);
    });

    it('validateForAPI 错误格式应返回错误数组', () => {
      const r = validateForAPI({ name: '', email: '' });
      assert.strictEqual(r.ok, false);
      assert.ok(Array.isArray(r.errors));
      assert.ok(r.errors.length >= 2);
    });
  });
});
