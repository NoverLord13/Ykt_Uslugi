import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getToken } from '../api/auth';
import { api } from '../api/Api';

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
      else setIsAdmin(false);
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
    localStorage.removeItem('access_token');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  const linkClass = (path: string) => `rounded-lg px-3 py-2 transition-colors ${location.pathname === path ? 'bg-[#EEF4FF] text-[#2F6FED]' : 'text-slate-700 hover:bg-[#F2F3F5] hover:text-[#2F6FED]'}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E1E4EA] bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-[#1A1A1A]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F6FED] text-sm text-white shadow-md shadow-blue-200">Y</span>
          <span>Ykt<span className="text-[#2F6FED]">.</span>Услуги</span>
        </Link>

        <button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-label="Открыть меню" aria-expanded={isMenuOpen} className="rounded-xl border border-[#E1E4EA] p-2 text-slate-700 md:hidden">
          <span className="block h-0.5 w-5 bg-current" /><span className="my-1 block h-0.5 w-5 bg-current" /><span className="block h-0.5 w-5 bg-current" />
        </button>

        <div className={`${isMenuOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-16 flex-col gap-1 border-b border-[#E1E4EA] bg-white p-4 shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          {isAuthenticated ? <>
            <Link className={linkClass('/adadder')} to="/adadder">Добавить</Link>
            <Link className={linkClass('/my-ads')} to="/my-ads">Мои объявления</Link>
            <Link className={linkClass('/responses')} to="/responses">Отклики</Link>
            <Link className={linkClass('/profile')} to="/profile">Профиль</Link>
            {isAdmin && <Link className={linkClass('/admin')} to="/admin">Админ</Link>}
            <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-[#E8352B] transition-colors hover:bg-red-50">Выйти</button>
          </> : <>
            <Link className="rounded-lg px-3 py-2 font-semibold text-[#2F6FED] hover:bg-[#EEF4FF]" to="/login">Войти</Link>
            <Link className="rounded-xl bg-[#2F6FED] px-4 py-2.5 text-center font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-[#245DCC]" to="/register">Регистрация</Link>
          </>}
        </div>
      </nav>
    </header>
  );
};
