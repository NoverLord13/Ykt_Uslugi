import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ApiError,
} from "../api/client";
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  saveToken,
  login,
  sendLoginCode,
  verifyLoginCode
} from "../api/auth";
import { getApiErrorMessage } from '../api/Api';

type Step = "phone" | "code";

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [switcher, setSwitcher] = useState(true);
  

  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from || '/';

  const handleSendCode = async () => {
      setError("");
      setLoading(true);
      try {
        await sendLoginCode(phone);
        setStep("code");
      } catch (e) {
        setError(getApiErrorMessage(e, e instanceof ApiError ? e.message : "Не удалось отправить код"));
      } finally {
        setLoading(false);
      }
    };

    const handleVerifyCode = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await verifyLoginCode(phone, code);
      if (!response.data?.access_token) {
        throw new Error("Токен не получен");
      }
      saveToken(response.data.access_token);
      window.dispatchEvent(new Event('auth-change'));
      navigate(destination, { replace: true });
    } catch (e) {
      setError(getApiErrorMessage(e, e instanceof ApiError ? e.message : "Неверный код"));
    } finally {
      setLoading(false);
    }
  };


  const handleLogin = async () => {
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('Пожалуйста, введите логин и пароль');
      return;
    }

    setLoading(true);
    try {
      const data = await login(username.trim(), password);
      if (!data.data?.access_token) {
        throw new Error("Токен не получен");
      }
      
      saveToken(data.data.access_token);
      window.dispatchEvent(new Event('auth-change'));

      navigate(destination, { replace: true });
      
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Неверный логин или пароль'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-10rem)] items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2F6FED]/10 blur-3xl" />
      <div className="relative w-full max-w-md rounded-3xl border border-[#E1E4EA] bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
        
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF4FF] font-black text-[#2F6FED]">Y</div>
        <h2 className="mb-2 text-center text-3xl font-black text-[#1A1A1A]">Добро пожаловать</h2>
        <p className="mb-6 text-center text-sm text-[#8A8F99]">
          Войдите в свой аккаунт
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Выбор входа: по номеру телефона или по логину с паролем */}
        <div className="mb-6 flex items-center justify-between gap-1 rounded-2xl bg-[#F2F3F5] p-1">
            <Button
              color={switcher? "secondary" : "third" } 
              size="middle"
              title="Телефон"
              onClick={() => setSwitcher(true)}
            />
            <Button
              
              color={!switcher? "secondary" : "third" }
              size="middle"
              title="Логин и пароль"
              onClick={()=> setSwitcher(false)}
              />
        </div>
        
        {switcher === false &&(
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Имя пользователя</label>
              <div className="w-full">
                <Input
                  type="text"
                  color="primary"
                  size="large"
                  placeholder="Ваш логин"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Пароль</label>
              <div className="w-full">
                <Input
                  type="password"
                  color="primary"
                  size="large"
                  placeholder="Ваш пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <Button
                color="primary"
                size="large"
                title={loading ? "Вход..." : "Войти"}
                onClick={handleLogin}
              />
            </div>
          </div>
          
        )}
        
        {switcher ===true &&(
            <div className="space-y-4">
                {step === "phone" && (
                  <div className="space-y-4">
                    <input
                      type="tel"
                      placeholder="+7 999 123-45-67"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-[#E1E4EA] rounded-xl px-4 py-3 text-black"
                    />
                    <Button
                      size="middle"
                      color="primary"
                      title={loading ? "Отправка..." : "Получить код"}
                      onClick={handleSendCode}
                    />
                  </div>
                )}

                {step === "code" && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Код из SMS"
                      maxLength={4}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full border border-[#E1E4EA] rounded-xl px-4 py-3 text-black"
                    />
                    <Button
                      size="middle"
                      color="primary"
                      title={loading ? "Проверка..." : "Подтвердить код"}
                      onClick={handleVerifyCode}
                    />

                    <button
                      type="button"
                      onClick={() => setStep("phone")}
                      className="text-sm text-[#2F6FED] hover:underline"
                    >
                      Изменить номер
                    </button>
                  </div>
                )}

            </div>
        )}


        

        <p className="mt-6 text-center text-sm text-[#8A8F99]">
          Ещё нет аккаунта?{' '}
          <Link to="/register" className="font-semibold text-[#2F6FED] transition-colors hover:text-[#245DCC]">
            Зарегистрироваться
          </Link>
        </p>

      </div>
    </div>
  );
};
