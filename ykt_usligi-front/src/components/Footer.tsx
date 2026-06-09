export const Footer = () => {
  return (
    <footer className="bg-slate-800 text-slate-400 py-6">
      <div className="container mx-auto px-4">
        <p>&copy; {new Date().getFullYear()} YKT Услуги. Все права защищены.</p>
      </div>
    </footer>
  );
};