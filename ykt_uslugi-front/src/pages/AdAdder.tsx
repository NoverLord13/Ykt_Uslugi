import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getApiErrorMessage, type Category } from '../api/Api';
import { buildServiceFormData, validateServiceForm } from '../components/serviceForm';

export const AdAdder = () => {
  const navigate = useNavigate(); const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [price, setPrice] = useState('');
  const [listingType, setListingType] = useState<'offer' | 'request'>('offer'); const [priceType, setPriceType] = useState<'fixed' | 'from' | 'negotiable'>('fixed');
  const [categoryId, setCategoryId] = useState(''); const [subcategoryId, setSubcategoryId] = useState(''); const [location, setLocation] = useState(''); const [contactPhone, setContactPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]); const [error, setError] = useState(''); const [isSaving, setIsSaving] = useState(false);
  const selectedCategory = categories.find(category => String(category.id) === categoryId);
  const previews = useMemo(() => files.map(file => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)), [previews]);
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getCategories(), api.getMe()])
      .then(([categoryItems, user]) => {
        if (cancelled) return;
        setCategories(categoryItems);
        setContactPhone(user.phone_number || '');
      })
      .catch((err) => { if (!cancelled) setError(getApiErrorMessage(err, 'Не удалось подготовить форму')); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { setSubcategoryId(''); }, [categoryId]);
  useEffect(() => { if (priceType === 'negotiable') setPrice(''); }, [priceType]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => { const picked = Array.from(event.target.files || []); if (picked.length > 8) setError('Можно добавить не больше 8 фотографий'); setFiles(picked.slice(0, 8)); };
  const submit = async () => {
    setError('');
    const value = { title, description, price, listingType, priceType, categoryId, subcategoryId, location, contactPhone, files };
    const validationError = validateServiceForm(value, 20, 3);
    if (validationError) return setError(validationError);
    const data = buildServiceFormData(value);
    setIsSaving(true); try { const created = await api.addServiceListing(data); navigate(`/services/${created.id}`); } catch (err) { setError(getApiErrorMessage(err, 'Не удалось опубликовать объявление')); } finally { setIsSaving(false); }
  };

  return <div className="page-shell max-w-[980px]">
    <button onClick={() => navigate(-1)} className="button-quiet mb-4 -ml-3">← Назад</button>
    <header className="mb-8"><p className="eyebrow">Новое объявление</p><h1 className="page-title mt-2">Расскажите, что нужно</h1><p className="page-subtitle mt-3">Чёткое описание и несколько фотографий заметно повышают шанс быстрого отклика.</p></header>
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="surface p-5 sm:p-8">
        {error && <p className="form-error mb-5">{error}</p>}
        <div className="grid gap-7">
          <div><p className="mb-3 text-sm font-black">Что вы хотите сделать?</p><div className="grid gap-3 sm:grid-cols-2">{([['offer','Предложить услугу','Я исполнитель и готов помочь'],['request','Найти исполнителя','Мне нужна помощь с задачей']] as const).map(([value,label,hint]) => <button type="button" key={value} onClick={() => setListingType(value)} className={`choice-tile min-h-20 ${listingType === value ? 'choice-tile-active' : ''}`}><b className="block">{label}</b><span className="mt-1 block text-xs font-medium opacity-70">{hint}</span></button>)}</div></div>
          <label className="field"><span>Название *</span><input maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder={listingType === 'offer' ? 'Например, соберу кухню за один день' : 'Например, нужно собрать кухню'} /><small className="text-right text-xs text-[var(--muted)]">{title.length}/200</small></label>
          <label className="field"><span>Описание *</span><textarea maxLength={5000} rows={7} value={description} onChange={e => setDescription(e.target.value)} placeholder="Опишите объём работ, сроки, важные детали и ожидаемый результат" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Как формируется цена?</span><select value={priceType} onChange={e => setPriceType(e.target.value as typeof priceType)}><option value="fixed">Точная цена</option><option value="from">Цена от</option><option value="negotiable">Обсудим с исполнителем</option></select></label>{priceType !== 'negotiable' ? <label className="field"><span>Стоимость, ₽ *</span><input type="number" min="1" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} placeholder="5 000" /></label> : <div className="rounded-2xl bg-[var(--brand-soft)] p-4 text-sm leading-6 text-[var(--brand-dark)]">Цена не обязательна — договоритесь после уточнения деталей.</div>}</div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Категория <small>поможет в поиске</small></span><select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">Выберите категорию</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Подкатегория</span><select value={subcategoryId} disabled={!selectedCategory} onChange={e => setSubcategoryId(e.target.value)}><option value="">Выберите подкатегорию</option>{selectedCategory?.subcategories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field"><span>Где выполнять работу?</span><input value={location} maxLength={200} onChange={e => setLocation(e.target.value)} placeholder="Якутск, район или удалённо" /></label><label className="field"><span>Телефон из профиля</span><input value={contactPhone} disabled readOnly /></label></div>
          <label className="field"><span>Фотографии <small>до 8 файлов</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleFileChange} /></label>
          {previews.length > 0 && <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{previews.map(({ file, url }) => <div key={`${file.name}-${file.lastModified}`} className="relative aspect-square overflow-hidden rounded-2xl"><img src={url} alt="Предпросмотр" className="h-full w-full object-cover" /></div>)}</div>}
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-6 sm:flex-row sm:justify-end"><button onClick={() => navigate(-1)} className="button-secondary">Сохранить не нужно</button><button disabled={isSaving} onClick={submit} className="button-primary">{isSaving ? 'Публикуем…' : 'Опубликовать объявление'}</button></div>
        </div>
      </section>
      <aside className="h-fit rounded-3xl bg-[var(--ink)] p-6 text-white lg:sticky lg:top-24"><span className="text-2xl">✦</span><h2 className="mt-4 text-lg font-black">Что увидят люди</h2><ul className="mt-4 space-y-4 text-sm leading-6 text-white/65"><li>Понятный тип: предложение или задача</li><li>Цена без двусмысленности</li><li>Категория и место для быстрого поиска</li><li>Ваш подтверждённый номер для связи</li></ul><p className="mt-6 rounded-2xl bg-white/10 p-4 text-xs leading-5 text-white/70">Обязательны только название, содержательное описание и цена — если она не договорная.</p></aside>
    </div>
  </div>;
};
