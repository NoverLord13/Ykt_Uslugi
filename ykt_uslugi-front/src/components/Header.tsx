import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getToken } from '../api/auth';
import { api } from '../api/Api';
import { clearUserCache } from '../api/cache';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const updateAuth = () => {
      const authenticated = !!getToken();
      setIsAuthenticated(authenticated);
      if (authenticated) api.getMe().then((user) => setIsAdmin(!!user.is_admin)).catch(() => setIsAdmin(false));
      else { clearUserCache(); setIsAdmin(false); }
    };
    updateAuth();
    window.addEventListener('auth-change', updateAuth);
    window.addEventListener('storage', updateAuth);
    return () => {
      window.removeEventListener('auth-change', updateAuth);
      window.removeEventListener('storage', updateAuth);
    };
  }, []);

  useEffect(() => { setIsMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    clearUserCache();
    localStorage.removeItem('access_token');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  const linkClass = (path: string) => `rounded-xl px-3 py-2 text-sm font-bold transition-colors ${location.pathname === path ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[var(--muted)] hover:bg-[#f7f3fa] hover:text-[var(--ink)]'}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--line)] bg-white/85 backdrop-blur-xl">
      <nav className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 text-xl font-black tracking-tight text-[var(--ink)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)] text-sm text-white shadow-md shadow-orange-200">Y</span>
          <span>Ykt<span className="text-[var(--accent)]">.</span>Услуги</span>
        </Link>

        <button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-label="Открыть меню" aria-expanded={isMenuOpen} className="rounded-xl border border-[#E1E4EA] p-2 text-slate-700 md:hidden">
          <span className="block h-0.5 w-5 bg-current" /><span className="my-1 block h-0.5 w-5 bg-current" /><span className="block h-0.5 w-5 bg-current" />
        </button>

        <div className={`${isMenuOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-16 flex-col gap-1 border-b border-[#E1E4EA] bg-white p-4 shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          {isAuthenticated ? <>
            <Link className={linkClass('/my-ads')} to="/my-ads">Мои объявления</Link>
            <Link className={linkClass('/responses')} to="/responses">Сделки</Link>
            <Link className={linkClass('/profile')} to="/profile">Профиль</Link>
            {isAdmin && <Link className={linkClass('/admin')} to="/admin">Админ</Link>}
            <Link className="button-primary md:ml-2" to="/adadder">＋ Добавить</Link>
            <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-[var(--danger)] transition-colors hover:bg-red-50">Выйти</button>
          </> : <>
            <Link className="rounded-lg px-3 py-2 font-bold text-[var(--brand)] hover:bg-[var(--brand-soft)]" to="/login">Войти</Link>
            <Link className="button-primary" to="/register">Регистрация</Link>
          </>}
        </div>
      </nav>
    </header>
  );
};
