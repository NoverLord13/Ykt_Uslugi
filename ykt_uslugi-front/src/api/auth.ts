import { apiRequest } from "./client";
import { clearUserCache } from "./cache";

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
  token_type: "bearer";
  user: UserRead;
}

export interface VerificationTokenData {
  verification_token: string;
}

export function sendRegisterCode(phone: string) {
  return apiRequest<null>("/auth/register/send-code", {
    method: "POST",
    data: { phone },
  });
}

export function verifyRegisterCode(phone: string, code: string) {
  return apiRequest<VerificationTokenData>("/auth/register/verify-code", {
    method: "POST",
    data: { phone, code },
  });
}

export function completeRegistration(
  verificationToken: string,
  username: string,
  password: string,
  acceptTerms: boolean,
) {
  return apiRequest<TokenData>("/auth/register/complete", {
    method: "POST",
    data: {
      verification_token: verificationToken,
      username,
      password,
      accept_terms: acceptTerms,
    },
  });
}

export function login(login: string, password: string) {
  return apiRequest<TokenData>("/auth/login", {
    method: "POST",
    data: { login, password },
  });
}

export function sendLoginCode(phone: string) {
  return apiRequest<null>("/auth/login/phone/send-code", {
    method: "POST",
    data: { phone },
  });
}

export function verifyLoginCode(phone: string, code: string) {
  return apiRequest<TokenData>("/auth/login/phone/verify-code", {
    method: "POST",
    data: { phone, code },
  });
}

export function saveToken(token: string) {
  clearUserCache();
  localStorage.setItem("access_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}
