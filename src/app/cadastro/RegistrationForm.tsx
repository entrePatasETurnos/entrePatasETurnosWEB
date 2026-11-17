"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  INITIAL_REGISTRATION_STATE,
  confirmationError,
  readRegistration,
  validateRegistration,
  type FieldErrors,
  type RegistrationState,
} from "@/lib/registration";
import { registerAction } from "./actions";
import styles from "./cadastro.module.css";

type FormField = "email" | "name" | "cpf" | "password" | "confirm";
type ClientErrors = FieldErrors & { confirm?: string };

/** Tab order: the first invalid field in this order receives focus. */
const ORDER: FormField[] = ["email", "name", "cpf", "password", "confirm"];

/**
 * The registration form (spec 009, contracts/ui-registration.md).
 *
 * "Confirmar senha" has no `name`, so its value never leaves the browser; it is compared with the
 * password here, before submitting. E-mail, name and CPF come back from the action after a failure and
 * are restored as default values when React resets the form; the passwords are not, so they clear.
 */
export function RegistrationForm() {
  const [state, action, pending] = useActionState(registerAction, INITIAL_REGISTRATION_STATE);
  // The browser's own messages belong to the answer they were made under; a new answer from the
  // server replaces them without an extra render.
  const [client, setClient] = useState<{ under: RegistrationState; errors: ClientErrors }>({
    under: INITIAL_REGISTRATION_STATE,
    errors: {},
  });
  const clientErrors: ClientErrors = client.under === state ? client.errors : {};
  const setClientErrors = (errors: ClientErrors) => setClient({ under: state, errors });
  // Until hydrated the confirmation check cannot run, so the button stays disabled (research R2).
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // A new answer from the server takes the focus.
  useEffect(() => {
    if (state.status !== "error") return;
    const first = ORDER.find((field) => field !== "confirm" && state.fieldErrors[field]);
    if (first) focusField(formRef.current, first);
    else alertRef.current?.focus();
  }, [state]);

  if (state.status === "created") {
    return <Created email={state.email} />;
  }

  const serverErrors: FieldErrors = state.status === "error" ? state.fieldErrors : {};
  const kept = state.status === "error" ? state.values : { email: "", name: "", cpf: "" };
  const errorFor = (field: FormField) =>
    clientErrors[field] ?? (field === "confirm" ? undefined : serverErrors[field]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget;
    const input = readRegistration(new FormData(form));
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement | null)?.value ?? "";
    const errors: ClientErrors = { ...validateRegistration(input) };
    const mismatch = confirmationError(input.password, confirm);
    if (mismatch) errors.confirm = mismatch;

    const first = ORDER.find((field) => errors[field]);
    if (first) {
      event.preventDefault();
      setClientErrors(errors);
      focusField(form, first);
      return;
    }
    setClientErrors({});
  }

  const formError = state.status === "error" ? state.formError : undefined;
  const offerSignIn = state.status === "error" && state.offerSignIn;

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} noValidate aria-busy={pending} className={styles.form}>
      <Field id="email" label="E-mail" error={errorFor("email")}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={kept.email}
          {...describe("email", errorFor("email"))}
          className={styles.input}
        />
      </Field>
      <Field id="name" label="Nome completo" error={errorFor("name")}>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          defaultValue={kept.name}
          {...describe("name", errorFor("name"))}
          className={styles.input}
        />
      </Field>
      <Field id="cpf" label="CPF" error={errorFor("cpf")}>
        <input
          id="cpf"
          name="cpf"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          required
          defaultValue={kept.cpf}
          {...describe("cpf", errorFor("cpf"))}
          className={styles.input}
        />
      </Field>
      <Field id="password" label="Senha" error={errorFor("password")}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          {...describe("password", errorFor("password"))}
          className={styles.input}
        />
      </Field>
      <Field id="confirm" label="Confirmar senha" error={errorFor("confirm")}>
        {/* No `name`: the confirmation is never submitted (spec FR-003). */}
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          onChange={() => clientErrors.confirm && setClientErrors({ ...clientErrors, confirm: undefined })}
          {...describe("confirm", errorFor("confirm"))}
          className={styles.input}
        />
      </Field>

      {formError || offerSignIn ? (
        <div ref={alertRef} role="alert" tabIndex={-1} className={styles.formError}>
          {formError ?? "Já existe uma conta com esses dados."}
          {offerSignIn ? (
            <>
              {" "}
              <Link href="/entrar">Entrar</Link>
            </>
          ) : null}
        </div>
      ) : null}

      <button type="submit" disabled={pending || !hydrated} className={styles.submit}>
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: FormField;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describe(id: FormField, error?: string) {
  return error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
}

function subscribeNothing() {
  return () => {};
}

function focusField(form: HTMLFormElement | null, field: FormField) {
  const element = form?.querySelector<HTMLInputElement>(`#${field}`);
  element?.focus();
}

function Created({ email }: { email: string }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <section className={styles.success} aria-labelledby="created-heading">
      <h2 id="created-heading" ref={headingRef} tabIndex={-1}>
        Conta criada
      </h2>
      <p>
        Enviamos um link de confirmação para <strong>{email}</strong>. Confirme o seu e-mail para poder
        entrar.
      </p>
      <Link href="/entrar">Ir para o login</Link>
    </section>
  );
}
