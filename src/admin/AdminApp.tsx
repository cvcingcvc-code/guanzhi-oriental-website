import { useEffect, useState } from 'react';
import { AdminApiError, getMe } from './api';
import { AdminLogin } from './Login';
import { HomepageEditor } from './HomepageEditor';
import type { AdminUser } from './types';
import './admin.css';

const TOKEN_KEY = 'guanzhi.cms.token';

export default function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '');
  // A refreshed tab must obtain the role and identity again from the signed
  // token before rendering the editor.
  const [user, setUser] = useState<AdminUser | null>(null);
  const [validating, setValidating] = useState(Boolean(token));
  const [validationError, setValidationError] = useState('');

  const signIn = (nextToken: string, nextUser: AdminUser) => {
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setValidating(false);
    setValidationError('');
  };

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
    setValidating(false);
    setValidationError('');
  };

  const validateSession = async (candidateToken: string) => {
    setValidating(true);
    setValidationError('');
    try {
      const verifiedUser = await getMe(candidateToken);
      setUser(verifiedUser);
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 0) {
        setValidationError(caught.message);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
      }
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (token) void validateSession(token);
  }, []);

  if (token && validating) return <main className="cms-loading"><span className="cms-spinner" />正在验证管理会话…</main>;

  if (token && validationError) return <main className="cms-fatal">
    <p className="cms-kicker">HOMEPAGE CMS</p>
    <h1>暂时无法验证会话</h1>
    <div className="cms-alert is-error" role="alert">{validationError}</div>
    <button className="cms-primary-button" type="button" onClick={() => void validateSession(token)}>重试</button>
    <button className="cms-subtle-button" type="button" onClick={signOut}>返回登录</button>
  </main>;

  return token && user
    ? <HomepageEditor token={token} user={user} onLogout={signOut} />
    : <AdminLogin onSuccess={signIn} />;
}
