import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiErrorMessage, type Category } from '../api/Api';

export const AdAdder = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [listingType, setListingType] = useState<'offer' | 'request'>('offer');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'from' | 'negotiable'>('fixed');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedCategory = categories.find((category) => String(category.id) === categoryId);

  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch((err) => {
        console.error(err);
        setError(getApiErrorMessage(err, 'Не удалось загрузить категории'));
      });
  }, []);

  useEffect(() => {
    setSubcategoryId('');
  }, [categoryId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, 8);
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    setError('');
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

    if (categoryId) formData.append('category_id', categoryId);
    if (subcategoryId) formData.append('subcategory_id', subcategoryId);
    if (location.trim()) formData.append('location', location.trim());
    if (contactPhone.trim()) formData.append('contact_phone', contactPhone.trim());
    files.forEach((file) => formData.append('images', file));

    setIsSaving(true);
    try {
      const created = await api.addAdBlock(formData);
      navigate(`/services/${created.id}`);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Ошибка при создании объявления. Проверьте авторизацию и данные формы.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <h1 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Добавить объявление</h1>
        <p className="mb-6 text-sm text-[#8A8F99]">Укажите детали услуги или запроса, чтобы объявление было понятнее.</p>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Тип объявления</span>
              <select
                value={listingType}
                onChange={(event) => setListingType(event.target.value as 'offer' | 'request')}
                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
              >
                <option value="offer">Оказываю услугу</option>
                <option value="request">Ищу услугу</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Тип цены</span>
              <select
                value={priceType}
                onChange={(event) => setPriceType(event.target.value as 'fixed' | 'from' | 'negotiable')}
                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
              >
                <option value="fixed">Фиксированная</option>
                <option value="from">От указанной суммы</option>
                <option value="negotiable">Договорная</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Название</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Услуги сантехника"
              className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Описание</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Подробно опишите услугу или запрос"
              rows={7}
              className="w-full resize-y rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Цена</span>
              <input
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Локация</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Якутск, район"
                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Категория</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
              >
                <option value="">Не выбрано</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Подкатегория</span>
              <select
                value={subcategoryId}
                onChange={(event) => setSubcategoryId(event.target.value)}
                disabled={!selectedCategory}
                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none disabled:bg-[#F2F3F5] focus:border-[#2F6FED]"
              >
                <option value="">Не выбрано</option>
                {selectedCategory?.subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Контактный телефон</span>
            <input
              type="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="+7 999 123-45-67"
              className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-black outline-none focus:border-[#2F6FED]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Фото объявления</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-black file:mr-4 file:rounded-xl file:border-0 file:bg-[#2F6FED] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#245DCC]"
            />
            <span className="mt-1 block text-xs text-slate-400">Можно выбрать до 8 фото</span>
          </label>

          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {files.map((file) => (
                <img
                  key={`${file.name}-${file.lastModified}`}
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="aspect-square rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/')} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F2F3F5]">
            Отмена
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isSaving}
            className="rounded-xl bg-[#2F6FED] px-5 py-2 text-sm font-semibold text-white hover:bg-[#245DCC] disabled:opacity-60"
          >
            {isSaving ? 'Сохранение...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};
