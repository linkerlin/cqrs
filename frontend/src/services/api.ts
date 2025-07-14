import axios from 'axios';
import { 
  Article, 
  CreateArticleRequest, 
  UpdateArticleRequest, 
  GetArticlesParams, 
  ArticleListResponse, 
  ApiResponse 
} from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 这里可以添加认证token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      // 处理未授权错误
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const articlesApi = {
  // 获取文章列表
  getArticles: async (params: GetArticlesParams): Promise<ArticleListResponse> => {
    const response = await api.get<ApiResponse<ArticleListResponse>>('/articles', { params });
    return response.data.data!;
  },

  // 根据ID获取文章
  getArticleById: async (id: string): Promise<Article> => {
    const response = await api.get<ApiResponse<Article>>(`/articles/${id}`);
    return response.data.data!;
  },

  // 根据Slug获取文章
  getArticleBySlug: async (slug: string): Promise<Article> => {
    const response = await api.get<ApiResponse<Article>>(`/articles/slug/${slug}`);
    return response.data.data!;
  },

  // 创建文章
  createArticle: async (data: CreateArticleRequest): Promise<Article> => {
    const response = await api.post<ApiResponse<Article>>('/articles', data);
    return response.data.data!;
  },

  // 更新文章
  updateArticle: async (id: string, data: UpdateArticleRequest): Promise<Article> => {
    const response = await api.put<ApiResponse<Article>>(`/articles/${id}`, data);
    return response.data.data!;
  },

  // 删除文章
  deleteArticle: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/articles/${id}`);
  },

  // 发布文章
  publishArticle: async (id: string): Promise<Article> => {
    const response = await api.post<ApiResponse<Article>>(`/articles/${id}/publish`);
    return response.data.data!;
  },
};

export default api; 