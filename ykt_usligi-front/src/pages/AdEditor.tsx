import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl, getApiErrorMessage, type Category } from '../api/Api';

export const AdEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const serviceId = Number(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [listingType, setListingType] = useState<'offer' | 'request'>('offer');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'from' | 'negotiable'>('fixed');
  const [statusValue, setStatusValue] = useState<'active' | 'hidden' | 'moderation' | 'closed'>('active');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = categories.find((category) => String(category.id) === categoryId);

  useEffect(() => {
    if (!serviceId) {
      setError('Некорректный ID объявления');
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [categoriesData, ad] = await Promise.all([
          api.getCategories(),
          api.getAdBlockById(serviceId),
        ]);
        setCategories(categoriesData);
        setTitle(ad.title);
        setDescription(ad.description);
        setPrice(String(ad.price));
        setListingType(ad.listing_type);
        setCategoryId(ad.category ? String(ad.category.id) : '');
        setSubcategoryId(ad.subcategory ? String(ad.subcategory.id) : '');
        setPriceType(ad.price_type);
        setStatusValue(ad.status);
        setLocation(ad.location || '');
        setContactPhone(ad.contact_phone || '');
        setExistingImages(ad.images.length ? ad.images.map((image) => image.url) : ad.image_url ? [ad.image_url] : []);
      } catch (err) {
        console.error(err);
        setError(getApiErrorMessage(err, 'Не удалось загрузить объявление'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [serviceId]);

  useEffect(() => {
    if (selectedCategory && subcategoryId && !selectedCategory.subcategories.some((item) => String(item.id) === subcategoryId)) {
      setSubcategoryId('');
    }
  }, [selectedCategory, subcategoryId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files || []).slice(0, 8));
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !price.trim()) {
      setError('Заполните название, описание и цену');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('price', price);
    formData.append('listing_type', listingType);
    formData.append('price_type', priceType);
    formData.append('status', statusValue);
    if (categoryId) formData.append('category_id', categoryId);
    if (subcategoryId) formData.append('subcategory_id', subcategoryId);
    formData.append('location', location.trim());
    formData.append('contact_phone', contactPhone.trim());
    files.forEach((file) => formData.append('images', file));

    setIsSaving(true);
    setError('');
    try {
      const updated = await api.updateAdBlock(serviceId, formData);
      navigate(`/services/${updated.id}`);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Не удалось сохранить объявление. Проверьте, что это ваше объявление.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-3xl p-6 text-center text-[#8A8F99]">Загрузка объявления...</div>;
  }

  if (error && !title) {
    return <div className="mx-auto max-w-3xl p-6 text-center text-[#E8352B]">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-5 shadow-sm sm:p-6">
        <h1 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Редактировать объявление</h1>
        <p className="mb-6 text-sm text-[#8A8F99]">Измените данные объявления. Новые фото заменят текущий набор фото.</p>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-[#E8352B]">{error}</div>}

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#1A1A1A]">Тип</span>
              <select value={listingType} onChange={(e) => setListingType(e.target.value as 'offer' | 'request')} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]">
                <option value="offer">Оказываю</option>
                <option value="request">Ищу</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#1A1A1A]">Цена</span>
              <select value={priceType} onChange={(e) => setPriceType(e.target.value as 'fixed' | 'from' | 'negotiable')} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]">
                <option value="fixed">Фикс.</option>
                <option value="from">От</option>
                <option value="negotiable">Договорная</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#1A1A1A]">Статус</span>
              <select value={statusValue} onChange={(e) => setStatusValue(e.target.value as 'active' | 'hidden' | 'moderation' | 'closed')} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]">
                <option value="active">Активно</option>
                <option value="hidden">Скрыто</option>
                <option value="closed">Закрыто</option>
                <option value="moderation">Модерация</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#1A1A1A]">Название</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#1A1A1A]">Описание</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={7} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Цена" className="rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Локация" className="rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]">
              <option value="">Категория</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!selectedCategory} className="rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none disabled:bg-[#F2F3F5] focus:border-[#2F6FED]">
              <option value="">Подкатегория</option>
              {selectedCategory?.subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
            </select>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#1A1A1A]">Контактный телефон</span>
            <input
              type="tel"
              value={contactPhone}
              disabled
              readOnly
              className="w-full rounded-xl border border-[#E1E4EA] bg-[#F2F3F5] px-3 py-2 text-[#8A8F99] outline-none cursor-not-allowed"
            />
            <span className="mt-1 block text-xs text-[#8A8F99]">Номер телефона привязан к профилю создателя и не может быть изменен.</span>
          </label>

          {existingImages.length > 0 && files.length === 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-[#1A1A1A]">Текущие фото</p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {existingImages.map((image) => <img key={image} src={fileUrl(image)} alt="Фото" className="aspect-square rounded-xl object-cover" />)}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#1A1A1A]">Заменить фото</span>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} className="block w-full text-sm" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F2F3F5]">Отмена</button>
          <button type="button" onClick={handleSave} disabled={isSaving} className="rounded-xl bg-[#2F6FED] px-5 py-2 text-sm font-semibold text-white hover:bg-[#245DCC] disabled:opacity-60">
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};
