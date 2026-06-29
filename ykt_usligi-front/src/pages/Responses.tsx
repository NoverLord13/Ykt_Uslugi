import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getApiErrorMessage, type ServiceResponse } from '../api/Api';

const labels: Record<ServiceResponse['status'], string> = {
  new: 'Новый', accepted: 'Принят', completed: 'Завершён', cancelled: 'Отменён',
};

export const Responses = () => {
  const [sent, setSent] = useState<ServiceResponse[]>([]);
  const [received, setReceived] = useState<ServiceResponse[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sentData, receivedData] = await Promise.all([api.getSentResponses(), api.getReceivedResponses()]);
      setSent(sentData);
      setReceived(receivedData);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не удалось загрузить отклики'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const changeStatus = async (id: number, status: 'accepted' | 'completed' | 'cancelled') => {
    try {
      await api.updateResponse(id, status);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не удалось изменить статус'));
    }
  };

  const leaveReview = async (item: ServiceResponse, targetUserId: number) => {
    const ratingText = window.prompt('Оценка от 1 до 5', '5');
    if (!ratingText) return;
    const rating = Number(ratingText);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError('Оценка должна быть от 1 до 5');
      return;
    }
    const text = window.prompt('Комментарий к отзыву (необязательно)', '') || undefined;
    try {
      await api.createReview(targetUserId, { response_id: item.id, rating, text });
      setError('');
      window.alert('Отзыв опубликован');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не удалось оставить отзыв'));
    }
  };

  const card = (item: ServiceResponse, incoming: boolean) => (
    <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/services/${item.service.id}`} className="font-bold text-[#1A1A1A] hover:text-[#2F6FED]">{item.service.title}</Link>
          <p className="mt-1 text-sm text-[#8A8F99]">
            {incoming ? `От: ${item.respondent.display_name || item.respondent.username}` : `Автор: ${item.service.owner.display_name || item.service.owner.username}`}
          </p>
        </div>
        <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-semibold text-[#2F6FED]">{labels[item.status]}</span>
      </div>
      {item.message && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{item.message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {incoming && item.status === 'new' && <button onClick={() => changeStatus(item.id, 'accepted')} className="rounded-xl bg-[#2F6FED] px-3 py-2 text-sm font-semibold text-white">Принять</button>}
        {incoming && item.status === 'accepted' && <button onClick={() => changeStatus(item.id, 'completed')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Завершить</button>}
        {item.status !== 'completed' && item.status !== 'cancelled' && <button onClick={() => changeStatus(item.id, 'cancelled')} className="rounded-xl border px-3 py-2 text-sm font-semibold text-slate-700">Отменить</button>}
        {item.status === 'completed' && (
          <button onClick={() => leaveReview(item, incoming ? item.respondent.id : item.service.owner.id)} className="rounded-xl border border-[#2F6FED] px-3 py-2 text-sm font-semibold text-[#2F6FED]">Оставить отзыв</button>
        )}
      </div>
    </article>
  );

  if (loading) return <div className="mx-auto max-w-6xl p-6 text-center text-[#8A8F99]">Загрузка откликов...</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <h1 className="text-3xl font-bold text-[#1A1A1A]">Отклики и сделки</h1>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <section><h2 className="mb-3 text-xl font-bold">Входящие</h2><div className="grid gap-3">{received.length ? received.map((item) => card(item, true)) : <p className="text-[#8A8F99]">Входящих откликов пока нет.</p>}</div></section>
      <section><h2 className="mb-3 text-xl font-bold">Отправленные</h2><div className="grid gap-3">{sent.length ? sent.map((item) => card(item, false)) : <p className="text-[#8A8F99]">Вы пока ни на что не откликались.</p>}</div></section>
    </div>
  );
};
