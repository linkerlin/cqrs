import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleStatus } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import {
  ArticleCreateHandler,
  ArticleDeleteHandler,
  ArticleUpdateHandler,
  ArticleGetHandler
} from './article.handler';

describe('ArticleHandlers', () => {
  let articleDeleteHandler: ArticleDeleteHandler;
  let articleCreateHandler: ArticleCreateHandler;
  let articleUpdateHandler: ArticleUpdateHandler;
  let articleGetHandler: ArticleGetHandler;
  let articleRepository: Repository<Article>;
  let categoryRepository: Repository<Category>;
  let userRepository: Repository<User>;

  const mockArticle: Partial<Article> = {
    id: 'test-article-id',
    title: 'Test Article',
    slug: 'test-article',
    content: 'Test content',
    status: ArticleStatus.DRAFT,
    categories: []
  };

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com'
  };

  const mockCategory: Partial<Category> = {
    id: 'test-category-id',
    name: 'Test Category',
    slug: 'test-category'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleDeleteHandler,
        ArticleCreateHandler,
        ArticleUpdateHandler,
        ArticleGetHandler,
        {
          provide: getRepositoryToken(Article),
          useValue: {
            findOne: jest.fn(),
            remove: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    articleDeleteHandler = module.get<ArticleDeleteHandler>(ArticleDeleteHandler);
    articleCreateHandler = module.get<ArticleCreateHandler>(ArticleCreateHandler);
    articleUpdateHandler = module.get<ArticleUpdateHandler>(ArticleUpdateHandler);
    articleGetHandler = module.get<ArticleGetHandler>(ArticleGetHandler);
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('ArticleDeleteHandler', () => {
    it('should be defined', () => {
      expect(articleDeleteHandler).toBeDefined();
    });

    it('should successfully delete an existing article', async () => {
      // Arrange
      const payload = { id: 'test-article-id' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle as Article);
      jest.spyOn(articleRepository, 'remove').mockResolvedValue(mockArticle as Article);

      // Act
      const result = await articleDeleteHandler.handle(payload);

      // Assert
      expect(articleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-article-id' },
        relations: ['categories']
      });
      expect(articleRepository.remove).toHaveBeenCalledWith(mockArticle);
      expect(result).toEqual({ success: true });
    });

    it('should throw error when article not found', async () => {
      // Arrange
      const payload = { id: 'non-existent-id' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(articleDeleteHandler.handle(payload)).rejects.toThrow('Article not found');
      expect(articleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        relations: ['categories']
      });
      expect(articleRepository.remove).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const payload = { id: 'test-article-id' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle as Article);
      jest.spyOn(articleRepository, 'remove').mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(articleDeleteHandler.handle(payload)).rejects.toThrow('Database connection failed');
      expect(articleRepository.findOne).toHaveBeenCalled();
      expect(articleRepository.remove).toHaveBeenCalled();
    });

    it('should handle article with categories', async () => {
      // Arrange
      const articleWithCategories = {
        ...mockArticle,
        categories: [mockCategory as Category]
      };
      const payload = { id: 'test-article-id' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(articleWithCategories as Article);
      jest.spyOn(articleRepository, 'remove').mockResolvedValue(articleWithCategories as Article);

      // Act
      const result = await articleDeleteHandler.handle(payload);

      // Assert
      expect(result).toEqual({ success: true });
      expect(articleRepository.remove).toHaveBeenCalledWith(articleWithCategories);
    });
  });

  describe('ArticleGetHandler', () => {
    it('should successfully get an existing article', async () => {
      // Arrange
      const payload = { id: 'test-article-id' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(mockArticle as Article);

      // Act
      const result = await articleGetHandler.handle(payload);

      // Assert
      expect(articleRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-article-id' },
        relations: ['author', 'categories']
      });
      expect(result).toEqual(mockArticle);
    });

    it('should throw error when article not found', async () => {
      // Arrange
      const payload = { id: 'non-existent-id' };
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(articleGetHandler.handle(payload)).rejects.toThrow('Article not found');
    });
  });

  describe('ArticleCreateHandler', () => {
    it('should successfully create an article', async () => {
      // Arrange
      const payload = {
        title: 'New Article',
        slug: 'new-article',
        content: 'New content',
        status: ArticleStatus.DRAFT,
        authorId: 'test-user-id',
        categoryIds: ['test-category-id']
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(categoryRepository, 'findByIds').mockResolvedValue([mockCategory as Category]);
      jest.spyOn(articleRepository, 'create').mockReturnValue(mockArticle as Article);
      jest.spyOn(articleRepository, 'save').mockResolvedValue(mockArticle as Article);

      // Act
      const result = await articleCreateHandler.handle(payload);

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-user-id' } });
      expect(categoryRepository.findByIds).toHaveBeenCalledWith(['test-category-id']);
      expect(articleRepository.create).toHaveBeenCalled();
      expect(articleRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockArticle);
    });

    it('should throw error when author not found', async () => {
      // Arrange
      const payload = {
        title: 'New Article',
        slug: 'new-article',
        content: 'New content',
        status: ArticleStatus.DRAFT,
        authorId: 'non-existent-user-id'
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(articleCreateHandler.handle(payload)).rejects.toThrow('Author not found');
    });
  });
}); 