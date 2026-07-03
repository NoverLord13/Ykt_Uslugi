import { useEffect, useState } from 'react';
import { api, getApiErrorMessage, type ServiceListing, type Report, type Review, type ServiceResponse, type UserProfile } from '../api/Api';
import { DisputesSection, ReportsSection, ReviewsSection, ServicesSection, UsersSection, type DisputeResolution } from '../components/AdminSections';
import { DealActionModal } from '../components/FeedbackModals';

export const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<ServiceResponse[]>([]);
  const [resolution, setResolution] = useState<DisputeResolution | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [userData, serviceData, reportData, reviewData, disputeData] = await Promise.all([api.adminGetUsers(), api.adminGetServices(), api.adminGetReports(), api.adminGetReviews(), api.adminGetDisputedResponses()]);
      setUsers(userData); setServices(serviceData); setReports(reportData); setReviews(reviewData); setDisputes(disputeData);
    } catch (err) { setError(getApiErrorMessage(err, 'Нет доступа к панели администратора')); }
  };
  const mutate = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); await load(); }
    catch (err) { setError(getApiErrorMessage(err, 'Не удалось выполнить действие')); }
  };
  useEffect(() => { void load(); }, []);

  return <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
    <h1 className="text-3xl font-bold">Администрирование</h1>
    {error && <div className="rounded-xl bg-red-50 p-3 text-red-600">{error}</div>}
    <DisputesSection items={disputes} onResolve={setResolution} />
    <ReportsSection items={reports} onStatusChange={(id, status) => mutate(() => api.adminUpdateReport(id, status))} />
    <ReviewsSection items={reviews} onDelete={(id) => mutate(() => api.adminDeleteReview(id))} />
    <ServicesSection items={services} onStatusChange={(id, status) => mutate(() => api.adminUpdateService(id, status))} />
    <UsersSection items={users} onToggleActive={(user) => mutate(() => api.adminUpdateUser(user.id, { is_active: !user.is_active }))} />
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
