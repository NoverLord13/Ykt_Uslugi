import { Link, useNavigate } from 'react-router-dom';

export const Header = () => {
  return (
    <header className="w-full h-8 flex items-center bg-white text-black py-4 shadow-md">
        <nav className='w-full'>
            <ul className="flex flex-row justify-around items-center w-full font-medium">
                <li>
                    <Link to="/">YKT</Link>
                </li>
                <li>
                    <Link to="/login">Войти</Link>
                </li>
                <li>
                    <Link to="/register">Регистрация</Link>
                </li>
            </ul>
        </nav>
      {/*<div className="container mx-auto px-4">
        <h1 className="text-5xl font-bold">YKT</h1>
      </div>*/}
    </header>
  );
};