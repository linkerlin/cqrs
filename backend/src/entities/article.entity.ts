import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, Index } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  excerpt?: string;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  featuredImage?: string;

  @Column({
    type: 'varchar',
    default: ArticleStatus.DRAFT
  })
  status: ArticleStatus;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  likeCount: number;

  @Column({ default: 0 })
  commentCount: number;

  @Column({ nullable: true })
  publishedAt?: Date;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.articles)
  author: User;

  @ManyToMany(() => Category, category => category.articles)
  @JoinTable({
    name: 'article_categories',
    joinColumn: { name: 'articleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' }
  })
  categories: Category[];
} 