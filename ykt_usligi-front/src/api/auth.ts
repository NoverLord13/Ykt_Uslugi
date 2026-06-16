import { apiRequest } from "./client";

export interface UserRead {
  id: number;
  username: string;
  phone_number: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TokenData {
  access_token: string;
  token_type: string;
  user: UserRead;
}

export interface VerificationTokenData {
  verification_token: string;
}

export function sendRegisterCode(phone: string) {
  return apiRequest<null>("/auth/register/send-code", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function verifyRegisterCode(phone: string, code: string) {
  return apiRequest<VerificationTokenData>("/auth/register/verify-code", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export function completeRegistration(
  verificationToken: string,
  username: string,
  password: string,
) {
  return apiRequest<TokenData>("/auth/register/complete", {
    method: "POST",
    body: JSON.stringify({
      verification_token: verificationToken,
      username,
      password,
    }),
  });
}

export function login(login: string, password: string) {
  return apiRequest<TokenData>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export function sendLoginCode(phone: string) {
  return apiRequest<null>("/auth/login/phone/send-code", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function verifyLoginCode(phone: string, code: string) {
  return apiRequest<TokenData>("/auth/login/phone/verify-code", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export function saveToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}
