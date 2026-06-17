import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fileUrl, formatPrice, getApiErrorMessage, listingTypeLabel, type AdBlock } from "../api/Api";
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
                setError(getApiErrorMessage(error, "Не удалось загрузить ваши объявления"));
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
            alert(getApiErrorMessage(error, "Не удалось удалить объявление"));
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="rounded-2xl bg-white p-6 shadow-2xl border border-black">
                    <h2 className="mb-3 text-2xl font-bold text-black">Мои объявления</h2>
                    <p className="mb-4 text-[#8A8F99]">Войдите в аккаунт, чтобы увидеть свои объявления.</p>
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="cursor-pointer rounded-[14px] bg-[#2F6FED] px-5 py-2.5 font-medium text-white shadow-lg shadow-[#2F6FED]/20 hover:bg-[#245DCC]"
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
                    className="cursor-pointer rounded-[14px] bg-[#2F6FED] px-5 py-2.5 font-medium text-white shadow-lg shadow-[#2F6FED]/20 hover:bg-[#245DCC]"
                >
                    Добавить объявление
                </button>
            </div>

            {isLoading && (
                <div className="py-20 text-center text-[#8A8F99]">Загрузка объявлений...</div>
            )}

            {!isLoading && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
            )}

            {!isLoading && !error && ads.length === 0 && (
                <div className="py-20 text-center text-[#8A8F99]">У вас пока нет объявлений</div>
            )}

            {!isLoading && !error && ads.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {ads.map((ad) => (
                        <div
                            key={ad.id}
                            className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                        >
                            <div
                                onClick={() => navigate(`/services/${ad.id}`)}
                                className="aspect-square cursor-pointer overflow-hidden bg-[#F2F3F5]"
                            >
                                {(ad.image_url || ad.images[0]?.url) ? (
                                    <img
                                        src={fileUrl(ad.images[0]?.url || ad.image_url)}
                                        alt={ad.title}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-slate-400">Нет фото</div>
                                )}
                            </div>

                            <div className="p-4">
                                <div className="mb-2 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-[#EEF4FF] px-2 py-1 text-xs font-semibold text-[#2F6FED]">
                                        {listingTypeLabel(ad.listing_type)}
                                    </span>
                                    <span className="rounded-full bg-[#F2F3F5] px-2 py-1 text-xs text-slate-600">
                                        {ad.status}
                                    </span>
                                </div>
                                <h3 className="truncate text-lg font-bold text-[#1A1A1A]">{ad.title}</h3>
                                <p className="mt-1 line-clamp-2 text-xs text-[#8A8F99]">
                                    {ad.description || "Нет описания"}
                                </p>
                                {ad.category && <p className="mt-2 text-xs text-slate-400">{ad.category.name}</p>}
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-[#F2F3F5] p-4">
                                <span className="rounded-md border border-[#E1E4EA] bg-white px-2 py-1 text-xs font-semibold text-[#2F6FED]">
                                    {formatPrice(ad)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/services/${ad.id}/edit`)}
                                    className="cursor-pointer rounded-md bg-[#2F6FED] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#245DCC]"
                                >
                                    Изменить
                                </button>
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
