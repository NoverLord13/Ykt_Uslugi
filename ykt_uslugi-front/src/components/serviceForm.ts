export type ListingType = 'offer' | 'request';
export type PriceType = 'fixed' | 'from' | 'negotiable';

export type ServiceFormValue = {
  title: string;
  description: string;
  price: string;
  listingType: ListingType;
  priceType: PriceType;
  categoryId: string;
  subcategoryId: string;
  location: string;
  contactPhone: string;
  files: File[];
};

export const validateServiceForm = (value: ServiceFormValue, minimumDescription = 1, minimumTitle = 1): string | null => {
  if (value.title.trim().length < minimumTitle) return `Название должно содержать минимум ${minimumTitle} символа`;
  if (value.description.trim().length < minimumDescription) return `Описание должно содержать минимум ${minimumDescription} символов`;
  if (value.priceType !== 'negotiable' && (!value.price.trim() || Number(value.price) <= 0)) {
    return 'Укажите стоимость больше нуля или выберите договорную цену';
  }
  return null;
};

export const buildServiceFormData = (value: ServiceFormValue): FormData => {
  const data = new FormData();
  data.append('title', value.title.trim());
  data.append('description', value.description.trim());
  data.append('listing_type', value.listingType);
  data.append('price_type', value.priceType);
  if (value.priceType !== 'negotiable') data.append('price', value.price);
  if (value.categoryId) data.append('category_id', value.categoryId);
  if (value.subcategoryId) data.append('subcategory_id', value.subcategoryId);
  if (value.location.trim()) data.append('location', value.location.trim());
  if (value.contactPhone) data.append('contact_phone', value.contactPhone);
  value.files.forEach((file) => data.append('images', file));
  return data;
};
