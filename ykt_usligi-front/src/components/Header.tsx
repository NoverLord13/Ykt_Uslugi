import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getToken } from '../api/auth';



export const Header = () => {

  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());

  useEffect(() => {
    const updateAuth = () => setIsAuthenticated(!!getToken());
    window.addEventListener('auth-change', updateAuth);
    window.addEventListener('storage', updateAuth);
    return () => {
      window.removeEventListener('auth-change', updateAuth);
      window.removeEventListener('storage', updateAuth);
    };
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('access_token');
      window.dispatchEvent(new Event('auth-change'));
      navigate('/'); 
    };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E1E4EA] bg-white/95 backdrop-blur">
        <nav className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6'>
            <Link to="/" className="text-2xl font-black tracking-tight text-[#1A1A1A]">
              Ykt<span className="text-[#2F6FED]">.</span>
            </Link>

            <ul className="flex flex-row items-center gap-4 text-sm font-semibold text-[#1A1A1A]">

                {isAuthenticated?(
                    <>
                    <li>
                        <Link className="hover:text-[#2F6FED]" to="/adadder">Добавить</Link>
                    </li>
                    <li>
                        <Link className="hover:text-[#2F6FED]" to="/my-ads">Мои объявления</Link>
                    </li>
                    <li>
                        <Link className="hover:text-[#2F6FED]" to="/profile">Профиль</Link>
                    </li>
                    <li>
                        <button 
                          onClick={handleLogout}
                          className="text-[#E8352B] hover:opacity-80 transition-colors cursor-pointer"
                        >
                          Выйти
                        </button>
                    </li>
                    </>
                ):(
                  <>
                    <li>
                        <Link className="text-[#2F6FED] hover:opacity-80" to="/login">Войти</Link>
                    </li>
                    <li>
                        <Link className="rounded-xl bg-[#2F6FED] px-4 py-2 text-white hover:bg-[#245DCC]" to="/register">Регистрация</Link>
                    </li>
                  </>
                )}
                
            </ul>
        </nav>
      
    </header>
  );
};
