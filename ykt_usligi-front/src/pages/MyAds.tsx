import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AdBlock } from "../api/Api";
import { getToken } from "../api/auth";

export const MyAds = () => {
    const navigate = useNavigate();
    const [ads, setAds] = useState<AdBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const isAuthenticated = !!getToken();

    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        const loadMyAds = async () => {
            setError("");
            setIsLoading(true);

            try {
                const data = await api.getMyAdBlocks();
                setAds(data);
            } catch (error) {
                console.error(error);
                setError("Не удалось загрузить ваши объявления");
            } finally {
                setIsLoading(false);
            }
        };

        loadMyAds();
    }, [isAuthenticated]);

    const handleDelete = async (id: number, title: string) => {
        const confirmed = window.confirm(`Удалить объявление "${title}"?`);
        if (!confirmed) return;

        try {
            await api.deleteAdBlock(id);
            setAds((prev) => prev.filter((ad) => ad.id !== id));
        } catch (error) {
            console.error(error);
            alert("Не удалось удалить объявление");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="rounded-2xl bg-white p-6 shadow-2xl border border-black">
                    <h2 className="mb-3 text-2xl font-bold text-black">Мои объявления</h2>
                    <p className="mb-4 text-slate-500">Войдите в аккаунт, чтобы увидеть свои объявления.</p>
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="cursor-pointer rounded-[14px] bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
                    >
                        Войти
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-black">Мои объявления</h2>
                <button
                    type="button"
                    onClick={() => navigate("/adadder")}
                    className="cursor-pointer rounded-[14px] bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
                >
                    Добавить объявление
                </button>
            </div>

            {isLoading && (
                <div className="py-20 text-center text-slate-500">Загрузка объявлений...</div>
            )}

            {!isLoading && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
            )}

            {!isLoading && !error && ads.length === 0 && (
                <div className="py-20 text-center text-slate-500">У вас пока нет объявлений</div>
            )}

            {!isLoading && !error && ads.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {ads.map((ad) => (
                        <div
                            key={ad.id}
                            className="overflow-hidden rounded-2xl border bg-indigo-500 shadow-lg"
                        >
                            <div className="aspect-square overflow-hidden bg-black">
                                <img
                                    src={`http://localhost:8000${ad.image_url}`}
                                    alt={ad.title}
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            <div className="p-4">
                                <h3 className="truncate text-lg font-bold text-white">{ad.title}</h3>
                                <p className="mt-1 line-clamp-2 text-xs text-white">
                                    {ad.description || "Нет описания"}
                                </p>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-slate-800/60 bg-slate-900/50 p-4">
                                <span className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-300">
                                    {ad.price} руб.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(ad.id, ad.title)}
                                    className="cursor-pointer rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
