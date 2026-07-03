import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACTIVE_DEAL_STATUSES, api, getApiErrorMessage, type ServiceResponse } from '../api/Api';
import { DealActionModal, ReviewModal } from '../components/FeedbackModals';

const statusMeta: Record<ServiceResponse['status'], { label: string; className: string; hint: string }> = {
  new: { label: 'Ждёт решения', className: 'bg-[#fff3dc] text-[#9a5b00]', hint: 'Автор объявления ещё не принял решение' },
  accepted: { label: 'В работе', className: 'bg-[#e7f0ff] text-[#245ca8]', hint: 'Исполнитель выбран и выполняет работу' },
  work_submitted: { label: 'На приёмке', className: 'bg-[#fff0eb] text-[var(--brand-dark)]', hint: 'Исполнитель сообщил о готовности результата' },
  revision_requested: { label: 'Доработка', className: 'bg-[#fff3dc] text-[#9a5b00]', hint: 'Заказчик попросил внести исправления' },
  disputed: { label: 'Открыт спор', className: 'bg-[#fff0f3] text-[#b42f49]', hint: 'Сделку рассматривает модератор' },
  completed: { label: 'Завершено', className: 'bg-[#dff8ee] text-[#157354]', hint: 'Заказчик принял результат работы' },
  cancelled: { label: 'Отменено', className: 'bg-[#f1f3f5] text-[#687386]', hint: 'Сделка отменена до передачи результата' },
  declined: { label: 'Не выбран', className: 'bg-[#fff0f3] text-[#b42f49]', hint: 'Автор объявления выбрал другой отклик' },
};

type View = 'active' | 'history';
type NoteAction = { item: ServiceResponse; type: 'revision_requested' | 'disputed' };
const PAGE_SIZE = 50;

export const Responses = () => {
  const [sent, setSent] = useState<ServiceResponse[]>([]); const [received, setReceived] = useState<ServiceResponse[]>([]);
  const [view, setView] = useState<View>('active'); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<ServiceResponse | null>(null); const [noteAction, setNoteAction] = useState<NoteAction | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = async (append = false) => { setLoading(true); setError(''); try { const offset = append ? Math.max(sent.length, received.length) : 0; const [sentData, receivedData] = await Promise.all([api.getSentResponses(offset, PAGE_SIZE), api.getReceivedResponses(offset, PAGE_SIZE)]); setSent(items => append ? [...items, ...sentData] : sentData); setReceived(items => append ? [...items, ...receivedData] : receivedData); setHasMore(sentData.length === PAGE_SIZE || receivedData.length === PAGE_SIZE); } catch (err) { setError(getApiErrorMessage(err, 'Не удалось загрузить сделки')); } finally { setLoading(false); } };
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getSentResponses(0, PAGE_SIZE), api.getReceivedResponses(0, PAGE_SIZE)])
      .then(([sentData, receivedData]) => { if (!cancelled) { setSent(sentData); setReceived(receivedData); setHasMore(sentData.length === PAGE_SIZE || receivedData.length === PAGE_SIZE); } })
      .catch((err) => { if (!cancelled) setError(getApiErrorMessage(err, 'Не удалось загрузить сделки')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const all = useMemo(() => [...received.map(item => ({ item, incoming: true })), ...sent.map(item => ({ item, incoming: false }))], [received, sent]);
  const visible = all.filter(({ item }) => view === 'active' ? ACTIVE_DEAL_STATUSES.includes(item.status) : !ACTIVE_DEAL_STATUSES.includes(item.status));
  const activeCount = all.filter(({ item }) => ACTIVE_DEAL_STATUSES.includes(item.status)).length;

  const changeStatus = async (id: number, status: ServiceResponse['status'], note?: string) => { setBusyId(id); setError(''); try { await api.updateResponse(id, status, note); await load(); } catch (err) { const message = getApiErrorMessage(err, 'Не удалось изменить статус'); setError(message); throw err; } finally { setBusyId(null); } };

  const card = ({ item, incoming }: { item: ServiceResponse; incoming: boolean }) => {
    const meta = statusMeta[item.status]; const peer = incoming ? item.respondent : item.service.owner;
    const deadline = item.completion_deadline ? new Date(item.completion_deadline).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    return <article key={`${incoming}-${item.id}`} className="surface group p-5 transition hover:-translate-y-0.5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`status-pill ${meta.className}`}>{meta.label}</span><span className="text-xs text-[var(--muted)]">{incoming ? 'Входящий отклик' : 'Мой отклик'}</span></div><Link to={`/services/${item.service.id}`} className="block truncate text-lg font-black text-[var(--ink)] transition group-hover:text-[var(--brand)]">{item.service.title}</Link><Link to={`/users/${peer.id}`} className="mt-1 inline-block text-sm text-[var(--muted)] hover:text-[var(--brand)]">{incoming ? 'От' : 'Объявление автора'} · {peer.display_name || peer.username}</Link></div><p className="max-w-xs text-xs leading-5 text-[var(--muted)] sm:text-right">{meta.hint}{item.status === 'work_submitted' && deadline ? ` Автоприёмка: ${deadline}.` : ''}</p></div>
      {item.message && <div className="mt-4 rounded-2xl bg-[#f4f6f7] px-4 py-3 text-sm leading-6 text-[#445064]">“{item.message}”</div>}
      {item.status_note && <div className={`mt-3 rounded-2xl px-4 py-3 text-sm leading-6 ${item.status === 'disputed' ? 'bg-red-50 text-red-800' : 'bg-[#fff8e8] text-[#73561b]'}`}><b className="block text-xs uppercase tracking-wide opacity-70">Комментарий по статусу</b>{item.status_note}</div>}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
        {item.can_accept && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'accepted')} className="button-primary">{item.service.listing_type === 'request' ? 'Выбрать исполнителя' : 'Принять заказ'}</button>}
        {incoming && item.status === 'new' && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'declined')} className="button-secondary">Отклонить</button>}
        {item.can_submit_work && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'work_submitted')} className="button-primary">Работа выполнена</button>}
        {item.can_confirm && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'completed')} className="button-primary">Принять работу</button>}
        {item.can_request_revision && <button onClick={() => setNoteAction({ item, type: 'revision_requested' })} className="button-secondary">Нужны исправления</button>}
        {item.can_dispute && <button onClick={() => setNoteAction({ item, type: 'disputed' })} className="button-quiet text-[var(--danger)]">Открыть спор</button>}
        {item.can_cancel && <button disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'cancelled')} className="button-quiet">Отменить</button>}
        {item.can_review && item.review_target && <button onClick={() => setReviewing(item)} className="button-primary">{item.review_type === 'performer' ? 'Оценить исполнителя' : 'Оценить заказчика'}</button>}
        {item.review_left && <span className="status-pill bg-[#f1f3f5] text-[var(--muted)]">✓ Отзыв оставлен</span>}
      </div>
    </article>;
  };

  return <div className="page-shell"><header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Рабочее пространство</p><h1 className="page-title mt-2">Отклики и сделки</h1><p className="page-subtitle mt-3">Исполнитель передаёт результат, заказчик принимает работу, а репутация формируется только после завершения.</p></div><Link to="/" className="button-secondary">Найти объявления</Link></header>
    <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-[var(--line)] sm:w-fit"><button onClick={() => setView('active')} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold ${view === 'active' ? 'bg-[var(--ink)] text-white' : 'text-[var(--muted)]'}`}>В работе <span className="ml-1 opacity-70">{activeCount}</span></button><button onClick={() => setView('history')} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold ${view === 'history' ? 'bg-[var(--ink)] text-white' : 'text-[var(--muted)]'}`}>История <span className="ml-1 opacity-70">{all.length - activeCount}</span></button></div>
    {error && <p className="form-error mb-5">{error}</p>}
    {loading ? <div className="empty-state">Загружаем ваши сделки…</div> : visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map(card)}</div> : <div className="empty-state"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-soft)] text-2xl">↗</div><h2 className="text-lg font-black text-[var(--ink)]">{view === 'active' ? 'Активных сделок пока нет' : 'История пока пуста'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6">{view === 'active' ? 'Откликнитесь на подходящее объявление или дождитесь отклика на своё.' : 'Здесь появятся завершённые, отменённые и отклонённые сделки.'}</p></div>}
    {!loading && hasMore && <div className="mt-6 text-center"><button onClick={() => void load(true)} className="button-secondary">Показать ещё</button></div>}
    {reviewing?.review_target && <ReviewModal
      open
      responseId={reviewing.id}
      targetUserId={reviewing.review_target.id}
      subjectName={reviewing.review_target.display_name || reviewing.review_target.username}
      subjectRole={reviewing.review_type || 'customer'}
      onClose={() => setReviewing(null)}
      onSuccess={() => void load()}
    />}
    {noteAction && <DealActionModal
      open
      title={noteAction.type === 'disputed' ? 'Открыть спор?' : 'Вернуть работу на доработку'}
      description={noteAction.type === 'disputed' ? 'Опишите ситуацию для модератора. До решения спор нельзя будет изменить.' : 'Конкретно укажите, что исполнитель должен исправить.'}
      placeholder={noteAction.type === 'disputed' ? 'Что произошло и какого решения вы ожидаете?' : 'Что необходимо изменить или доделать?'}
      confirmLabel={noteAction.type === 'disputed' ? 'Открыть спор' : 'Отправить на доработку'}
      danger={noteAction.type === 'disputed'}
      onClose={() => setNoteAction(null)}
      onSubmit={note => changeStatus(noteAction.item.id, noteAction.type, note)}
    />}
  </div>;
};
