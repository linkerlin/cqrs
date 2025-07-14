import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleStatus } from '../../entities/article.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { ArticleService } from './article.service';
import { CqrsMessageService } from '../../cqrs/cqrs-message.service';

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepository: Repository<Article>;
  let categoryRepository: Repository<Category>;
  let userRepository: Repository<User>;
  let cqrsMessageService: CqrsMessageService;

  const mockArticleRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findByIds: jest.fn(),
  };

  const mockCategoryRepository = {
    findByIds: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockCqrsMessageService = {
    handleQuery: jest.fn(),
    handleCommand: jest.fn(),
    clearCache: jest.fn(),
    clearCacheByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockArticleRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: CqrsMessageService,
          useValue: mockCqrsMessageService,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    articleRepository = module.get<Repository<Article>>(getRepositoryToken(Article));
    categoryRepository = module.get<Repository<Category>>(getRepositoryToken(Category));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cqrsMessageService = module.get<CqrsMessageService>(CqrsMessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getArticles', () => {
    it('should return a list of articles', async () => {
      const mockArticles = [{ id: '1', title: 'Test Article' }] as Article[];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockArticles, 1]),
      };
      jest.spyOn(articleRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getArticles({});
      expect(result.articles).toEqual(mockArticles);
      expect(result.pagination.total).toBe(1);
      expect(articleRepository.createQueryBuilder).toHaveBeenCalledWith('article');
      expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should filter articles by status', async () => {
      const mockArticles = [{ id: '1', title: 'Published Article', status: ArticleStatus.PUBLISHED }] as Article[];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockArticles, 1]),
      };
      jest.spyOn(articleRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.getArticles({ status: ArticleStatus.PUBLISHED });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('article.status = :status', { status: ArticleStatus.PUBLISHED });
    });

    it('should search articles by keyword', async () => {
      const mockArticles = [{ id: '1', title: 'Search Result' }] as Article[];
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockArticles, 1]),
      };
      jest.spyOn(articleRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      await service.getArticles({ search: 'keyword' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('article.title LIKE :search OR article.content LIKE :search', { search: '%keyword%' });
    });
  });

  describe('getArticleById', () => {
    it('should call cqrsMessageService.handleQuery with correct parameters', async () => {
      const mockArticle = { id: '1', title: 'Test Article' } as Article;
      jest.spyOn(cqrsMessageService, 'handleQuery').mockResolvedValue(mockArticle);

      const result = await service.getArticleById('1');
      expect(cqrsMessageService.handleQuery).toHaveBeenCalledWith('GET_ARTICLE_BY_ID', { id: '1' }, 'article:1', 3600);
      expect(result).toEqual(mockArticle);
    });
  });

  describe('getArticleBySlug', () => {
    it('should call cqrsMessageService.handleQuery with correct parameters', async () => {
      const mockArticle = { id: '1', slug: 'test-article' } as Article;
      jest.spyOn(cqrsMessageService, 'handleQuery').mockResolvedValue(mockArticle);

      const result = await service.getArticleBySlug('test-article');
      expect(cqrsMessageService.handleQuery).toHaveBeenCalledWith('GET_ARTICLE_BY_SLUG', { slug: 'test-article' }, 'article:slug:test-article', 3600);
      expect(result).toEqual(mockArticle);
    });
  });

  describe('createArticle', () => {
    it('should create an article successfully', async () => {
      const mockUser = { id: 'user1' } as User;
      const mockCategory = { id: 'cat1' } as Category;
      const createArticleDto = {
        title: 'New Article',
        slug: 'new-article',
        content: 'Content',
        status: ArticleStatus.DRAFT,
        categoryIds: ['cat1'],
      };
      const savedArticle = {
        id: 'new-article-id',
        ...createArticleDto,
        author: mockUser,
        categories: [mockCategory],
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Article;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(categoryRepository, 'findByIds').mockResolvedValue([mockCategory]);
      jest.spyOn(articleRepository, 'create').mockReturnValue(savedArticle);
      jest.spyOn(articleRepository, 'save').mockResolvedValue(savedArticle);
      jest.spyOn(articleRepository, 'findOne').mockResolvedValue(savedArticle);

      const result = await service.createArticle(createArticleDto, 'user1');
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user1' } });
      expect(categoryRepository.findByIds).toHaveBeenCalledWith(['cat1']);
      expect(articleRepository.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Article' }));
      expect(articleRepository.save).toHaveBeenCalledWith(savedArticle);
      expect(articleRepository.findOne).toHaveBeenCalledWith({ where: { id: 'new-article-id' }, relations: ['author', 'categories'] });
      expect(result).toEqual(savedArticle);
    });

    it('should throw error if author not found', async () => {
      const createArticleDto = {
        title: 'New Article',
        slug: 'new-article',
        content: 'Content',
        status: ArticleStatus.DRAFT,
      };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createArticle(createArticleDto, 'user1')).rejects.toThrow('Author not found');
    });
  });

  describe('updateArticle', () => {
    it('should call cqrsMessageService.handleCommand and clear cache', async () => {
      const updateArticleDto = { title: 'Updated Title' };
      const mockResult = { success: true };
      jest.spyOn(cqrsMessageService, 'handleCommand').mockResolvedValue(mockResult);
      jest.spyOn(service as any, 'clearArticleCache').mockResolvedValue(undefined); // Mock private method

      const result = await service.updateArticle('1', updateArticleDto);
      expect(cqrsMessageService.handleCommand).toHaveBeenCalledWith('UPDATE_ARTICLE', { id: '1', ...updateArticleDto });
      expect(service['clearArticleCache']).toHaveBeenCalled();
      expect(cqrsMessageService.clearCache).toHaveBeenCalledWith('article:1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteArticle', () => {
    it('should call cqrsMessageService.handleCommand and clear cache', async () => {
      const mockResult = { success: true };
      jest.spyOn(cqrsMessageService, 'handleCommand').mockResolvedValue(mockResult);
      jest.spyOn(service as any, 'clearArticleCache').mockResolvedValue(undefined);

      const result = await service.deleteArticle('1');
      expect(cqrsMessageService.handleCommand).toHaveBeenCalledWith('DELETE_ARTICLE', { id: '1' });
      expect(service['clearArticleCache']).toHaveBeenCalled();
      expect(cqrsMessageService.clearCache).toHaveBeenCalledWith('article:1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('publishArticle', () => {
    it('should call cqrsMessageService.handleCommand and clear cache', async () => {
      const mockResult = { success: true };
      jest.spyOn(cqrsMessageService, 'handleCommand').mockResolvedValue(mockResult);
      jest.spyOn(service as any, 'clearArticleCache').mockResolvedValue(undefined);

      const result = await service.publishArticle('1');
      expect(cqrsMessageService.handleCommand).toHaveBeenCalledWith('PUBLISH_ARTICLE', { id: '1' });
      expect(service['clearArticleCache']).toHaveBeenCalled();
      expect(cqrsMessageService.clearCache).toHaveBeenCalledWith('article:1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('incrementViewCount', () => {
    it('should call cqrsMessageService.handleCommand', async () => {
      const mockResult = { success: true };
      jest.spyOn(cqrsMessageService, 'handleCommand').mockResolvedValue(mockResult);

      const result = await service.incrementViewCount('1');
      expect(cqrsMessageService.handleCommand).toHaveBeenCalledWith('INCREMENT_ARTICLE_VIEW', { id: '1' });
      expect(result).toEqual(mockResult);
    });
  });

  describe('clearArticleCache', () => {
    it('should call cqrsMessageService.clearCacheByPattern', async () => {
      jest.spyOn(cqrsMessageService, 'clearCacheByPattern').mockResolvedValue(undefined);
      await (service as any).clearArticleCache(); // Call private method
      expect(cqrsMessageService.clearCacheByPattern).toHaveBeenCalledWith('articles:*');
    });
  });
});
