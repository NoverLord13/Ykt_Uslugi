import { useState } from 'react';
import { api, getApiErrorMessage } from '../api/Api';
import { Modal } from './Modal';

const reasons = [
  ['spam', 'Спам или реклама'], ['fraud', 'Мошенничество'], ['abuse', 'Оскорбления'],
  ['wrong_info', 'Недостоверная информация'], ['illegal', 'Запрещённый контент'], ['other', 'Другая причина'],
] as const;

export const ReportModal = ({ open, targetType, targetId, onClose, onSuccess }: {
  open: boolean; targetType: 'service' | 'user' | 'review'; targetId: number; onClose: () => void; onSuccess?: () => void;
}) => {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!reason) return setError('Выберите причину жалобы');
    if (reason === 'other' && comment.trim().length < 10) return setError('Коротко опишите проблему — минимум 10 символов');
    setSaving(true); setError('');
    try { await api.createReport(targetType, targetId, reason, comment.trim()); onSuccess?.(); onClose(); setReason(''); setComment(''); }
    catch (err) { setError(getApiErrorMessage(err, 'Не удалось отправить жалобу')); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title="Сообщить о проблеме" description="Жалоба конфиденциальна. Модератор проверит её и примет меры.">
    <div className="grid gap-2 sm:grid-cols-2">
      {reasons.map(([value, label]) => <button key={value} type="button" onClick={() => setReason(value)} className={`choice-tile ${reason === value ? 'choice-tile-active' : ''}`}>{label}</button>)}
    </div>
    <label className="field mt-5"><span>Комментарий <small>необязательно</small></span><textarea rows={4} maxLength={1500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Добавьте детали, которые помогут модератору" /></label>
    {error && <p className="form-error">{error}</p>}
    <div className="modal-actions"><button type="button" onClick={onClose} className="button-secondary">Отмена</button><button type="button" disabled={saving} onClick={submit} className="button-danger">{saving ? 'Отправляем…' : 'Отправить жалобу'}</button></div>
  </Modal>;
};

export const ReviewModal = ({ open, responseId, targetUserId, subjectName, subjectRole, onClose, onSuccess }: {
  open: boolean; responseId: number; targetUserId: number; subjectName: string; subjectRole: 'performer' | 'customer'; onClose: () => void; onSuccess: () => void;
}) => {
  const [rating, setRating] = useState(5); const [review, setReview] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true); setError('');
    try { await api.createReview(targetUserId, { response_id: responseId, rating, text: review.trim() || undefined }); onSuccess(); onClose(); }
    catch (err) { setError(getApiErrorMessage(err, 'Не удалось опубликовать отзыв')); }
    finally { setSaving(false); }
  };
  const description = subjectRole === 'performer' ? 'Ваш отзыв сформирует рейтинг исполнителя и поможет другим заказчикам.' : 'Ваш отзыв поможет исполнителям оценить надёжность заказчика.';
  return <Modal open={open} onClose={onClose} title={`Как всё прошло с ${subjectName}?`} description={`${description} Отзыв можно оставить один раз.`}>
    <div className="flex justify-center gap-2" aria-label={`Оценка: ${rating} из 5`}>{[1,2,3,4,5].map((star) => <button key={star} type="button" onClick={() => setRating(star)} className={`star-button ${star <= rating ? 'star-active' : ''}`} aria-label={`${star} из 5`}>★</button>)}</div>
    <label className="field mt-6"><span>Расскажите подробнее <small>необязательно</small></span><textarea rows={5} maxLength={2000} value={review} onChange={(e) => setReview(e.target.value)} placeholder="Что понравилось? Всё ли было сделано в срок?" /></label>
    {error && <p className="form-error">{error}</p>}
    <div className="modal-actions"><button type="button" onClick={onClose} className="button-secondary">Позже</button><button type="button" disabled={saving} onClick={submit} className="button-primary">{saving ? 'Публикуем…' : 'Опубликовать отзыв'}</button></div>
  </Modal>;
};

export const DealActionModal = ({ open, title, description, placeholder, confirmLabel, danger = false, onClose, onSubmit }: {
  open: boolean; title: string; description: string; placeholder: string; confirmLabel: string; danger?: boolean; onClose: () => void; onSubmit: (note: string) => Promise<void>;
}) => {
  const [note, setNote] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (note.trim().length < (danger ? 10 : 3)) return setError(danger ? 'Опишите ситуацию минимум в 10 символах' : 'Уточните, что необходимо исправить');
    setSaving(true); setError('');
    try { await onSubmit(note.trim()); setNote(''); onClose(); }
    catch (err) { setError(getApiErrorMessage(err, 'Не удалось обновить сделку')); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title={title} description={description}>
    <label className="field"><span>Комментарий *</span><textarea rows={5} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder={placeholder}/></label>
    {error && <p className="form-error">{error}</p>}
    <div className="modal-actions"><button type="button" onClick={onClose} className="button-secondary">Отмена</button><button type="button" disabled={saving} onClick={submit} className={danger ? 'button-danger' : 'button-primary'}>{saving ? 'Сохраняем…' : confirmLabel}</button></div>
  </Modal>;
};
