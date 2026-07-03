import type { Category, UserProfile } from './Api';

let currentUserPromise: Promise<UserProfile> | null = null;
let categoriesPromise: Promise<Category[]> | null = null;

export const getCachedUser = (loader: () => Promise<UserProfile>): Promise<UserProfile> => {
  currentUserPromise ??= loader().catch((error) => { currentUserPromise = null; throw error; });
  return currentUserPromise;
};

export const setCachedUser = (user: UserProfile): void => { currentUserPromise = Promise.resolve(user); };
export const clearUserCache = (): void => { currentUserPromise = null; };

export const getCachedCategories = (loader: () => Promise<Category[]>): Promise<Category[]> => {
  categoriesPromise ??= loader().catch((error) => { categoriesPromise = null; throw error; });
  return categoriesPromise;
};

export const clearCategoriesCache = (): void => { categoriesPromise = null; };
