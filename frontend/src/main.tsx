import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
// import TestApp from './TestApp.tsx';
import './index.css';

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('找不到root元素!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">错误: 找不到root元素</div>';
} else {
  console.log('正在渲染React应用...');

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('React应用已成功渲染');
  } catch (error) {
    console.error('渲染错误:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; background: white;">
        <h1>应用启动失败</h1>
        <pre>${String(error)}</pre>
      </div>
    `;
  }
} 