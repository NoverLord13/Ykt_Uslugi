import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fileUrl, formatPrice, getApiErrorMessage, listingTypeLabel, type AdBlock, type ServiceResponse, type UserProfile } from '../api/Api';
import { getToken } from '../api/auth';
import { ReportModal } from '../components/FeedbackModals';

const PinIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
const ShieldIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 5 6v5c0 4.6 2.8 8.4 7 10 4.2-1.6 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
const PhoneIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L9 11a16 16 0 0 0 4 4l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>;

export const ServiceDetails = () => {
  const { id } = useParams(); const navigate = useNavigate(); const serviceId = Number(id);
  const [ad, setAd] = useState<AdBlock | null>(null); const [similar, setSimilar] = useState<AdBlock[]>([]); const [activeImage, setActiveImage] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null); const [activeResponse, setActiveResponse] = useState<ServiceResponse | null>(null);
  const [responseMessage, setResponseMessage] = useState(''); const [showPhone, setShowPhone] = useState(false); const [reportOpen, setReportOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(''); const [actionError, setActionError] = useState(false); const [loading, setLoading] = useState(true); const [responding, setResponding] = useState(false); const [error, setError] = useState('');

  useEffect(() => {
    if (!serviceId) { setError('Некорректный адрес объявления'); setLoading(false); return; }
    const load = async () => {
      setLoading(true); setError('');
      try {
        const data = await api.getAdBlockById(serviceId); setAd(data); setActiveImage(data.images[0]?.url || data.image_url || '');
        api.getSimilarServices(serviceId).then(setSimilar).catch(() => setSimilar([]));
        if (getToken()) {
          const [user, responses] = await Promise.all([api.getMe(), api.getSentResponses()]);
          setCurrentUser(user); setActiveResponse(responses.find(item => item.service.id === serviceId && ['new', 'accepted'].includes(item.status)) || null);
        }
      } catch (err) { setError(getApiErrorMessage(err, 'Не удалось открыть объявление')); }
      finally { setLoading(false); }
    };
    void load();
  }, [serviceId]);

  const respond = async () => {
    if (!ad) return; setResponding(true); setActionMessage(''); setActionError(false);
    try { const created = await api.createResponse(ad.id, responseMessage.trim()); setActiveResponse(created); setResponseMessage(''); setActionMessage('Отклик отправлен — следить за ним можно в разделе «Сделки»'); }
    catch (err) { setActionError(true); setActionMessage(getApiErrorMessage(err, 'Не удалось отправить отклик')); }
    finally { setResponding(false); }
  };

  if (loading) return <div className="page-shell"><div className="grid min-h-[55vh] place-items-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[var(--brand-soft)]"/><p className="mt-4 text-sm text-[var(--muted)]">Открываем объявление…</p></div></div></div>;
  if (error || !ad) return <div className="page-shell"><div className="empty-state"><h1 className="text-xl font-black text-[var(--ink)]">Объявление недоступно</h1><p className="mt-2 text-sm">{error || 'Возможно, оно было снято с публикации.'}</p><button onClick={() => navigate('/')} className="button-primary mt-5">Вернуться к объявлениям</button></div></div>;

  const images = ad.images.length ? ad.images : ad.image_url ? [{ id: 0, url: ad.image_url, position: 0 }] : [];
  const isOwner = currentUser?.id === ad.owner.id; const canInteract = currentUser && !isOwner; const authorName = ad.owner.display_name || ad.owner.username;
  const published = new Date(ad.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const respondLabel = ad.listing_type === 'request' ? 'Предложить помощь' : 'Заказать услугу';

  return <div className="page-shell pb-28 md:pb-16">
    <nav aria-label="Хлебные крошки" className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden text-sm text-[var(--muted)]">
      <Link to="/" className="flex-none hover:text-[var(--brand)]">Объявления</Link><span>›</span>
      {ad.category && <><span className="flex-none">{ad.category.name}</span><span>›</span></>}
      <span className="truncate text-[var(--ink)]">{ad.title}</span>
    </nav>

    <main className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)] lg:items-start">
      <div className="min-w-0 space-y-6">
        <section aria-label="Фотографии объявления">
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-[#eef1f3]">
            {activeImage ? <img src={fileUrl(activeImage)} alt={ad.title} className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"/> : <div className="grid aspect-[4/3] place-items-center sm:aspect-[16/10]"><div className="text-center text-[var(--muted)]"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-2xl shadow-sm">⌂</div><p className="mt-3 text-sm font-semibold">Автор не добавил фотографии</p></div></div>}
            {images.length > 1 && <span className="absolute bottom-4 right-4 rounded-full bg-[#172234]/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">{images.findIndex(item => item.url === activeImage) + 1} / {images.length}</span>}
          </div>
          {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1">{images.map(image => <button type="button" key={`${image.id}-${image.url}`} onClick={() => setActiveImage(image.url)} aria-label="Открыть фотографию" className={`h-20 w-24 flex-none overflow-hidden rounded-2xl border-2 bg-[#eef1f3] transition ${activeImage === image.url ? 'border-[var(--brand)] opacity-100' : 'border-transparent opacity-70 hover:opacity-100'}`}><img src={fileUrl(image.url)} alt="" className="h-full w-full object-cover"/></button>)}</div>}
        </section>

        <section className="surface p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black text-[var(--ink)] sm:text-2xl">О задаче</h2><span className="text-xs text-[var(--muted)]">№ {ad.id}</span></div>
          <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-[#445064]">{ad.description}</p>
          <div className="mt-7 grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f4f6f7] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Формат</p><p className="mt-1 text-sm font-bold text-[var(--ink)]">{listingTypeLabel(ad.listing_type)}</p></div>
            <div className="rounded-2xl bg-[#f4f6f7] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Место</p><p className="mt-1 text-sm font-bold text-[var(--ink)]">{ad.location || 'По договорённости'}</p></div>
          </div>
        </section>
      </div>

      <aside className="surface overflow-hidden lg:sticky lg:top-24">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2"><span className="status-pill bg-[var(--brand-soft)] text-[var(--brand-dark)]">{ad.listing_type === 'request' ? 'Нужен специалист' : 'Услуга'}</span>{ad.subcategory && <span className="status-pill bg-[#edf2f7] text-[#526071]">{ad.subcategory.name}</span>}</div>
          <h1 className="mt-4 text-2xl font-black leading-tight tracking-[-.025em] text-[var(--ink)] sm:text-[28px]">{ad.title}</h1>
          <p className="mt-4 text-3xl font-black tracking-tight text-[var(--ink)]">{formatPrice(ad)}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--muted)]">{ad.location && <span className="inline-flex items-center gap-1.5"><PinIcon/>{ad.location}</span>}<span>Опубликовано {published}</span></div>
        </div>

        <div id="deal-actions" className="scroll-mt-24 border-t border-[var(--line)] p-5 sm:p-6">
          {isOwner ? <div className="rounded-2xl bg-[#f4f6f7] p-4"><p className="font-black text-[var(--ink)]">Это ваше объявление</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Измените детали или статус в редакторе.</p><Link to={`/services/${ad.id}/edit`} className="button-primary mt-4 w-full">Редактировать</Link></div> : canInteract ? activeResponse ? <div className="rounded-2xl bg-[#eaf3ff] p-4"><p className="font-black text-[#245ca8]">Отклик уже отправлен</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Новый отклик станет доступен после завершения или отмены этой сделки.</p><Link to="/responses" className="mt-3 inline-flex text-sm font-black text-[#245ca8]">Открыть сделку →</Link></div> : <div><label className="field"><span>{ad.listing_type === 'request' ? 'Расскажите, как можете помочь' : 'Уточните задачу или удобное время'} <small>необязательно</small></span><textarea value={responseMessage} onChange={event => setResponseMessage(event.target.value)} rows={3} maxLength={2000} placeholder="Короткое сообщение автору"/></label><button type="button" disabled={responding} onClick={respond} className="button-primary mt-3 w-full">{responding ? 'Отправляем…' : respondLabel}</button></div> : <div><p className="text-sm leading-6 text-[var(--muted)]">Войдите, чтобы связаться с автором и сохранить историю сделки.</p><Link to="/login" state={{ from: `/services/${ad.id}` }} className="button-primary mt-3 w-full">Войти и откликнуться</Link></div>}
          {actionMessage && <p className={`mt-3 rounded-xl p-3 text-xs font-semibold ${actionError ? 'bg-red-50 text-red-700' : 'bg-[#e9f7ef] text-[#157354]'}`}>{actionMessage}</p>}
        </div>

        {ad.contact_phone && !isOwner && <div className="border-t border-[var(--line)] p-5 sm:p-6"><p className="mb-3 text-xs font-black uppercase tracking-[.1em] text-[var(--muted)]">Связаться напрямую</p>{showPhone ? <a href={`tel:${ad.contact_phone}`} className="button-secondary w-full text-base"><PhoneIcon/>{ad.contact_phone}</a> : <button type="button" onClick={() => setShowPhone(true)} className="button-secondary w-full"><PhoneIcon/>Показать телефон</button>}<a href={`https://wa.me/${ad.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center justify-center rounded-[14px] border border-[#bfe8cd] bg-[#edf9f1] px-4 text-sm font-black text-[#17733b] transition hover:bg-[#e2f5e9]">Написать в WhatsApp</a></div>}

        <div className="border-t border-[var(--line)] p-5 sm:p-6"><p className="mb-3 text-xs font-black uppercase tracking-[.1em] text-[var(--muted)]">Автор объявления</p><Link to={`/users/${ad.owner.id}`} className="group flex items-center gap-3 rounded-2xl border border-[var(--line)] p-3 transition hover:border-[#b8c8dc] hover:bg-[#f7f9fb]"><div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-2xl bg-[var(--accent)] text-sm font-black text-white">{ad.owner.avatar_url ? <img src={fileUrl(ad.owner.avatar_url)} alt={authorName} className="h-full w-full object-cover"/> : ad.owner.username.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-black text-[var(--ink)]">{authorName}</p><p className="mt-0.5 text-xs text-[var(--muted)]">@{ad.owner.username} · Смотреть профиль</p></div><span className="text-[var(--muted)] transition group-hover:translate-x-1">→</span></Link><div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#f4f6f7] p-3 text-xs leading-5 text-[var(--muted)]"><span className="mt-0.5 text-[#27845c]"><ShieldIcon/></span><span>Договорённости фиксируются в разделе «Сделки». Не переводите предоплату незнакомым людям.</span></div></div>
        {canInteract && <button type="button" onClick={() => setReportOpen(true)} className="w-full border-t border-[var(--line)] px-6 py-4 text-left text-xs font-bold text-[var(--muted)] transition hover:bg-red-50 hover:text-[var(--danger)]">Пожаловаться на объявление</button>}
      </aside>
    </main>

    {similar.length > 0 && <section className="mt-12"><div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">Ещё варианты</p><h2 className="mt-1 text-2xl font-black text-[var(--ink)]">Похожие объявления</h2></div><Link to="/" className="hidden text-sm font-black text-[var(--brand)] sm:block">Смотреть все →</Link></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{similar.slice(0,4).map(item => <Link key={item.id} to={`/services/${item.id}`} className="surface group overflow-hidden transition hover:-translate-y-1"><div className="aspect-[4/3] overflow-hidden bg-[#eef1f3]">{(item.image_url || item.images[0]?.url) ? <img src={fileUrl(item.images[0]?.url || item.image_url)} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="grid h-full place-items-center text-2xl text-[var(--muted)]">⌂</div>}</div><div className="p-4"><p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-[var(--ink)]">{item.title}</p><p className="mt-3 font-black text-[var(--brand)]">{formatPrice(item)}</p>{item.location && <p className="mt-2 truncate text-xs text-[var(--muted)]">{item.location}</p>}</div></Link>)}</div></section>}

    {!isOwner && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/95 p-3 shadow-[0_-8px_30px_rgb(23_34_52/0.10)] backdrop-blur md:hidden"><div className="mx-auto flex max-w-lg items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-xs text-[var(--muted)]">{ad.title}</p><p className="truncate font-black text-[var(--ink)]">{formatPrice(ad)}</p></div>{activeResponse ? <Link to="/responses" className="button-primary">Открыть сделку</Link> : <a href="#deal-actions" className="button-primary">{respondLabel}</a>}</div></div>}
    <ReportModal open={reportOpen} targetType="service" targetId={ad.id} onClose={() => setReportOpen(false)} onSuccess={() => { setActionError(false); setActionMessage('Жалоба отправлена модератору'); }} />
  </div>;
};
