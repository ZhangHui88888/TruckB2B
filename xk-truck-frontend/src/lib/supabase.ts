/**
 * Supabase 客户端配置
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://ltqnikmoeroelfrwcfqr.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端（如果没有 key 则创建一个 mock 客户端）
let supabase: SupabaseClient;

if (supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // 构建时没有环境变量，创建一个占位客户端
  // Cloudflare Pages 构建时会有正确的环境变量
  supabase = createClient(supabaseUrl, 'placeholder-key-for-build');
}

export { supabase };

// =====================================================
// 类型定义
// =====================================================

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  brand_id?: string;
  category_id?: string;
  oe_number?: string;
  cross_reference?: string[];
  sku?: string;
  main_image_url?: string;
  images?: string[];
  fitment?: string[];
  fitment_years?: string;
  specifications?: Record<string, string>;
  features?: string[];
  meta_title?: string;
  meta_description?: string;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // 关联数据
  brand_name?: string;
  brand_slug?: string;
  category_name?: string;
  category_slug?: string;
}

export interface ProductListParams {
  brand?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =====================================================
// 数据获取函数
// =====================================================

/**
 * 获取所有品牌
 */
export async function getBrands(): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching brands:', error);
    return [];
  }

  return data || [];
}

/**
 * 获取所有分类
 */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

/**
 * 获取产品列表
 */
export async function getProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const {
    brand,
    category,
    search,
    page = 1,
    pageSize = 20,
  } = params;

  // 构建查询
  let query = supabase
    .from('products')
    .select(`
      *,
      brands!inner(name, slug),
      categories(name, slug)
    `, { count: 'exact' })
    .eq('is_active', true);

  // 品牌筛选
  if (brand) {
    query = query.eq('brands.slug', brand);
  }

  // 分类筛选
  if (category) {
    query = query.eq('categories.slug', category);
  }

  // 搜索
  if (search) {
    query = query.or(`name.ilike.%${search}%,oe_number.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // 分页
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  // 转换数据格式
  const products: Product[] = (data || []).map((item: any) => ({
    ...item,
    brand_name: item.brands?.name,
    brand_slug: item.brands?.slug,
    category_name: item.categories?.name,
    category_slug: item.categories?.slug,
  }));

  const total = count || 0;

  return {
    products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取单个产品详情
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands(name, slug),
      categories(name, slug)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    brand_name: data.brands?.name,
    brand_slug: data.brands?.slug,
    category_name: data.categories?.name,
    category_slug: data.categories?.slug,
  };
}

/**
 * 获取产品详情（通过 ID）
 */
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands(name, slug),
      categories(name, slug)
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    brand_name: data.brands?.name,
    brand_slug: data.brands?.slug,
    category_name: data.categories?.name,
    category_slug: data.categories?.slug,
  };
}

/**
 * 获取所有产品 slugs（用于静态生成）
 */
export async function getAllProductSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('slug')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching product slugs:', error);
    return [];
  }

  return (data || []).map((p: { slug: string }) => p.slug);
}

/**
 * 获取精选产品
 */
export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands(name, slug),
      categories(name, slug)
    `)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    ...item,
    brand_name: item.brands?.name,
    brand_slug: item.brands?.slug,
    category_name: item.categories?.name,
    category_slug: item.categories?.slug,
  }));
}

/**
 * 按品牌获取产品数量
 */
export async function getProductCountByBrand(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('products')
    .select('brand_id, brands(slug)')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching product counts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  (data || []).forEach((item: any) => {
    const slug = item.brands?.slug;
    if (slug) {
      counts[slug] = (counts[slug] || 0) + 1;
    }
  });

  return counts;
}

/**
 * 按分类获取产品数量
 */
export async function getProductCountByCategory(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('products')
    .select('category_id, categories(slug)')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching product counts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  (data || []).forEach((item: any) => {
    const slug = item.categories?.slug;
    if (slug) {
      counts[slug] = (counts[slug] || 0) + 1;
    }
  });

  return counts;
}
