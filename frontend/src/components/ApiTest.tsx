import React, { useState } from 'react';
import { articlesApi } from '../services/api';

const ApiTest: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testHealthCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/health');
      const data = await response.json();
      setResult({ type: 'health', data });
    } catch (err: any) {
      setError(`Health check failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testArticlesApi = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await articlesApi.getArticles({ page: 1, limit: 10 });
      setResult({ type: 'articles', data: response });
    } catch (err: any) {
      setError(`Articles API failed: ${err.message}`);
      console.error('Articles API error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testDirectFetch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/articles');
      const data = await response.json();
      setResult({ type: 'direct', data });
    } catch (err: any) {
      setError(`Direct fetch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">API 测试</h2>
      
      <div className="space-y-4">
        <button
          onClick={testHealthCheck}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          测试健康检查
        </button>
        
        <button
          onClick={testDirectFetch}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          测试直接请求
        </button>
        
        <button
          onClick={testArticlesApi}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          测试文章API
        </button>
      </div>

      {loading && <div className="mt-4 text-blue-600">请求中...</div>}
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          错误: {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">测试结果 ({result.type}):</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTest; 