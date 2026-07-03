import { useEffect, useState } from 'react';
import { api, getApiErrorMessage, type ServiceSummary, type Report, type Review, type ServiceResponse, type UserProfile } from '../api/Api';
import { DisputesSection, ReportsSection, ReviewsSection, ServicesSection, UsersSection, type DisputeResolution } from '../components/AdminSections';
import { DealActionModal } from '../components/FeedbackModals';

type AdminSection = 'disputes' | 'reports' | 'reviews' | 'services' | 'users';
const PAGE_SIZE = 50;

export const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<ServiceResponse[]>([]);
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<AdminSection>('disputes');
  const [hasMore, setHasMore] = useState(true);

  const load = async (append = false) => {
    try {
      const offset = append ? ({ users: users.length, services: services.length, reports: reports.length, reviews: reviews.length, disputes: disputes.length })[section] : 0;
      if (section === 'users') { const data = await api.adminGetUsers(offset, PAGE_SIZE); setUsers(items => append ? [...items, ...data] : data); setHasMore(data.length === PAGE_SIZE); }
      if (section === 'services') { const data = await api.adminGetServices(offset, PAGE_SIZE); setServices(items => append ? [...items, ...data] : data); setHasMore(data.length === PAGE_SIZE); }
      if (section === 'reports') { const data = await api.adminGetReports(offset, PAGE_SIZE); setReports(items => append ? [...items, ...data] : data); setHasMore(data.length === PAGE_SIZE); }
      if (section === 'reviews') { const data = await api.adminGetReviews(offset, PAGE_SIZE); setReviews(items => append ? [...items, ...data] : data); setHasMore(data.length === PAGE_SIZE); }
      if (section === 'disputes') { const data = await api.adminGetDisputedResponses(offset, PAGE_SIZE); setDisputes(items => append ? [...items, ...data] : data); setHasMore(data.length === PAGE_SIZE); }
    } catch (err) { setError(getApiErrorMessage(err, 'Нет доступа к панели администратора')); }
  };
  const mutate = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); await load(); }
    catch (err) { setError(getApiErrorMessage(err, 'Не удалось выполнить действие')); }
  };
  useEffect(() => {
    let cancelled = false;
    const initialLoad = async () => {
      try {
        if (section === 'users') { const data = await api.adminGetUsers(0, PAGE_SIZE); if (!cancelled) { setUsers(data); setHasMore(data.length === PAGE_SIZE); } }
        if (section === 'services') { const data = await api.adminGetServices(0, PAGE_SIZE); if (!cancelled) { setServices(data); setHasMore(data.length === PAGE_SIZE); } }
        if (section === 'reports') { const data = await api.adminGetReports(0, PAGE_SIZE); if (!cancelled) { setReports(data); setHasMore(data.length === PAGE_SIZE); } }
        if (section === 'reviews') { const data = await api.adminGetReviews(0, PAGE_SIZE); if (!cancelled) { setReviews(data); setHasMore(data.length === PAGE_SIZE); } }
        if (section === 'disputes') { const data = await api.adminGetDisputedResponses(0, PAGE_SIZE); if (!cancelled) { setDisputes(data); setHasMore(data.length === PAGE_SIZE); } }
      } catch (err) { if (!cancelled) setError(getApiErrorMessage(err, 'Нет доступа к панели администратора')); }
    };
    void initialLoad();
    return () => { cancelled = true; };
  }, [section]);

  return <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
    <h1 className="text-3xl font-bold">Администрирование</h1>
    {error && <div className="rounded-xl bg-red-50 p-3 text-red-600">{error}</div>}
    <nav className="flex flex-wrap gap-2">{(['disputes', 'reports', 'reviews', 'services', 'users'] as const).map((item) => <button key={item} onClick={() => setSection(item)} className={section === item ? 'button-primary' : 'button-secondary'}>{item}</button>)}</nav>
    {section === 'disputes' && <DisputesSection items={disputes} onResolve={setResolution} />}
    {section === 'reports' && <ReportsSection items={reports} onStatusChange={(id, status) => mutate(() => api.adminUpdateReport(id, status))} />}
    {section === 'reviews' && <ReviewsSection items={reviews} onDelete={(id) => mutate(() => api.adminDeleteReview(id))} />}
    {section === 'services' && <ServicesSection items={services} onStatusChange={(id, status) => mutate(() => api.adminUpdateService(id, status))} />}
    {section === 'users' && <UsersSection items={users} onToggleActive={(user) => mutate(() => api.adminUpdateUser(user.id, { is_active: !user.is_active }))} />}
    {hasMore && <div className="text-center"><button onClick={() => void load(true)} className="button-secondary">Показать ещё</button></div>}
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
