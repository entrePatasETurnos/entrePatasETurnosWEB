import "server-only";
import { apiFetch } from "./api";
import type { RegistrationRequest } from "./registration";

/**
 * The account a password registration created: the API's `RegisteredUserResponse`
 * (entrePatasETurnosAPI `identity/registration`). It starts pending e-mail verification and cannot
 * sign in until the address is confirmed.
 */
export type RegisteredUser = {
  id: number;
  email: string;
  name: string;
  status: string;
  role: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _links: Record<string, unknown>;
};

/**
 * `POST /v1/users` as JSON (spec 009). Public endpoint, so no token. The body is rebuilt from the four
 * known fields so nothing else can ever be sent.
 */
export function registerUser({ email, name, cpf, password }: RegistrationRequest): Promise<RegisteredUser> {
  return apiFetch<RegisteredUser>("/v1/users", {
    method: "POST",
    body: { email, name, cpf, password },
  });
}
