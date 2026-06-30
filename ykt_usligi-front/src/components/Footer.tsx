import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-white text-black py-6 border-t border-slate-300 mt-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><p>&copy; {new Date().getFullYear()} YKT Услуги. Все права защищены.</p><div className="flex gap-4 text-sm"><Link to="/terms">Условия</Link><Link to="/privacy">Конфиденциальность</Link></div></div>
      </div>
    </footer>
  );
};
