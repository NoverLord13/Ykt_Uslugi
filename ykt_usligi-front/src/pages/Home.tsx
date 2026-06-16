import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { api, type AdBlock, type Tag } from '../api/Api';
import { getToken } from '../api/auth';

type ServiceMode = 'all' | 'offer' | 'request';

export const Home = () => {
    const isAuthenticated = !!getToken();
    const navigate = useNavigate();

    const [adBlock, setAdBlock] = useState<AdBlock[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [serviceMode, setServiceMode] = useState<ServiceMode>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement | null>(null);
    const LIMIT = 12;

    const loadMoreArtworks = useCallback(async () => {
        if (isLoading || !hasMore) return;

        setIsLoading(true);
        try {
            const newData = await api.getAdBlock(skip, LIMIT);

            if (newData.length < LIMIT) {
                setHasMore(false);
            }

            setAdBlock((prev) => {
                const combined = [...prev, ...newData];
                return combined.filter((art, index, self) =>
                    self.findIndex((t) => t.id === art.id) === index
                );
            });

            setSkip((prev) => prev + LIMIT);
        } catch (error) {
            console.error('Ошибка при загрузке объявлений:', error);
        } finally {
            setIsLoading(false);
        }
    }, [skip, isLoading, hasMore]);

    useEffect(() => {
        api.getTags()
            .then(setTags)
            .catch((error) => console.error('Ошибка при загрузке тегов:', error));
    }, []);

    useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMoreArtworks();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(target);

        return () => {
            if (target) observer.unobserve(target);
        };
    }, [loadMoreArtworks, hasMore, isLoading]);

    const toggleTag = (tagId: number) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto text-slate-200 mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-black mb-2">Uslugi Ykt</h1>
                </div>

                <div className="flex flex-wrap gap-4">
                    {isAuthenticated && (
                        <Button
                            size="middle"
                            color="primary"
                            title="Мои объявления"
                            onClick={() => navigate('/MyAds')}
                        />
                    )}
                    <Button
                        size="middle"
                        color="primary"
                        title="Добавить объявление"
                        onClick={() => navigate('/adadder')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 text-black shadow-sm lg:sticky lg:top-6">
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-base font-semibold text-slate-950">Фильтры</h2>
                        </section>

                        <section>
                            <h3 className="mb-3 text-sm font-semibold text-slate-700">Тип объявления</h3>
                            <div className="space-y-2">
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="radio"
                                        name="service-mode"
                                        checked={serviceMode === 'all'}
                                        onChange={() => setServiceMode('all')}
                                        className="h-4 w-4 accent-indigo-600"
                                    />
                                    Оба сразу
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="radio"
                                        name="service-mode"
                                        checked={serviceMode === 'offer'}
                                        onChange={() => setServiceMode('offer')}
                                        className="h-4 w-4 accent-indigo-600"
                                    />
                                    Оказание услуги
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="radio"
                                        name="service-mode"
                                        checked={serviceMode === 'request'}
                                        onChange={() => setServiceMode('request')}
                                        className="h-4 w-4 accent-indigo-600"
                                    />
                                    Запрос услуги
                                </label>
                            </div>
                        </section>

                        <section>
                            <h3 className="mb-3 text-sm font-semibold text-slate-700">Категории</h3>
                            <div className="space-y-2">
                                {tags.length > 0 ? (
                                    tags.map((tag) => (
                                        <label key={tag.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={selectedTagIds.includes(tag.id)}
                                                onChange={() => toggleTag(tag.id)}
                                                className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                            />
                                            {tag.name}
                                        </label>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">Категории появятся здесь</p>
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className="mb-3 text-sm font-semibold text-slate-700">Подкатегории</h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-slate-400">
                                    <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" />
                                    Будут добавлены позже
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-400">
                                    <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" />
                                    Зависит от выбранной категории
                                </label>
                            </div>
                        </section>
                    </div>
                </aside>

                <main>
                    {adBlock.length === 0 && !isLoading ? (
                        <div className="text-center text-slate-500 py-20">Пока нет никаких объявлений</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                            {adBlock.map((ad) => (
                                <div
                                    key={ad.id}
                                    onClick={() => navigate(`/Home/${ad.id}`)}
                                    className="group cursor-pointer overflow-hidden rounded-lg border border-indigo-500 bg-indigo-500 shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-600"
                                >
                                    <div className="aspect-[4/3] overflow-hidden bg-black">
                                        <img
                                            src={`http://localhost:8000${ad.image_url}`}
                                            alt={ad.title}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    </div>

                                    <div className="space-y-2 p-3">
                                        <h3 className="truncate text-sm font-semibold text-white">{ad.title}</h3>
                                        <span className="inline-flex rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-300">
                                            {ad.price} руб.
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div ref={observerTarget} className="w-full text-center py-8 text-slate-500 text-sm">
                        {isLoading && 'Загрузка новых объявлений...'}
                        {!hasMore && adBlock.length > 0 && 'Вы просмотрели все объявления.'}
                    </div>
                </main>
            </div>
        </div>
    );
};
