import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import {
  ApiError,
} from "../api/client";
import {
  completeRegistration,
  saveToken,
  sendRegisterCode,
  verifyRegisterCode,
} from "../api/auth";

type Step = "phone" | "code" | "credentials";

export const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setStep("credentials");
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
      const response = await completeRegistration(verificationToken, username, password);
      if (!response.data?.access_token) {
        throw new Error("Токен не получен");
      }
      saveToken(response.data.access_token);
      navigate("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось завершить регистрацию");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-slate-800">
        <h1 className="text-2xl font-bold text-black mb-2">Регистрация</h1>
        <p className="text-slate-500 mb-6">
          {step === "phone" && "Шаг 1 из 3 — введите номер телефона"}
          {step === "code" && "Шаг 2 из 3 — введите код из SMS"}
          {step === "credentials" && "Шаг 3 из 3 — придумайте логин и пароль"}
        </p>

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

        {step === "credentials" && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-black"
            />
            <input
              type="password"
              placeholder="Пароль (минимум 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-black"
            />
            <Button
              size="middle"
              color="primary"
              title={loading ? "Регистрация..." : "Завершить регистрацию"}
              onClick={handleComplete}
            />
          </div>
        )}

        <p className="mt-6 text-sm text-slate-500 text-center">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};
