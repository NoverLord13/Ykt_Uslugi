import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/Api';
import {
  ApiError,
} from "../api/client";
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import {
  completeRegistration,
  saveToken,
  sendRegisterCode,
  verifyRegisterCode,
  login
} from "../api/auth";

type Step = "phone" | "code";

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [switcher, setSwitcher] = useState(true);
  

  const navigate = useNavigate();

  const handleSendCode = async () => {
      setError("");
      setLoading(true);
      try {
        await sendRegisterCode(phone);
        setStep("code");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Не удалось отправить код");
      } finally {
        setLoading(false);
      }
    };

    const handleVerifyCode = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await verifyRegisterCode(phone, code);
      if (!response.data?.verification_token) {
        throw new Error("Токен не получен");
      }
      setVerificationToken(response.data.verification_token);
      handleComplete;
      navigate("/");
      window.location.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Неверный код");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await login(username, password);
      if (!response.data?.access_token) {
        throw new Error("Токен не получен");
      }
      saveToken(response.data.access_token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось завершить авторизацию");
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

    try {
      const data = await login(username.trim(), password);
      
      saveToken(data.data.access_token);

      navigate('/');
      window.location.reload(); 
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Неверный логин или пароль');
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-800 rounded-2xl p-8 shadow-2xl text-slate-200">
        
        <h2 className="text-3xl font-bold text-center text-white mb-2">Авторизация</h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          Войдите в свой аккаунт
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center mb-4">
            {error}
          </div>
        )}

        {/* Выбор входа: по номеру телефона или по логину с паролем */}
        <div className="flex justify-between gap-1 items-center mb-6 bg-gray-300 rounded-2xl p-1">
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
              <label className="block text-sm font-medium text-slate-400 mb-1">Имя пользователя:</label>
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
              <label className="block text-sm font-medium text-slate-400 mb-1">Пароль:</label>
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
                title="Войти"
                onClick={handleLogin}
              />
            </div>
          </div>
          
        )}
        
        {switcher ===true &&(
            <div className="space-y-4">
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
                )}

                {step === "phone" && (
                  <div className="space-y-4">
                    <input
                      type="tel"
                      placeholder="+7 999 123-45-67"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-black"
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
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-black"
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
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Изменить номер
                    </button>
                  </div>
                )}

            </div>
        )}


        

        <p className="mt-6 text-center text-sm text-slate-400">
          Ещё нет аккаунта?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Зарегистрироваться
          </Link>
        </p>

      </div>
    </div>
  );
};