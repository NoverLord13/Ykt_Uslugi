export const Footer = () => {
  return (
    <footer className="bg-white text-black py-6 border-t border-slate-300 mt-10">
      <div className="container mx-auto px-4">
        <p>&copy; {new Date().getFullYear()} YKT Услуги. Все права защищены.</p>
      </div>
    </footer>
  );
};