import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
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
    const isAuthenticated = !!getToken();
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

    return (
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-black">Uslugi Ykt</h1>
                    <p className="mt-1 text-[#8A8F99]">Объявления услуг и запросов в Якутске</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {isAuthenticated && (
                        <Button size="middle" color="primary" title="Мои объявления" onClick={() => navigate('/my-ads')} />
                    )}
                    <Button size="middle" color="primary" title="Добавить объявление" onClick={() => navigate('/adadder')} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="h-fit rounded-2xl border border-[#E1E4EA] bg-white p-4 text-black shadow-sm lg:sticky lg:top-6">
                    <form className="space-y-5" onSubmit={handleSearchSubmit}>
                        <div>
                            <h2 className="text-lg font-bold text-[#1A1A1A]">Фильтры</h2>
                        </div>

                        <label className="block">
                            <span className="mb-1 block text-sm font-semibold text-slate-700">Поиск</span>
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Например: сантехник"
                                className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                            />
                        </label>

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
                            <button type="submit" className="flex-1 rounded-xl bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245DCC]">
                                Найти
                            </button>
                            <button type="button" onClick={clearFilters} className="rounded-xl border border-[#E1E4EA] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#F2F3F5]">
                                Сброс
                            </button>
                        </div>
                    </form>
                </aside>

                <main>
                    {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>}

                    {ads.length === 0 && !isLoading ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-[#8A8F99]">
                            Пока нет объявлений по выбранным фильтрам
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {ads.map((ad) => (
                                <article
                                    key={ad.id}
                                    onClick={() => navigate(`/services/${ad.id}`)}
                                    className="group cursor-pointer overflow-hidden rounded-2xl border border-[#E1E4EA] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
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

                                    <div className="space-y-3 p-4">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-xs font-semibold text-[#2F6FED]">
                                                {listingTypeLabel(ad.listing_type)}
                                            </span>
                                            {ad.category && <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-xs text-slate-600">{ad.category.name}</span>}
                                        </div>
                                        <h3 className="line-clamp-2 min-h-12 font-bold text-[#1A1A1A]">{ad.title}</h3>
                                        <p className="text-lg font-bold text-[#2F6FED]">{formatPrice(ad)}</p>
                                        {ad.location && <p className="text-sm text-[#8A8F99]">{ad.location}</p>}
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
