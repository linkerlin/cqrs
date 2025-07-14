import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
// import SimpleLayout from './components/SimpleLayout';
import ArticleList from './pages/ArticleList';
// import SimpleArticleList from './pages/SimpleArticleList';
import CreateArticle from './pages/CreateArticle';
import ApiTest from './components/ApiTest';
import './App.css';

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: 'white', color: 'red' }}>
          <h1>出现了错误!</h1>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>错误详情</summary>
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  console.log('App component rendering...');

  try {
    return (
      <ErrorBoundary>
        <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<ArticleList />} />
                <Route path="/articles" element={<ArticleList />} />
                <Route path="/articles/create" element={<CreateArticle />} />
                <Route path="/api-test" element={<ApiTest />} />
              </Routes>
            </Layout>
          </Router>
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', backgroundColor: 'white', color: 'red' }}>
        <h1>App 渲染错误</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
};

export default App;