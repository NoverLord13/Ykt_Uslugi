import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/Api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const Register = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const code = '1234'; // Временный код для регистрации (можно убрать, если не нужен)
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleRegister = async () => {
    setError('');
    
    if (!phone.trim() || !password.trim()) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (password !== repeatPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (code !== '1234') {
      setError('Неверный код регистрации');
      return;
    }

    try {
      await api.register(phone.trim(), password, code);
      
      alert('Регистрация успешна! Теперь вы можете войти.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ошибка при регистрации');
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-slate-200">
        
        <h2 className="text-3xl font-bold text-center text-white mb-2">Создать аккаунт</h2>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Номер телефона */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Номер телефона:</label>
            <div className="w-full">
              <Input
                type="text"
                color="primary"
                size="large"
                placeholder="Номер телефона"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Пароль */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Пароль:</label>
            <div className="w-full">
              <Input
                type="password"
                color="primary"
                size="large"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Повтор Пароля */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Повторите пароль:</label>
            <div className="w-full">
              <Input
                type="password"
                color="primary"
                size="large"
                placeholder="Пароль еще раз"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Код регистрации (временный) */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Код регистрации:</label>
            <div className="w-full">
              <Input
                type="text"
                color="primary"
                size="large"
                placeholder="Код регистрации"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Кнопка отправки */}
        <div className="mt-8 flex justify-center">
          <Button
            color="primary"
            size="large"
            title="Зарегистрироваться"
            onClick={handleRegister}
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Войти
          </Link>
        </p>

      </div>
    </div>
  );
};