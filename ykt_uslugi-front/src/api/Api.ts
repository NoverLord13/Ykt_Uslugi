import { getToken } from './auth';
import { API_BASE, http, type ApiResponse } from './client';


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
  telegram_username?: string | null;
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
  performer_rating_avg?: number | null;
  performer_reviews_count?: number;
  customer_rating_avg?: number | null;
  customer_reviews_count?: number;
  telegram_username?: string | null;
}

export interface Review {
  id: number;
  author: UserBrief;
  target_user: UserBrief;
  service_id: number | null;
  response_id: number | null;
  rating: number;
  review_type: 'performer' | 'customer';
  text: string | null;
  created_at: string;
}

export interface ServiceListing {
  id: number;
  title: string;
  description: string;
  price: number | null;
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
  telegram_username?: string;
}

export interface ReviewCreate {
  response_id: number;
  rating: number;
  text?: string;
}

export type DealStatus = 'new' | 'accepted' | 'work_submitted' | 'revision_requested' | 'disputed' | 'completed' | 'cancelled' | 'declined';
export const ACTIVE_DEAL_STATUSES: DealStatus[] = ['new', 'accepted', 'work_submitted', 'revision_requested', 'disputed'];

export interface ServiceResponse {
  id: number;
  service: { id: number; title: string; listing_type: 'offer' | 'request'; owner: UserBrief };
  respondent: UserBrief;
  message: string | null;
  status: DealStatus;
  status_note: string | null;
  work_submitted_at: string | null;
  completion_deadline: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  can_accept: boolean;
  can_submit_work: boolean;
  can_confirm: boolean;
  can_request_revision: boolean;
  can_dispute: boolean;
  can_cancel: boolean;
  can_review: boolean;
  review_left: boolean;
  review_target: UserBrief | null;
  review_type: 'performer' | 'customer' | null;
}

export interface Report {
  id: number;
  reporter: UserBrief;
  target_type: 'service' | 'user' | 'review';
  target_id: number;
  reason: string;
  comment: string | null;
  status: 'new' | 'reviewed' | 'resolved' | 'rejected';
  created_at: string;
  updated_at: string;
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
  if (error instanceof Error && error.message && error.message !== 'Ошибка запроса') return error.message;
  return fallback;
};

export const fileUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};

export const formatPrice = (ad: Pick<ServiceListing, 'price' | 'price_type'>) => {
  if (ad.price_type === 'negotiable') return 'Цена договорная';
  const value = new Intl.NumberFormat('ru-RU').format(ad.price ?? 0);
  if (ad.price_type === 'from') return `от ${value} ₽`;
  return `${value} ₽`;
};

export const listingTypeLabel = (type: ServiceListing['listing_type']) =>
  type === 'offer' ? 'Оказываю услугу' : 'Ищу услугу';

export const api = {
  getServiceListing: async (filters: ServiceFilters = {}): Promise<ServiceListing[]> => {
    const response = await http.get<ApiResponse<ServiceListing[]>>(`/services`, {
      params: filters,
    });
    return unwrap(response);
  },

  getServiceListingById: async (id: number): Promise<ServiceListing> => {
    const response = await http.get<ApiResponse<ServiceListing>>(`/services/${id}`, { headers: authHeaders() });
    return unwrap(response);
  },

  getSimilarServices: async (id: number, limit = 8): Promise<ServiceListing[]> => {
    const response = await http.get<ApiResponse<ServiceListing[]>>(`/services/${id}/similar`, {
      params: { limit },
    });
    return unwrap(response);
  },

  getMyServiceListings: async (): Promise<ServiceListing[]> => {
    const response = await http.get<ApiResponse<ServiceListing[]>>(`/services/mine`, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  getMyServiceListingById: async (id: number): Promise<ServiceListing> => {
    const response = await http.get<ApiResponse<ServiceListing>>(`/services/manage/${id}`, { headers: authHeaders() });
    return unwrap(response);
  },

  addServiceListing: async (formData: FormData) => {
    const response = await http.post<ApiResponse<ServiceListing>>(`/services`, formData, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  updateServiceListing: async (id: number, formData: FormData) => {
    const response = await http.put<ApiResponse<ServiceListing>>(`/services/${id}`, formData, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  deleteServiceListing: async (id: number) => {
    const response = await http.delete<ApiResponse<null>>(`/services/${id}`, {
      headers: authHeaders(),
    });
    return response.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await http.get<ApiResponse<Category[]>>(`/categories`);
    return unwrap(response);
  },

  getMe: async (): Promise<UserProfile> => {
    const response = await http.get<ApiResponse<UserProfile>>(`/users/me`, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  updateMe: async (body: UserProfileUpdate): Promise<UserProfile> => {
    const response = await http.patch<ApiResponse<UserProfile>>(`/users/me`, body, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  uploadAvatar: async (avatar: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('avatar', avatar);
    const response = await http.post<ApiResponse<UserProfile>>(`/users/me/avatar`, formData, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  getUserProfile: async (id: number): Promise<UserProfile> => {
    const response = await http.get<ApiResponse<UserProfile>>(`/users/${id}`);
    return unwrap(response);
  },

  getUserServices: async (id: number): Promise<ServiceListing[]> => {
    const response = await http.get<ApiResponse<ServiceListing[]>>(`/users/${id}/services`);
    return unwrap(response);
  },

  getUserReviews: async (id: number): Promise<Review[]> => {
    const response = await http.get<ApiResponse<Review[]>>(`/users/${id}/reviews`);
    return unwrap(response);
  },

  createReview: async (userId: number, body: ReviewCreate): Promise<Review> => {
    const response = await http.post<ApiResponse<Review>>(`/users/${userId}/reviews`, body, {
      headers: authHeaders(),
    });
    return unwrap(response);
  },

  createResponse: async (serviceId: number, message: string): Promise<ServiceResponse> => {
    const response = await http.post<ApiResponse<ServiceResponse>>(`/services/${serviceId}/responses`, { message }, { headers: authHeaders() });
    return unwrap(response);
  },

  getSentResponses: async (): Promise<ServiceResponse[]> => {
    const response = await http.get<ApiResponse<ServiceResponse[]>>(`/responses/sent`, { headers: authHeaders() });
    return unwrap(response);
  },

  getReceivedResponses: async (): Promise<ServiceResponse[]> => {
    const response = await http.get<ApiResponse<ServiceResponse[]>>(`/responses/received`, { headers: authHeaders() });
    return unwrap(response);
  },

  updateResponse: async (id: number, status: ServiceResponse['status'], note?: string): Promise<ServiceResponse> => {
    const response = await http.patch<ApiResponse<ServiceResponse>>(`/responses/${id}`, { status, note: note || null }, { headers: authHeaders() });
    return unwrap(response);
  },

  adminGetDisputedResponses: async (): Promise<ServiceResponse[]> => {
    const response = await http.get<ApiResponse<ServiceResponse[]>>(`/admin/responses/disputed`, { headers: authHeaders() });
    return unwrap(response);
  },

  adminResolveResponse: async (id: number, status: 'completed' | 'cancelled' | 'revision_requested', note: string): Promise<ServiceResponse> => {
    const response = await http.patch<ApiResponse<ServiceResponse>>(`/admin/responses/${id}`, { status, note }, { headers: authHeaders() });
    return unwrap(response);
  },

  createReport: async (targetType: 'service' | 'user' | 'review', targetId: number, reason: string, comment?: string): Promise<Report> => {
    const response = await http.post<ApiResponse<Report>>(`/reports`, { target_type: targetType, target_id: targetId, reason, comment: comment || null }, { headers: authHeaders() });
    return unwrap(response);
  },

  adminGetUsers: async (): Promise<UserProfile[]> => {
    const response = await http.get<ApiResponse<UserProfile[]>>(`/admin/users`, { headers: authHeaders() });
    return unwrap(response);
  },

  adminUpdateUser: async (id: number, body: { is_active?: boolean; is_admin?: boolean }): Promise<UserProfile> => {
    const response = await http.patch<ApiResponse<UserProfile>>(`/admin/users/${id}`, body, { headers: authHeaders() });
    return unwrap(response);
  },

  adminGetServices: async (): Promise<ServiceListing[]> => {
    const response = await http.get<ApiResponse<ServiceListing[]>>(`/admin/services`, { headers: authHeaders() });
    return unwrap(response);
  },

  adminUpdateService: async (id: number, status: ServiceListing['status']): Promise<ServiceListing> => {
    const response = await http.patch<ApiResponse<ServiceListing>>(`/admin/services/${id}`, { status }, { headers: authHeaders() });
    return unwrap(response);
  },

  adminGetReports: async (): Promise<Report[]> => {
    const response = await http.get<ApiResponse<Report[]>>(`/admin/reports`, { headers: authHeaders() });
    return unwrap(response);
  },

  adminGetReviews: async (): Promise<Review[]> => {
    const response = await http.get<ApiResponse<Review[]>>(`/admin/reviews`, { headers: authHeaders() });
    return unwrap(response);
  },

  adminDeleteReview: async (id: number): Promise<void> => {
    await http.delete(`/admin/reviews/${id}`, { headers: authHeaders() });
  },

  adminUpdateReport: async (id: number, status: 'reviewed' | 'resolved' | 'rejected'): Promise<Report> => {
    const response = await http.patch<ApiResponse<Report>>(`/admin/reports/${id}`, { status }, { headers: authHeaders() });
    return unwrap(response);
  },
};
