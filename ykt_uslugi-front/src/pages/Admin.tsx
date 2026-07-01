import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage, type AdBlock, type Report, type Review, type ServiceResponse, type UserProfile } from '../api/Api';
import { DealActionModal } from '../components/FeedbackModals';

const reportReasons: Record<string, string> = { spam: 'Спам или реклама', fraud: 'Мошенничество', abuse: 'Оскорбления', illegal: 'Запрещённый контент', wrong_info: 'Недостоверная информация', other: 'Другая причина' };

export const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<AdBlock[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<ServiceResponse[]>([]);
  const [resolution, setResolution] = useState<{ item: ServiceResponse; status: 'completed' | 'cancelled' | 'revision_requested' } | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [userData, serviceData, reportData, reviewData, disputeData] = await Promise.all([api.adminGetUsers(), api.adminGetServices(), api.adminGetReports(), api.adminGetReviews(), api.adminGetDisputedResponses()]);
      setUsers(userData); setServices(serviceData); setReports(reportData); setReviews(reviewData); setDisputes(disputeData);
    } catch (err) { setError(getApiErrorMessage(err, 'Нет доступа к панели администратора')); }
  };
  useEffect(() => { void load(); }, []);

  return <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
    <h1 className="text-3xl font-bold">Администрирование</h1>
    {error && <div className="rounded-xl bg-red-50 p-3 text-red-600">{error}</div>}
    <section><h2 className="mb-3 text-xl font-bold">Спорные сделки</h2>{disputes.length ? <div className="grid gap-3">{disputes.map(item => <div key={item.id} className="rounded-xl border border-red-100 bg-white p-4"><Link to={`/services/${item.service.id}`} className="font-semibold hover:text-[var(--brand)]">{item.service.title}</Link><p className="mt-2 text-sm text-slate-700">{item.status_note || 'Комментарий не указан'}</p><p className="mt-2 text-xs text-slate-500">Заказчик: @{item.service.listing_type === 'request' ? item.service.owner.username : item.respondent.username} · Исполнитель: @{item.service.listing_type === 'request' ? item.respondent.username : item.service.owner.username}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setResolution({ item, status: 'completed' })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Завершить</button><button onClick={() => setResolution({ item, status: 'revision_requested' })} className="rounded-lg border px-3 py-2 text-xs font-semibold">Вернуть на доработку</button><button onClick={() => setResolution({ item, status: 'cancelled' })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">Отменить</button></div></div>)}</div> : <p className="text-sm text-slate-500">Открытых споров нет.</p>}</section>
    <section><h2 className="mb-3 text-xl font-bold">Жалобы</h2><div className="grid gap-3">{reports.map((item) => <div key={item.id} className="rounded-xl border bg-white p-4">
      <p className="font-semibold">{item.target_type} #{item.target_id} · {item.status}</p><p className="my-2 text-sm font-semibold text-slate-700">{reportReasons[item.reason] || item.reason}</p>{item.comment && <p className="mb-3 whitespace-pre-wrap text-sm text-slate-600">{item.comment}</p>}
      <div className="flex gap-2">{(['reviewed', 'resolved', 'rejected'] as const).map((status) => <button key={status} onClick={async () => { await api.adminUpdateReport(item.id, status); await load(); }} className="rounded-lg border px-2 py-1 text-xs">{status}</button>)}</div>
    </div>)}</div></section>
    <section><h2 className="mb-3 text-xl font-bold">Отзывы</h2><div className="grid gap-2">{reviews.map((review) => <div key={review.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"><div><p className="font-semibold">@{review.author.username} → @{review.target_user.username}: {review.rating}/5</p><p className="text-sm text-slate-600">{review.text || 'Без комментария'}</p></div><button onClick={async () => { await api.adminDeleteReview(review.id); await load(); }} className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600">Удалить</button></div>)}</div></section>
    <section><h2 className="mb-3 text-xl font-bold">Объявления</h2><div className="grid gap-2">{services.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"><Link to={`/services/${item.id}`} className="font-semibold hover:text-[#2F6FED]">{item.title}</Link><select value={item.status} onChange={async (e) => { await api.adminUpdateService(item.id, e.target.value as AdBlock['status']); await load(); }} className="rounded-lg border px-2 py-1">{['active','hidden','moderation','closed'].map((value) => <option key={value}>{value}</option>)}</select></div>)}</div></section>
    <section><h2 className="mb-3 text-xl font-bold">Пользователи</h2><div className="grid gap-2">{users.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3"><Link to={`/users/${user.id}`} className="font-semibold">@{user.username}</Link><button onClick={async () => { await api.adminUpdateUser(user.id, { is_active: !user.is_active }); await load(); }} className="rounded-lg border px-3 py-1 text-sm">{user.is_active ? 'Заблокировать' : 'Разблокировать'}</button></div>)}</div></section>
    {resolution && <DealActionModal
      open
      title="Решение по спору"
      description="Решение сразу изменит статус сделки и будет показано обоим участникам."
      placeholder="Объясните принятое решение"
      confirmLabel="Применить решение"
      danger={resolution.status === 'cancelled'}
      onClose={() => setResolution(null)}
      onSubmit={async note => { await api.adminResolveResponse(resolution.item.id, resolution.status, note); await load(); }}
    />}
  </div>;
};
