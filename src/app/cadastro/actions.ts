"use server";

import { ApiError } from "@/lib/api";
import {
  readRegistration,
  validateRegistration,
  type FieldErrors,
  type RegistrationField,
  type RegistrationState,
  type RegistrationValues,
} from "@/lib/registration";
import { registerUser } from "@/lib/users";

/**
 * Registration with e-mail and password (spec 009): sends `POST /v1/users` to the API.
 *
 * The password confirmation is deliberately absent from the `FormData`: its input has no `name`, so
 * the browser never sends it, not even to this server (research R2). The comparison happens in the
 * form before submitting.
 *
 * Never logs or returns the password. Failure states carry only e-mail, name and CPF, so the form can
 * keep them for the retry while both password fields are cleared.
 */

const GENERAL = "Não foi possível criar a sua conta agora. Tente novamente em instantes.";
const FIELDS: RegistrationField[] = ["email", "name", "cpf", "password"];

export async function registerAction(_prev: RegistrationState, formData: FormData): Promise<RegistrationState> {
  const input = readRegistration(formData);
  const values: RegistrationValues = { email: input.email, name: input.name, cpf: input.cpf };

  const fieldErrors = validateRegistration(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", values, fieldErrors };
  }

  try {
    const user = await registerUser(input);
    if (!user || typeof user !== "object") {
      throw new Error("registration answer is not an account");
    }
    return { status: "created", email: typeof user.email === "string" ? user.email : input.email };
  } catch (error) {
    return failureState(error, values);
  }
}

/** One API answer → what the form shows (research R5). */
function failureState(error: unknown, values: RegistrationValues): RegistrationState {
  if (error instanceof ApiError) {
    const body = isObject(error.body) ? error.body : {};
    const message = typeof body.message === "string" && body.message.trim() ? body.message : undefined;

    if (error.status === 400 && isObject(body.fields)) {
      const fields = body.fields;
      const fieldErrors: FieldErrors = {};
      for (const field of FIELDS) {
        if (typeof fields[field] === "string") fieldErrors[field] = fields[field];
      }
      const formError =
        typeof fields.body === "string"
          ? fields.body
          : Object.keys(fieldErrors).length === 0
            ? (message ?? GENERAL)
            : undefined;
      return { status: "error", values, fieldErrors, ...(formError ? { formError } : {}) };
    }

    if (error.status === 409 && error.code === "USER_ALREADY_EXISTS") {
      return {
        status: "error",
        values,
        fieldErrors: {},
        formError: message ?? "Usuário já cadastrado.",
        offerSignIn: true,
      };
    }

    if (error.status === 409 && error.code === "CPF_ALREADY_EXISTS") {
      return {
        status: "error",
        values,
        fieldErrors: { cpf: message ?? "CPF já cadastrado." },
        offerSignIn: true,
      };
    }

    // Status and code only: the request held the password, and the body is not ours to log.
    console.error("registration failed", error.status, error.code);
  } else {
    console.error("registration failed", error instanceof Error ? error.name : typeof error);
  }
  return { status: "error", values, fieldErrors: {}, formError: GENERAL };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
