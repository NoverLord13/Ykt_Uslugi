import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fileUrl, formatPrice, getApiErrorMessage, type AdBlock, type Review, type UserProfile } from '../api/Api';
import { getToken } from '../api/auth';

export const Profile = () => {
  const { id } = useParams();
  const isOwnProfile = !id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ads, setAds] = useState<AdBlock[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const targetUserId = id ? Number(id) : null;
  const canEdit = isOwnProfile && !!getToken();

  useEffect(() => {
    if (!isOwnProfile && (!targetUserId || Number.isNaN(targetUserId))) {
      setError('Некорректный профиль');
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setError('');
      setIsLoading(true);
      try {
        const profileData = isOwnProfile ? await api.getMe() : await api.getUserProfile(targetUserId!);
        setProfile(profileData);
        setDisplayName(profileData.display_name || '');
        setBio(profileData.bio || '');
        setLocation(profileData.location || '');
        setTelegramUsername(profileData.telegram_username || '');

        const userId = profileData.id;
        const [adsData, reviewsData] = await Promise.all([
          api.getUserServices(userId),
          api.getUserReviews(userId),
        ]);
        setAds(adsData);
        setReviews(reviewsData);
      } catch (err) {
        console.error(err);
        setError(getApiErrorMessage(err, 'Не удалось загрузить профиль'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, isOwnProfile, targetUserId]);

  const handleSaveProfile = async () => {
    if (!canEdit) return;
    try {
      const updated = await api.updateMe({ display_name: displayName, bio, location, telegram_username: telegramUsername });
      setProfile(updated);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Не удалось сохранить профиль'));
    }
  };

  const handleAvatarUpload = async () => {
    if (!canEdit || !avatarFile) return;
    try {
      const updated = await api.uploadAvatar(avatarFile);
      setProfile(updated);
      setAvatarFile(null);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Не удалось загрузить аватар'));
    }
  };

  const handleReport = async (targetType: 'user' | 'review', targetId: number) => {
    const reason = window.prompt('Опишите нарушение (минимум 10 символов)');
    if (!reason) return;
    try { await api.createReport(targetType, targetId, reason); window.alert('Жалоба отправлена'); }
    catch (err) { setError(getApiErrorMessage(err, 'Не удалось отправить жалобу')); }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-5xl p-6 text-center text-[#8A8F99]">Загрузка профиля...</div>;
  }

  if (error || !profile) {
    return <div className="mx-auto max-w-5xl p-6 text-center text-red-600">{error || 'Профиль не найден'}</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-8">
      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-indigo-100 text-center text-3xl font-bold text-[#2F6FED]">
            {profile.avatar_url ? (
              <img src={fileUrl(profile.avatar_url)} alt={profile.username} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">{profile.username.slice(0, 2).toUpperCase()}</div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-3xl font-bold text-[#1A1A1A]">{profile.display_name || profile.username}</h1>
              <p className="text-sm text-[#8A8F99]">@{profile.username}</p>
            </div>

            {profile.bio && <p className="max-w-3xl text-slate-700">{profile.bio}</p>}
            {profile.location && <p className="text-sm text-[#8A8F99]">Локация: {profile.location}</p>}
            {profile.telegram_username && <a href={`https://t.me/${profile.telegram_username}`} target="_blank" rel="noreferrer" className="text-sm text-[#2F6FED]">Telegram: @{profile.telegram_username}</a>}

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-[#F2F3F5] px-3 py-1 text-slate-700">Объявлений: {ads.length}</span>
              <span className="rounded-full bg-[#F2F3F5] px-3 py-1 text-slate-700">Отзывов: {profile.reviews_count ?? reviews.length}</span>
              <span className="rounded-full bg-[#F2F3F5] px-3 py-1 text-slate-700">
                Рейтинг: {profile.rating_avg ? profile.rating_avg.toFixed(1) : 'нет'}
              </span>
            </div>
            {!isOwnProfile && getToken() && targetUserId && <button type="button" onClick={() => handleReport('user', targetUserId)} className="text-xs text-red-600 hover:underline">Пожаловаться на пользователя</button>}
          </div>
        </div>

        {canEdit && (
          <div className="mt-6 grid gap-4 rounded-2xl border bg-[#F2F3F5] p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Имя</span>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Telegram username</span>
                <input value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ''))} placeholder="username" className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Локация</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">О себе</span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5} className="w-full rounded-xl border border-[#E1E4EA] px-3 py-2 outline-none focus:border-[#2F6FED]" />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="text-sm" />
              <button type="button" onClick={handleAvatarUpload} className="rounded-xl bg-[#2F6FED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245DCC]">
                Загрузить аватар
              </button>
              <button type="button" onClick={handleSaveProfile} className="rounded-xl border border-[#E1E4EA] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                Сохранить профиль
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-bold text-[#1A1A1A]">Объявления пользователя</h2>
          <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-sm text-[#8A8F99]">{ads.length}</span>
        </div>

        {ads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-[#8A8F99]">У пользователя пока нет активных объявлений.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ads.map((item) => (
              <Link key={item.id} to={`/services/${item.id}`} className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-xl bg-[#F2F3F5] flex-shrink-0">
                    {(item.image_url || item.images[0]?.url) ? (
                      <img src={fileUrl(item.images[0]?.url || item.image_url)} alt={item.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-[#1A1A1A] group-hover:text-[#2F6FED]">{item.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#2F6FED]">{formatPrice(item)}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-[#8A8F99]">{item.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-bold text-[#1A1A1A]">Отзывы</h2>
          <span className="rounded-full bg-[#F2F3F5] px-2.5 py-1 text-sm text-[#8A8F99]">{reviews.length}</span>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-[#8A8F99]">Пока нет отзывов.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">{review.author.display_name || review.author.username}</p>
                    <p className="text-xs text-[#8A8F99]">@{review.author.username}</p>
                  </div>
                  <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-sm font-semibold text-[#2F6FED]">{review.rating}/5</span>
                </div>
                {review.text && <p className="mt-3 text-sm text-slate-700">{review.text}</p>}
                {getToken() && <button type="button" onClick={() => handleReport('review', review.id)} className="mt-3 text-xs text-red-600 hover:underline">Пожаловаться</button>}
              </div>
            ))}
          </div>
        )}

      </section>
    </div>
  );
};
