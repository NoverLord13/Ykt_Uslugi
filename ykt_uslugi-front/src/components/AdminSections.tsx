import { Link } from 'react-router-dom';
import type { Report, Review, ServiceListing, ServiceResponse, UserProfile } from '../api/Api';

const reportReasons: Record<string, string> = {
  spam: 'Спам или реклама', fraud: 'Мошенничество', abuse: 'Оскорбления',
  illegal: 'Запрещённый контент', wrong_info: 'Недостоверная информация', other: 'Другая причина',
};

export type DisputeResolution = { item: ServiceResponse; status: 'completed' | 'cancelled' | 'revision_requested' };

export const DisputesSection = ({ items, onResolve }: { items: ServiceResponse[]; onResolve: (resolution: DisputeResolution) => void }) => <section>
  <h2 className="mb-3 text-xl font-bold">Спорные сделки</h2>
  {items.length ? <div className="grid gap-3">{items.map((item) => <div key={item.id} className="rounded-xl border border-red-100 bg-white p-4">
    <Link to={`/services/${item.service.id}`} className="font-semibold hover:text-[var(--brand)]">{item.service.title}</Link>
    <p className="mt-2 text-sm text-slate-700">{item.status_note || 'Комментарий не указан'}</p>
    <p className="mt-2 text-xs text-slate-500">Заказчик: @{item.service.listing_type === 'request' ? item.service.owner.username : item.respondent.username} · Исполнитель: @{item.service.listing_type === 'request' ? item.respondent.username : item.service.owner.username}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={() => onResolve({ item, status: 'completed' })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Завершить</button>
      <button onClick={() => onResolve({ item, status: 'revision_requested' })} className="rounded-lg border px-3 py-2 text-xs font-semibold">Вернуть на доработку</button>
      <button onClick={() => onResolve({ item, status: 'cancelled' })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">Отменить</button>
    </div>
  </div>)}</div> : <p className="text-sm text-slate-500">Открытых споров нет.</p>}
</section>;

type ReportUpdateStatus = Exclude<Report['status'], 'new'>;

export const ReportsSection = ({ items, onStatusChange }: { items: Report[]; onStatusChange: (id: number, status: ReportUpdateStatus) => Promise<void> }) => <section>
  <h2 className="mb-3 text-xl font-bold">Жалобы</h2>
  <div className="grid gap-3">{items.map((item) => <div key={item.id} className="rounded-xl border bg-white p-4">
    <p className="font-semibold">{item.target_type} #{item.target_id} · {item.status}</p>
    <p className="my-2 text-sm font-semibold text-slate-700">{reportReasons[item.reason] || item.reason}</p>
    {item.comment && <p className="mb-3 whitespace-pre-wrap text-sm text-slate-600">{item.comment}</p>}
    <div className="flex gap-2">{(['reviewed', 'resolved', 'rejected'] as const).map((status) => <button key={status} onClick={() => void onStatusChange(item.id, status)} className="rounded-lg border px-2 py-1 text-xs">{status}</button>)}</div>
  </div>)}</div>
</section>;

export const ReviewsSection = ({ items, onDelete }: { items: Review[]; onDelete: (id: number) => Promise<void> }) => <section>
  <h2 className="mb-3 text-xl font-bold">Отзывы</h2>
  <div className="grid gap-2">{items.map((review) => <div key={review.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3">
    <div><p className="font-semibold">@{review.author.username} → @{review.target_user.username}: {review.rating}/5</p><p className="text-sm text-slate-600">{review.text || 'Без комментария'}</p></div>
    <button onClick={() => void onDelete(review.id)} className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600">Удалить</button>
  </div>)}</div>
</section>;

export const ServicesSection = ({ items, onStatusChange }: { items: ServiceListing[]; onStatusChange: (id: number, status: ServiceListing['status']) => Promise<void> }) => <section>
  <h2 className="mb-3 text-xl font-bold">Объявления</h2>
  <div className="grid gap-2">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3">
    <Link to={`/services/${item.id}`} className="font-semibold hover:text-[#2F6FED]">{item.title}</Link>
    <select value={item.status} onChange={(event) => void onStatusChange(item.id, event.target.value as ServiceListing['status'])} className="rounded-lg border px-2 py-1">{(['active', 'hidden', 'moderation', 'closed'] as const).map((value) => <option key={value}>{value}</option>)}</select>
  </div>)}</div>
</section>;

export const UsersSection = ({ items, onToggleActive }: { items: UserProfile[]; onToggleActive: (user: UserProfile) => Promise<void> }) => <section>
  <h2 className="mb-3 text-xl font-bold">Пользователи</h2>
  <div className="grid gap-2">{items.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3">
    <Link to={`/users/${user.id}`} className="font-semibold">@{user.username}</Link>
    <button onClick={() => void onToggleActive(user)} className="rounded-lg border px-3 py-1 text-sm">{user.is_active ? 'Заблокировать' : 'Разблокировать'}</button>
  </div>)}</div>
</section>;
