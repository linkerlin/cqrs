import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { articlesApi } from '../services/api';
import { Article } from '../types';
import { format } from 'date-fns';
import { Calendar, User, Tag } from 'lucide-react';

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false); // Added imageError state

  const fetchArticle = useCallback(async () => { // Wrapped fetchArticle in useCallback
    if (!id) return;
    setLoading(true);
    setImageError(false); // Reset imageError when fetching new article
    try {
      const fetchedArticle = await articlesApi.getArticleById(id);
      setArticle(fetchedArticle);
    } catch (err) {
      setError('获取文章详情失败');
      console.error('Error fetching article:', err);
    } finally {
      setLoading(false);
    }
  }, [id]); // Added id to useCallback dependencies

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]); // Added fetchArticle to useEffect dependencies

  const handleImageError = useCallback(() => { // Added handleImageError function
    setImageError(true);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500 text-lg">{error}</div>;
  }

  if (!article) {
    return <div className="text-center py-12 text-gray-500">文章未找到</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="bg-white shadow-lg rounded-lg overflow-hidden">
        {article.featuredImage && !imageError && ( // Conditional rendering based on imageError
          <img
            className="w-full h-96 object-cover"
            src={article.featuredImage}
            alt={article.title}
            onError={handleImageError} // Added onError handler
          />
        )}
        <div className="p-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{article.title}</h1>
          <div className="flex items-center text-gray-500 text-sm mb-6 space-x-6">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-2" />
              <span>{article.author?.username || '未知作者'}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <time dateTime={article.createdAt}>{
                format(new Date(article.createdAt), 'yyyy年MM月dd日')
              }</time>
            </div>
            {article.categories && article.categories.length > 0 && (
              <div className="flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                {article.categories.map(cat => cat.name).join(', ')}
              </div>
            )}
          </div>
          <div
            className="prose prose-lg max-w-none mx-auto text-gray-800"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </article>
    </div>
  );
};

export default ArticleDetail;