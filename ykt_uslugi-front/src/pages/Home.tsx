import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    api,
    fileUrl,
    formatPrice,
    getApiErrorMessage,
    listingTypeLabel,
    type AdBlock,
    type Category,
    type ServiceFilters,
} from '../api/Api';
import { getToken } from '../api/auth';

type ServiceMode = 'all' | 'offer' | 'request';
type SortMode = NonNullable<ServiceFilters['sort']>;

const LIMIT = 12;

export const Home = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
    const navigate = useNavigate();

    const [ads, setAds] = useState<AdBlock[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState('');
    const [serviceMode, setServiceMode] = useState<ServiceMode>('all');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sort, setSort] = useState<SortMode>('newest');
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const selectedCategory = categories.find((category) => String(category.id) === categoryId);

    useEffect(() => {
        const updateAuth = () => setIsAuthenticated(!!getToken());
        window.addEventListener('auth-change', updateAuth);
        window.addEventListener('storage', updateAuth);
        return () => {
            window.removeEventListener('auth-change', updateAuth);
            window.removeEventListener('storage', updateAuth);
        };
    }, []);

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

    const buildFilters = (nextSkip: number): ServiceFilters => ({
        skip: nextSkip,
        limit: LIMIT,
        q: search.trim() || undefined,
        listing_type: serviceMode === 'all' ? undefined : serviceMode,
        category_id: categoryId ? Number(categoryId) : undefined,
        subcategory_id: subcategoryId ? Number(subcategoryId) : undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        sort,
    });

    const loadAds = async (nextSkip = 0, append = false) => {
        setIsLoading(true);
        setError('');
        try {
            const data = await api.getAdBlock(buildFilters(nextSkip));
            setAds((prev) => append ? [...prev, ...data.filter((item) => !prev.some((old) => old.id === item.id))] : data);
            setSkip(nextSkip + data.length);
            setHasMore(data.length === LIMIT);
        } catch (err) {
            console.error(err);
            setError(getApiErrorMessage(err, 'Не удалось загрузить объявления'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAds(0, false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceMode, categoryId, subcategoryId, minPrice, maxPrice, sort]);

    const handleSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        loadAds(0, false);
    };

    const clearFilters = () => {
        setSearch('');
        setServiceMode('all');
        setCategoryId('');
        setSubcategoryId('');
        setMinPrice('');
        setMaxPrice('');
        setSort('newest');
    };

    const handleAddService = () => {
        if (isAuthenticated) navigate('/adadder');
        else navigate('/login', { state: { from: '/adadder' } });
    };

    return (
        <div className="mx-auto max-w-7xl p-4 pb-16 sm:p-6">
            <section className="relative mb-8 overflow-hidden rounded-[32px] border border-[#f1ddd5] bg-[#fff7f2] px-5 py-10 shadow-[0_18px_55px_rgb(44_54_68/0.08)] sm:px-10 sm:py-14">
                <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-[#dceafe]" />
                <div className="absolute -bottom-24 right-36 h-48 w-48 rounded-full bg-[#ffe1d7]" />
                <div className="relative max-w-3xl">
                    <h1 className="mt-4 text-4xl font-black leading-[1.04] tracking-[-.045em] text-[var(--ink)] sm:text-6xl">Нужный человек<br className="hidden sm:block" /> найдётся рядом</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-lg">Проверенные сделки, живые профили и местные специалисты — чтобы от задачи до результата было меньше лишних шагов.</p>
                    <form onSubmit={handleSearchSubmit} className="mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border border-[#e7e9ec] bg-white p-2 shadow-xl shadow-slate-200/60 sm:flex-row">
                        <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                            <span className="text-lg text-[#8A8F99]">⌕</span>
                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Какую услугу вы ищете?" className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
                        </label>
                        <button type="submit" className="button-primary px-7">Найти</button>
                    </form>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" onClick={handleAddService} className="button-secondary">＋ Добавить объявление</button>
                        {isAuthenticated && <button type="button" onClick={() => navigate('/my-ads')} className="button-quiet">Мои объявления →</button>}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="surface h-fit p-5 text-black lg:sticky lg:top-24">
                    <form className="space-y-5" onSubmit={handleSearchSubmit}>
                        <div className="flex items-center justify-between">
                            <div><h2 className="text-lg font-bold text-[#1A1A1A]">Фильтры</h2><p className="text-xs text-[#8A8F99]">Уточните результаты</p></div>
                            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#2F6FED] hover:underline">Сбросить</button>
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-semibold text-slate-700">Тип объявления</h3>
                            <div className="space-y-2 text-sm text-slate-700">
                                {[
                                    ['all', 'Все'],
                                    ['offer', 'Оказание услуги'],
                                    ['request', 'Запрос услуги'],
                                ].map(([value, label]) => (
                                    <label key={value} className="flex cursor-pointer items-center gap-2">
                                        <input
                                            type="radio"
                                            name="service-mode"
                                            checked={serviceMode === value}
                                            onChange={() => setServiceMode(value as ServiceMode)}
                                            className="h-4 w-4 accent-[#2F6FED]"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">Категория</span>
                            <select
                                value={categoryId}
                                onChange={(event) => setCategoryId(event.target.value)}
                                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                            >
                                <option value="">Все категории</option>
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
                                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-sm outline-none disabled:bg-[#F2F3F5] focus:border-[#2F6FED]"
                            >
                                <option value="">Все подкатегории</option>
                                {selectedCategory?.subcategories.map((subcategory) => (
                                    <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                                ))}
                            </select>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">Цена от</span>
                                <input
                                    type="number"
                                    value={minPrice}
                                    onChange={(event) => setMinPrice(event.target.value)}
                                    className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">до</span>
                                <input
                                    type="number"
                                    value={maxPrice}
                                    onChange={(event) => setMaxPrice(event.target.value)}
                                    className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                                />
                            </label>
                        </div>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">Сортировка</span>
                            <select
                                value={sort}
                                onChange={(event) => setSort(event.target.value as SortMode)}
                                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                            >
                                <option value="newest">Сначала новые</option>
                                <option value="oldest">Сначала старые</option>
                                <option value="price_asc">Цена по возрастанию</option>
                                <option value="price_desc">Цена по убыванию</option>
                            </select>
                        </label>

                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 rounded-xl bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#245DCC]">
                                Найти
                            </button>
                        </div>
                    </form>
                </aside>

                <main className="min-w-0">
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div><h2 className="text-2xl font-bold text-[#1A1A1A]">Объявления</h2><p className="text-sm text-[#8A8F99]">Актуальные предложения и запросы</p></div>
                        {ads.length > 0 && <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#667085] shadow-sm">Показано: {ads.length}</span>}
                    </div>
                    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}

                    {ads.length === 0 && !isLoading ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4FF] text-2xl">⌕</div>
                            <h3 className="font-bold text-[#1A1A1A]">Ничего не найдено</h3>
                            <p className="mt-1 text-sm text-[#8A8F99]">Попробуйте изменить фильтры или создайте новое объявление.</p>
                            <button type="button" onClick={handleAddService} className="mt-5 rounded-xl bg-[#2F6FED] px-5 py-2.5 text-sm font-semibold text-white">Добавить объявление</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {ads.map((ad) => (
                                <article
                                    key={ad.id}
                                    onClick={() => navigate(`/services/${ad.id}`)}
                                    className="group cursor-pointer overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_10px_35px_rgb(23_34_52/0.06)] transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_20px_50px_rgb(23_34_52/0.12)]"
                                >
                                    <div className="aspect-[4/3] overflow-hidden bg-[#F2F3F5]">
                                        {(ad.image_url || ad.images[0]?.url) ? (
                                            <img
                                                src={fileUrl(ad.images[0]?.url || ad.image_url)}
                                                alt={ad.title}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-slate-400">Нет фото</div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-semibold text-[#2F6FED]">
                                                {listingTypeLabel(ad.listing_type)}
                                            </span>
                                            {ad.category && <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-xs text-slate-600">{ad.category.name}</span>}
                                        </div>
                                        <h3 className="mt-3 line-clamp-2 min-h-12 font-bold leading-6 text-[#1A1A1A] transition-colors group-hover:text-[#2F6FED]">{ad.title}</h3>
                                        <p className="mt-2 text-lg font-black text-[#1A1A1A]">{formatPrice(ad)}</p>
                                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-[#8A8F99]">
                                            <span className="truncate">{ad.owner.display_name || ad.owner.username}</span>
                                            <span className="truncate pl-3">{ad.location || 'Якутск'}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    <div className="py-8 text-center text-sm text-[#8A8F99]">
                        {isLoading && 'Загрузка объявлений...'}
                        {!isLoading && hasMore && ads.length > 0 && (
                            <button
                                type="button"
                                onClick={() => loadAds(skip, true)}
                                className="rounded-xl border border-[#E1E4EA] bg-white px-5 py-2 font-semibold text-slate-700 hover:bg-[#F2F3F5]"
                            >
                                Показать еще
                            </button>
                        )}
                        {!isLoading && !hasMore && ads.length > 0 && 'Вы просмотрели все объявления.'}
                    </div>
                </main>
            </div>
        </div>
    );
};
