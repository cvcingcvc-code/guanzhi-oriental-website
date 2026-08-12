import { useState, type FormEvent } from 'react';
import { AdminApiError, login } from './api';
import type { AdminUser } from './types';

export function AdminLogin({ onSuccess }: { onSuccess: (token: string, user: AdminUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await login(email, password);
      onSuccess(result.token, result.user);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : '登录失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="cms-login-page">
    <section className="cms-login-card">
      <p className="cms-kicker">GUANZHI ORIENTAL · CMS</p>
      <h1>Homepage Editor</h1>
      <p>仅用于维护观止东方官网首页的双语内容。</p>
      {error && <div className="cms-alert is-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <label className="cms-field">
          <span>管理员邮箱</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required maxLength={254} />
        </label>
        <label className="cms-field">
          <span>密码</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required minLength={8} maxLength={200} />
        </label>
        <button className="cms-primary-button" type="submit" disabled={submitting}>{submitting ? '正在登录…' : '登录并进入编辑器'}</button>
      </form>
    </section>
  </main>;
}
