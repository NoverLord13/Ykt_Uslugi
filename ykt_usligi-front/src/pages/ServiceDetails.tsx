import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl, formatPrice, getApiErrorMessage, listingTypeLabel, type AdBlock, type UserProfile } from '../api/Api';
import { getToken } from '../api/auth';

export const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ad, setAd] = useState<AdBlock | null>(null);
  const [similar, setSimilar] = useState<AdBlock[]>([]);
  const [activeImage, setActiveImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');

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
        setError(getApiErrorMessage(err, 'Не удалось загрузить объявление'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    if (getToken()) api.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, [id]);

  const handleResponse = async () => {
    if (!ad) return;
    setActionMessage('');
    try {
      await api.createResponse(ad.id, responseMessage.trim());
      setResponseMessage('');
      setActionMessage('Отклик отправлен автору объявления');
    } catch (err) { setActionMessage(getApiErrorMessage(err, 'Не удалось отправить отклик')); }
  };

  const handleReport = async () => {
    if (!ad) return;
    const reason = window.prompt('Опишите нарушение (минимум 10 символов)');
    if (!reason) return;
    try { await api.createReport('service', ad.id, reason); setActionMessage('Жалоба отправлена администрации'); }
    catch (err) { setActionMessage(getApiErrorMessage(err, 'Не удалось отправить жалобу')); }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-6xl p-6 text-center text-[#8A8F99]">Загрузка объявления...</div>;
  }

  if (error || !ad) {
    return <div className="mx-auto max-w-6xl p-6 text-center text-red-600">{error || 'Объявление не найдено'}</div>;
  }

  const images = ad.images.length > 0 ? ad.images : ad.image_url ? [{ id: 0, url: ad.image_url, position: 0 }] : [];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-[#2F6FED] hover:underline">
        Назад
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border bg-[#F2F3F5]">
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
                  className={`overflow-hidden rounded-xl border ${activeImage === image.url ? 'border-[#2F6FED]' : 'border-[#E1E4EA]'}`}
                >
                  <img src={fileUrl(image.url)} alt="Фото объявления" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-semibold text-[#2F6FED]">
              {listingTypeLabel(ad.listing_type)}
            </span>
            {ad.category && <span className="rounded-full bg-[#F2F3F5] px-3 py-1 text-xs text-slate-700">{ad.category.name}</span>}
            {ad.subcategory && <span className="rounded-full bg-[#F2F3F5] px-3 py-1 text-xs text-slate-700">{ad.subcategory.name}</span>}
          </div>

          <h1 className="text-2xl font-bold text-[#1A1A1A]">{ad.title}</h1>
          <p className="mt-3 text-2xl font-bold text-[#2F6FED]">{formatPrice(ad)}</p>

          {ad.location && <p className="mt-3 text-sm text-[#8A8F99]"><span className="font-semibold text-slate-700">Локация:</span> {ad.location}</p>}
          
          {ad.contact_phone && (
            <div className="mt-4 space-y-3 border-t border-[#E1E4EA] pt-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8A8F99]">Контакты</span>
                {showPhone ? (
                  <a
                    href={`tel:${ad.contact_phone}`}
                    className="inline-flex items-center justify-center rounded-xl border border-[#E1E4EA] bg-[#F2F3F5] px-4 py-2.5 font-bold text-[#1A1A1A] hover:bg-slate-100 transition-colors"
                  >
                    {ad.contact_phone}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPhone(true)}
                    className="cursor-pointer w-full rounded-xl bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#245DCC] transition-colors text-center"
                  >
                    Показать номер
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <a
                  href={`https://wa.me/${ad.contact_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#20ba5a] transition-colors"
                >
                  Написать в WhatsApp
                </a>

                {ad.owner.telegram_username && <a
                  href={`https://t.me/${ad.owner.telegram_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-[#0088cc] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0077b3] transition-colors"
                >
                  Написать в Telegram
                </a>}
              </div>
            </div>
          )}

          <div className="mt-5 border-t pt-5">
            <p className="mb-2 text-sm font-semibold text-slate-700">Автор</p>
            <Link to={`/users/${ad.owner.id}`} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-[#F2F3F5]">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-bold text-[#2F6FED]">
                {ad.owner.avatar_url ? (
                  <img src={fileUrl(ad.owner.avatar_url)} alt={ad.owner.username} className="h-full w-full object-cover" />
                ) : (
                  ad.owner.username.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <p className="font-semibold text-[#1A1A1A]">{ad.owner.display_name || ad.owner.username}</p>
                <p className="text-xs text-[#8A8F99]">@{ad.owner.username}</p>
              </div>
            </Link>
          </div>

          {currentUser && currentUser.id !== ad.owner.id && <div className="mt-5 border-t pt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Сообщение автору</label>
            <textarea value={responseMessage} onChange={(e) => setResponseMessage(e.target.value)} maxLength={2000} rows={3} placeholder="Коротко опишите предложение или задайте вопрос" className="w-full rounded-xl border px-3 py-2 text-sm" />
            <button type="button" onClick={handleResponse} className="mt-2 w-full rounded-xl bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white">Откликнуться</button>
          </div>}
          {!currentUser && <Link to="/login" className="mt-5 block rounded-xl bg-[#2F6FED] px-4 py-2.5 text-center text-sm font-semibold text-white">Войти, чтобы откликнуться</Link>}
          {actionMessage && <p className="mt-3 text-sm text-slate-600">{actionMessage}</p>}
          {currentUser && currentUser.id !== ad.owner.id && <button type="button" onClick={handleReport} className="mt-4 text-xs text-red-600 hover:underline">Пожаловаться на объявление</button>}
        </aside>
      </div>

      <section className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xl font-bold text-[#1A1A1A]">Описание</h2>
        <p className="whitespace-pre-wrap text-slate-700">{ad.description || 'Описание не указано'}</p>
      </section>

      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-[#1A1A1A]">Похожие объявления</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <Link key={item.id} to={`/services/${item.id}`} className="overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md">
                <div className="aspect-[4/3] bg-[#F2F3F5]">
                  {(item.image_url || item.images[0]?.url) && (
                    <img src={fileUrl(item.images[0]?.url || item.image_url)} alt={item.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="truncate font-semibold text-[#1A1A1A]">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#2F6FED]">{formatPrice(item)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
