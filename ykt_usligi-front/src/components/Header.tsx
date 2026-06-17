import { Link, useNavigate } from 'react-router-dom';
import { getToken } from '../api/auth';



export const Header = () => {

  const navigate = useNavigate();
  const isAuthenticated = !!getToken();
  const handleLogout = () => {
      localStorage.removeItem('access_token');
      navigate('/'); 
      window.location.reload(); 
    };

  return (
    <header className="w-full h-8 flex items-center bg-white text-black py-4 shadow-md">
        <nav className='w-full'>
            <ul className="flex flex-row justify-around items-center w-full font-medium">
                <li>
                    <Link to="/">YKT</Link>
                </li>

                {isAuthenticated?(
                    <>
                    <li>
                        <Link to="/adadder">Добавить</Link>
                    </li>
                    <li>
                        <Link to="/my-ads">Мои объявления</Link>
                    </li>
                    <li>
                        <Link to="/profile">Профиль</Link>
                    </li>
                    <li>
                        <button 
                          onClick={handleLogout}
                          className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          Выйти
                        </button>
                    </li>
                    </>
                ):(
                  <>
                    <li>
                        <Link to="/login">Войти</Link>
                    </li>
                    <li>
                        <Link to="/register">Регистрация</Link>
                    </li>
                  </>
                )}
                
            </ul>
        </nav>
      
    </header>
  );
};
