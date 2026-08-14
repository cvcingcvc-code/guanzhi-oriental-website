import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

const isHomepageAdmin = window.location.pathname === '/admin/homepage' || window.location.pathname === '/admin/homepage/';

async function render() {
  const Root = isHomepageAdmin
    ? (await import('./admin/AdminApp')).default
    : await Promise.all([import('./App'), import('./index.css')]).then(([module]) => module.default);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {isHomepageAdmin ? <Root /> : <BrowserRouter><Root /></BrowserRouter>}
    </React.StrictMode>,
  );
}

void render();
