import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { api, type AdBlock } from '../api/Api';
import { getToken } from '../api/auth';

export const Home = () => {
    const isAuthenticated = !!getToken();
    const navigate = useNavigate();

    const [adBlock, setAdBlock] = useState<AdBlock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement | null>(null);
    const LIMIT = 12;

    // Загрузка артов порциями
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
        console.error('Ошибка при загрузке галереи:', error);
        } finally {
        setIsLoading(false);
        }
    }, [skip, isLoading, hasMore]);

    // Скролл
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

    return (
        <div className="p-6 max-w-7xl mx-auto text-slate-200 mt-6">
            <div className='flex justify-between items-center mb-8'>
                <div>
                    <h1 className="text-4xl font-bold text-black mb-2">Uslugi Ykt</h1>
                </div>
                
                <div className="flex gap-4">
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

            {adBlock.length === 0 && !isLoading ? (
                <div className="text-center text-slate-500 py-20">Пока нет никаких объявлений</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {adBlock.map((ad) => (
                        <div
                            key={ad.id}
                            onClick={() => navigate(`/Home/${ad.id}`)}
                            className="group bg-indigo-600 border bg-indigo-500 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-lg relative cursor-pointer hover:-translate-y-1"
                            >
                        <div>
                            <div className="overflow-hidden aspect-square bg-black">
                            <img
                                src={`http://localhost:8000${ad.image_url}`}
                                alt={ad.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            </div>

                            <div className="p-4">
                            <h3 className="font-bold text-lg text-white truncate">{ad.title}</h3>
                            <p className="text-white 0 text-xs mt-1 line-clamp-2">
                                {ad.description || 'Нет описания'}
                            </p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-800/60 flex justify-between items-center bg-slate-900/50">
                            <div className="flex items-center gap-3 text-slate-400 text-xs font-medium">
                                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                                    {ad.price} руб.
                                </span>
                            </div>

                        </div>
                        </div>
                    ))}
                </div>
            )}

            <div ref={observerTarget} className="w-full text-center py-8 text-slate-500 text-sm">
                {isLoading && 'Загрузка новых объявлений...'}
                {!hasMore && adBlock.length > 0 && 'Вы просмотрели все объявления.'}
            </div>
        </div>
    );
};
