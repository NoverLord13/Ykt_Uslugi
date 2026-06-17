import axios from 'axios';
import { getToken } from './auth';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  slug: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

export interface ServiceImage {
  id: number;
  url: string;
  position: number;
}

export interface UserBrief {
  id: number;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface UserProfile extends UserBrief {
  phone_number?: string;
  bio?: string | null;
  location?: string | null;
  is_admin?: boolean;
  is_active?: boolean;
  created_at?: string;
  rating_avg?: number | null;
  reviews_count?: number;
}

export interface Review {
  id: number;
  author: UserBrief;
  target_user: UserBrief;
  service_id: number | null;
  rating: number;
  text: string | null;
  created_at: string;
}

export interface AdBlock {
  id: number;
  title: string;
  description: string;
  price: number;
  listing_type: 'offer' | 'request';
  category: Category | null;
  subcategory: Subcategory | null;
  location: string | null;
  price_type: 'fixed' | 'from' | 'negotiable';
  status: 'active' | 'hidden' | 'moderation' | 'closed';
  contact_phone: string | null;
  image_url: string | null;
  images: ServiceImage[];
  is_active: boolean;
  owner: UserBrief;
  created_at: string;
  updated_at: string;
}

export interface ServiceFilters {
  q?: string;
  listing_type?: 'offer' | 'request';
  category_id?: number;
  subcategory_id?: number;
  min_price?: string;
  max_price?: string;
  skip?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
}

export interface UserProfileUpdate {
  display_name?: string;
  bio?: string;
  location?: string;
}

export interface ReviewCreate {
  service_id?: number;
  rating: number;
  text?: string;
}

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const unwrap = <T>(response: { data: ApiResponse<T> }): T => {
  if (response.data.data === null) {
    throw new Error(response.data.message || 'Пустой ответ сервера');
  }
  return response.data.data;
};

export const getApiErrorMessage = (error: unknown, fallback = 'Ошибка запроса') => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown; message?: unknown } | undefined;
    const detail = data?.detail;

    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) return String(item.msg);
          return null;
        })
        .filter(Boolean)
        .join(', ');
    }
    if (typeof data?.message === 'string') return data.message;
    if (error.message) return error.message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const fileUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};

export const formatPrice = (ad: Pick<AdBlock, 'price' | 'price_type'>) => {
  if (ad.price_type === 'negotiable') return 'Цена договорная';
  if (ad.price_type === 'from') return `от ${ad.price} руб.`;
  return `${ad.price} руб.`;
};

export const listingTypeLabel = (type: AdBlock['listing_type']) =>
  type === 'offer' ? 'Оказываю услугу' : 'Ищу услугу';

export const api = {
  getAdBlock: async (filters: ServiceFilters = {}): Promise<AdBlock[]> => {
    const response = await axios.get<ApiResponse<AdBlock[]>>(`${API_URL}/services`, {
      params: filters,
    });
    return unwrap(response);
  },

  getAdBlockById: async (id: number): Promise<AdBlock> => {
    const response = await axios.get<ApiResponse<AdBlock>>(`${API_URL}/services/${id}`);
    return unwrap(response);
  },

  getSimilarServices: async (id: number, limit = 8): Promise<AdBlock[]> => {
    const response = await axios.get<ApiResponse<AdBlock[]>>(`${API_URL}/services/${id}/similar`, {
      params: { limit },
    });
    return unwrap(response);
  },

  getMyAdBlocks: async (): Promise<AdBlock[]> => {
    const response = await axios.get<ApiResponse<AdBlock[]>>(`${API_URL}/services/mine`, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  addAdBlock: async (formData: FormData) => {
    const response = await axios.post<ApiResponse<AdBlock>>(`${API_URL}/services`, formData, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  updateAdBlock: async (id: number, formData: FormData) => {
    const response = await axios.put<ApiResponse<AdBlock>>(`${API_URL}/services/${id}`, formData, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  deleteAdBlock: async (id: number) => {
    const response = await axios.delete<ApiResponse<null>>(`${API_URL}/services/${id}`, {
      headers: authHeaders(),
    });
    return response.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await axios.get<ApiResponse<Category[]>>(`${API_URL}/categories`);
    return unwrap(response);
  },

  getSubcategories: async (categoryId: number): Promise<Subcategory[]> => {
    const response = await axios.get<ApiResponse<Subcategory[]>>(`${API_URL}/categories/${categoryId}/subcategories`);
    return unwrap(response);
  },

  getMe: async (): Promise<UserProfile> => {
    const response = await axios.get<ApiResponse<UserProfile>>(`${API_URL}/users/me`, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  updateMe: async (body: UserProfileUpdate): Promise<UserProfile> => {
    const response = await axios.patch<ApiResponse<UserProfile>>(`${API_URL}/users/me`, body, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  uploadAvatar: async (avatar: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('avatar', avatar);
    const response = await axios.post<ApiResponse<UserProfile>>(`${API_URL}/users/me/avatar`, formData, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  getUserProfile: async (id: number): Promise<UserProfile> => {
    const response = await axios.get<ApiResponse<UserProfile>>(`${API_URL}/users/${id}`);
    return unwrap(response);
  },

  getUserServices: async (id: number): Promise<AdBlock[]> => {
    const response = await axios.get<ApiResponse<AdBlock[]>>(`${API_URL}/users/${id}/services`);
    return unwrap(response);
  },

  getUserReviews: async (id: number): Promise<Review[]> => {
    const response = await axios.get<ApiResponse<Review[]>>(`${API_URL}/users/${id}/reviews`);
    return unwrap(response);
  },

  createReview: async (userId: number, body: ReviewCreate): Promise<Review> => {
    const response = await axios.post<ApiResponse<Review>>(`${API_URL}/users/${userId}/reviews`, body, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },
};
