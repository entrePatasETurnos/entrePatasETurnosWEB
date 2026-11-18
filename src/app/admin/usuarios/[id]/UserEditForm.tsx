"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  INITIAL_USER_EDIT_STATE,
  NAME_MAX_LENGTH,
  validateName,
  type UserEditState,
  type UserRole,
} from "@/lib/user-edit";
import styles from "../users.module.css";

type Props = {
  user: { id: number; name: string; role: UserRole };
  /** The administrator's own account: the profile is shown but cannot be changed (spec FR-009). */
  isSelf: boolean;
  action: (prev: UserEditState, formData: FormData) => Promise<UserEditState>;
};

const LABEL: Record<UserRole, string> = { CLIENT: "Cliente", ADMINISTRATOR: "Administrador" };

const CONSEQUENCE: Record<UserRole, string> = {
  ADMINISTRATOR: "Administradores veem e aprovam todos os pedidos.",
  CLIENT: "Deixará de acessar o painel do administrador.",
};

/**
 * Name and profile of one account (spec 010, contracts/ui-users.md).
 *
 * A changed profile is confirmed in the page before it is sent (research R5): the first "Salvar" opens
 * the confirmation panel, and "Confirmar" sends the form with `confirmRole=1`. The Server Action ignores
 * a role change without it, so the step cannot be skipped.
 */
export function UserEditForm({ user, isSelf, action }: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL_USER_EDIT_STATE);
  // A name error found in the browser belongs to the answer it was made under.
  const [client, setClient] = useState<{ under: UserEditState; nameError?: string }>({ under: state });
  const [confirming, setConfirming] = useState<{ under: UserEditState; role: UserRole; name: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const confirmedRef = useRef<HTMLInputElement>(null);

  const error = state.status === "error" ? state : null;
  const originalName = error?.saved?.name ?? user.name;
  const values = error?.values ?? { name: user.name, role: user.role };
  const nameError = (client.under === state ? client.nameError : undefined) ?? error?.fieldErrors.name;
  const panel = confirming && confirming.under === state ? confirming : null;

  // A new answer from the server takes the focus.
  useEffect(() => {
    if (state.status !== "error") return;
    if (state.fieldErrors.name) nameRef.current?.focus();
    else alertRef.current?.focus();
  }, [state]);

  useEffect(() => {
    if (panel) confirmRef.current?.focus();
  }, [panel]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "");
    const problem = validateName(name);
    if (problem) {
      event.preventDefault();
      setClient({ under: state, nameError: problem });
      nameRef.current?.focus();
      return;
    }
    setClient({ under: state });

    const role = String(data.get("role") ?? "") as UserRole;
    const confirmed = confirmedRef.current?.value === "1";
    if (!isSelf && role !== user.role && !confirmed) {
      event.preventDefault();
      setConfirming({ under: state, role, name: name.trim() });
    }
  }

  function confirm() {
    if (confirmedRef.current) confirmedRef.current.value = "1";
    formRef.current?.requestSubmit();
    if (confirmedRef.current) confirmedRef.current.value = "";
    setConfirming(null);
  }

  function cancel() {
    setConfirming(null);
    saveRef.current?.focus();
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate aria-busy={pending} className={styles.form}>
      <input type="hidden" name="originalName" value={originalName} />
      <input type="hidden" name="originalRole" value={user.role} />
      <input ref={confirmedRef} type="hidden" name="confirmRole" defaultValue="" />

      <div className={styles.field}>
        <label htmlFor="name">Nome completo</label>
        <input
          ref={nameRef}
          // Remount on a new answer so the kept value is shown again after React resets the form.
          key={state.status === "error" ? `kept-${values.name}` : "initial"}
          id="name"
          name="name"
          type="text"
          autoComplete="off"
          required
          maxLength={NAME_MAX_LENGTH}
          defaultValue={values.name}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "name-error" : undefined}
          className={styles.input}
        />
        {nameError && (
          <p id="name-error" className={styles.fieldError}>
            {nameError}
          </p>
        )}
      </div>

      <fieldset className={styles.field} aria-describedby={isSelf ? "role-self" : undefined}>
        <legend>Perfil</legend>
        <div className={styles.radios} key={state.status === "error" ? `kept-${values.role}` : "initial"}>
          {(["CLIENT", "ADMINISTRATOR"] as const).map((role) => (
            <label key={role} className={styles.radio}>
              <input
                type="radio"
                name={isSelf ? undefined : "role"}
                value={role}
                defaultChecked={(isSelf ? user.role : values.role) === role}
                disabled={isSelf}
              />
              {LABEL[role]}
            </label>
          ))}
        </div>
        {isSelf && (
          <>
            <input type="hidden" name="role" value={user.role} />
            <p id="role-self" className={styles.hint}>
              Você não pode alterar o seu próprio perfil. Peça a outro administrador.
            </p>
          </>
        )}
      </fieldset>

      {error?.formError && (
        <div ref={alertRef} role="alert" tabIndex={-1} className={styles.formError}>
          {error.formError}
        </div>
      )}

      {panel && (
        <div
          ref={confirmRef}
          tabIndex={-1}
          className={styles.confirm}
          aria-labelledby="confirm-question"
          role="group"
          onKeyDown={onPanelKeyDown}
        >
          <p id="confirm-question">
            Tornar <strong>{panel.name || user.name}</strong> {LABEL[panel.role]}?
          </p>
          <p>{CONSEQUENCE[panel.role]}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={confirm} disabled={pending}>
              Confirmar
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={cancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Stays while the confirmation is open, so "Cancelar" has somewhere to return the focus. */}
      <div className={styles.actions}>
        <button ref={saveRef} type="submit" className={styles.button} disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
