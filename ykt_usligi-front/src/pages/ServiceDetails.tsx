import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl, formatPrice, listingTypeLabel, type AdBlock } from '../api/Api';

export const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ad, setAd] = useState<AdBlock | null>(null);
  const [similar, setSimilar] = useState<AdBlock[]>([]);
  const [activeImage, setActiveImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const serviceId = Number(id);
    if (!serviceId) {
      setError('Некорректный ID объявления');
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setError('');
      setIsLoading(true);
      try {
        const data = await api.getAdBlockById(serviceId);
        setAd(data);
        const firstImage = data.images[0]?.url || data.image_url || '';
        setActiveImage(firstImage);
        const similarData = await api.getSimilarServices(serviceId);
        setSimilar(similarData);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить объявление');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (isLoading) {
    return <div className="mx-auto max-w-6xl p-6 text-center text-slate-500">Загрузка объявления...</div>;
  }

  if (error || !ad) {
    return <div className="mx-auto max-w-6xl p-6 text-center text-red-600">{error || 'Объявление не найдено'}</div>;
  }

  const images = ad.images.length > 0 ? ad.images : ad.image_url ? [{ id: 0, url: ad.image_url, position: 0 }] : [];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-indigo-600 hover:underline">
        Назад
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-slate-100">
            {activeImage ? (
              <img src={fileUrl(activeImage)} alt={ad.title} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-slate-400">Нет фото</div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {images.map((image) => (
                <button
                  type="button"
                  key={`${image.id}-${image.url}`}
                  onClick={() => setActiveImage(image.url)}
                  className={`overflow-hidden rounded-xl border ${activeImage === image.url ? 'border-indigo-600' : 'border-slate-200'}`}
                >
                  <img src={fileUrl(image.url)} alt="Фото объявления" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {listingTypeLabel(ad.listing_type)}
            </span>
            {ad.category && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{ad.category.name}</span>}
            {ad.subcategory && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{ad.subcategory.name}</span>}
          </div>

          <h1 className="text-2xl font-bold text-slate-950">{ad.title}</h1>
          <p className="mt-3 text-2xl font-bold text-indigo-600">{formatPrice(ad)}</p>

          {ad.location && <p className="mt-3 text-sm text-slate-500">Локация: {ad.location}</p>}
          {ad.contact_phone && <p className="mt-2 text-sm text-slate-500">Телефон: {ad.contact_phone}</p>}

          <div className="mt-5 border-t pt-5">
            <p className="mb-2 text-sm font-semibold text-slate-700">Автор</p>
            <Link to={`/users/${ad.owner.id}`} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-slate-50">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {ad.owner.avatar_url ? (
                  <img src={fileUrl(ad.owner.avatar_url)} alt={ad.owner.username} className="h-full w-full object-cover" />
                ) : (
                  ad.owner.username.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-950">{ad.owner.display_name || ad.owner.username}</p>
                <p className="text-xs text-slate-500">@{ad.owner.username}</p>
              </div>
            </Link>
          </div>
        </aside>
      </div>

      <section className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-slate-950">Описание</h2>
        <p className="whitespace-pre-wrap text-slate-700">{ad.description || 'Описание не указано'}</p>
      </section>

      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-slate-950">Похожие объявления</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <Link key={item.id} to={`/services/${item.id}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md">
                <div className="aspect-[4/3] bg-slate-100">
                  {(item.image_url || item.images[0]?.url) && (
                    <img src={fileUrl(item.images[0]?.url || item.image_url)} alt={item.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="truncate font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-indigo-600">{formatPrice(item)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
