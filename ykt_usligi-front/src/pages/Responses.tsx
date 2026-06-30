import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage, type ServiceResponse } from '../api/Api';
import { ReviewModal } from '../components/FeedbackModals';

const statusMeta: Record<ServiceResponse['status'], { label: string; className: string; hint: string }> = {
  new: { label: 'Ждёт решения', className: 'bg-[#fff3dc] text-[#9a5b00]', hint: 'Отклик отправлен, решение ещё не принято' },
  accepted: { label: 'В работе', className: 'bg-[#e7f0ff] text-[#245ca8]', hint: 'Исполнитель выбран, работа идёт' },
  completed: { label: 'Выполнено', className: 'bg-[#dff8ee] text-[#157354]', hint: 'Сделка успешно завершена' },
  cancelled: { label: 'Отменено', className: 'bg-[#f1eef3] text-[#746d80]', hint: 'Сделка отменена одним из участников' },
  declined: { label: 'Не выбран', className: 'bg-[#fff0f3] text-[#b42f49]', hint: 'Заказчик выбрал другого исполнителя' },
};

type View = 'active' | 'history';

export const Responses = () => {
  const [sent, setSent] = useState<ServiceResponse[]>([]); const [received, setReceived] = useState<ServiceResponse[]>([]);
  const [view, setView] = useState<View>('active'); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<ServiceResponse | null>(null);

  const load = async () => { setLoading(true); setError(''); try { const [sentData, receivedData] = await Promise.all([api.getSentResponses(), api.getReceivedResponses()]); setSent(sentData); setReceived(receivedData); } catch (err) { setError(getApiErrorMessage(err, 'Не удалось загрузить сделки')); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const all = useMemo(() => [...received.map(item => ({ item, incoming: true })), ...sent.map(item => ({ item, incoming: false }))], [received, sent]);
  const visible = all.filter(({ item }) => view === 'active' ? ['new', 'accepted'].includes(item.status) : ['completed', 'cancelled', 'declined'].includes(item.status));
  const activeCount = all.filter(({ item }) => ['new', 'accepted'].includes(item.status)).length;

  const changeStatus = async (id: number, status: 'accepted' | 'completed' | 'cancelled' | 'declined') => { setBusyId(id); setError(''); try { await api.updateResponse(id, status); await load(); } catch (err) { setError(getApiErrorMessage(err, 'Не удалось изменить статус')); } finally { setBusyId(null); } };

  const card = ({ item, incoming }: { item: ServiceResponse; incoming: boolean }) => {
    const meta = statusMeta[item.status];
    const peer = incoming ? item.respondent : item.service.owner;
    return <article key={`${incoming}-${item.id}`} className="surface group p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgb(55_38_91/0.11)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><span className={`status-pill ${meta.className}`}>{meta.label}</span><span className="text-xs text-[var(--muted)]">{incoming ? 'Входящий отклик' : 'Мой отклик'}</span></div>
          <Link to={`/services/${item.service.id}`} className="block truncate text-lg font-black text-[var(--ink)] transition group-hover:text-[var(--brand)]">{item.service.title}</Link>
          <Link to={`/users/${peer.id}`} className="mt-1 inline-block text-sm text-[var(--muted)] hover:text-[var(--brand)]">{incoming ? 'От' : 'Объявление автора'} · {peer.display_name || peer.username}</Link>
        </div>
        <p className="max-w-xs text-xs leading-5 text-[var(--muted)] sm:text-right">{meta.hint}</p>
      </div>
      {item.message && <div className="mt-4 rounded-2xl bg-[#f8f5fa] px-4 py-3 text-sm leading-6 text-[#51495c]">“{item.message}”</div>}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
        {item.can_accept && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'accepted')} className="button-primary">Выбрать исполнителя</button>}
        {incoming && item.status === 'new' && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'declined')} className="button-secondary">Отклонить</button>}
        {item.can_complete && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'completed')} className="button-primary">Подтвердить выполнение</button>}
        {item.can_cancel && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'cancelled')} className="button-quiet">Отменить</button>}
        {item.can_review && <button onClick={() => setReviewing(item)} className="button-primary">Оценить заказчика</button>}
        {item.review_left && <span className="status-pill bg-[#f1eef3] text-[var(--muted)]">✓ Отзыв оставлен</span>}
      </div>
    </article>;
  };

  return <div className="page-shell">
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Рабочее пространство</p><h1 className="page-title mt-2">Отклики и сделки</h1><p className="page-subtitle mt-3">Все договорённости в одном месте — от первого отклика до честной оценки результата.</p></div><Link to="/" className="button-secondary">Найти объявления</Link></header>
    <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-[var(--line)] sm:w-fit">
      <button onClick={() => setView('active')} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold ${view === 'active' ? 'bg-[var(--ink)] text-white' : 'text-[var(--muted)]'}`}>В работе <span className="ml-1 opacity-70">{activeCount}</span></button>
      <button onClick={() => setView('history')} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold ${view === 'history' ? 'bg-[var(--ink)] text-white' : 'text-[var(--muted)]'}`}>История <span className="ml-1 opacity-70">{all.length - activeCount}</span></button>
    </div>
    {error && <p className="form-error mb-5">{error}</p>}
    {loading ? <div className="empty-state">Загружаем ваши сделки…</div> : visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map(card)}</div> : <div className="empty-state"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-2xl">↗</div><h2 className="text-lg font-black text-[var(--ink)]">{view === 'active' ? 'Активных сделок пока нет' : 'История пока пуста'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6">{view === 'active' ? 'Откликнитесь на подходящее объявление или дождитесь отклика на своё.' : 'Здесь появятся завершённые, отменённые и отклонённые сделки.'}</p></div>}
    {reviewing && <ReviewModal open responseId={reviewing.id} targetUserId={(reviewing.service.listing_type === 'request' ? reviewing.service.owner : reviewing.respondent).id} performerName={(reviewing.service.listing_type === 'request' ? reviewing.service.owner : reviewing.respondent).display_name || customerName(reviewing)} onClose={() => setReviewing(null)} onSuccess={() => void load()} />}
  </div>;
};

const customerName = (item: ServiceResponse) => (item.service.listing_type === 'request' ? item.service.owner : item.respondent).username;
