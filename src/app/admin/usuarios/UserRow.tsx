"use client";

import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  INITIAL_USER_ROW_STATE,
  NAME_MAX_LENGTH,
  ROLE_LABELS,
  USER_ROLES,
  statusLabel,
  validateName,
  type UserRole,
  type UserRowState,
  type UserRowUser,
} from "@/lib/user-edit";
import styles from "./users.module.css";

type RowAction = (prev: UserRowState, formData: FormData) => Promise<UserRowState>;

/** Shown inside the row being edited when the administrator asks to edit another one (research R4). */
export type DiscardPrompt = { otherName: string; onDiscard: () => void; onKeep: () => void };

type Props = {
  user: UserRowUser;
  /** The administrator's own account: shown, never editable (research R7). */
  isSelf: boolean;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  discard: DiscardPrompt | null;
  action: RowAction;
};

const CONSEQUENCE: Record<UserRole, string> = {
  ADMINISTRATOR: "Administradores veem e aprovam todos os pedidos.",
  CLIENT: "Deixará de acessar o painel do administrador.",
};

/**
 * One account in the list (spec 011, contracts/ui-users.md): a view mode, and an edit mode in place where
 * the name and the profile are changed. The save runs here (not in the editor) so its answer outlives the
 * editor: "Alterações salvas." is shown once the row is back in view mode.
 */
export function UserRow({ user, isSelf, editing, onEdit, onClose, onDirtyChange, discard, action }: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL_USER_ROW_STATE);
  // The "saved" message belongs to one answer; opening the editor again dismisses it.
  const [dismissed, setDismissed] = useState<UserRowState | null>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  // The API's answer is what the row shows until the refreshed list arrives with the same values.
  const shown = state.status === "saved" && state.user.id === user.id ? state.user : user;

  useEffect(() => {
    if (state.status === "saved" || state.status === "unchanged") {
      returnFocus.current = true;
      onClose();
    }
    // Only a new answer closes the editor; `onClose` changes on every render of the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      editRef.current?.focus();
    }
  }, [editing]);

  function close() {
    returnFocus.current = true;
    onClose();
  }

  const message = state.status === "saved" && dismissed !== state && !editing ? "Alterações salvas." : null;

  return (
    <li className={styles.row} aria-busy={pending || undefined}>
      <div className={styles.rowView}>
        <span className={styles.rowName}>
          {shown.name}
          {isSelf && <span className={styles.you}> (você)</span>}
        </span>
        <span className={`${styles.badge} ${shown.role === "ADMINISTRATOR" ? styles.badgeAdmin : styles.badgeClient}`}>
          {ROLE_LABELS[shown.role] ?? shown.role}
        </span>
        <span className={styles.rowEmail}>{shown.email}</span>
        {shown.status !== "ACTIVE" && <span className={styles.rowStatus}>{statusLabel(shown.status)}</span>}
        {isSelf ? (
          <p className={styles.selfHint}>Este é você. Peça a outro administrador para alterar seus dados.</p>
        ) : (
          !editing && (
            <div className={styles.rowActions}>
              <button
                ref={editRef}
                type="button"
                className={styles.buttonSecondary}
                aria-label={`Editar ${shown.name}`}
                onClick={() => {
                  setDismissed(state);
                  onEdit();
                }}
              >
                Editar
              </button>
            </div>
          )
        )}
        <p role="status" className={styles.saved}>
          {message}
        </p>
      </div>

      {editing && !isSelf && (
        <RowEditor
          user={shown}
          state={state}
          formAction={formAction}
          pending={pending}
          onCancel={close}
          onDirtyChange={onDirtyChange}
          discard={discard}
        />
      )}
    </li>
  );
}

type EditorProps = {
  user: UserRowUser;
  state: UserRowState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  discard: DiscardPrompt | null;
};

/**
 * The row's form. Mounted when editing starts, so it always starts from the saved values; the inputs are
 * controlled, so typed values survive a failed save (FR-009). A changed profile is confirmed in the row
 * before it is sent: "Confirmar" sends the form with `confirmRole=1`, which the action requires.
 */
function RowEditor({ user, state, formAction, pending, onCancel, onDirtyChange, discard }: EditorProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [confirming, setConfirming] = useState(false);
  // Answers from before this editor opened are not shown; a browser-side name error belongs to one answer.
  const [openedWith] = useState(state);
  const [clientError, setClientError] = useState<{ under: UserRowState; message: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const confirmedRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fresh = state !== openedWith && state.status === "error" ? state : null;
  const nameError = (clientError?.under === state ? clientError.message : undefined) ?? fresh?.fieldErrors.name;
  const ids = `user-${user.id}`;

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // A new answer from the server takes the focus.
  useEffect(() => {
    if (!fresh) return;
    if (fresh.fieldErrors.name) nameRef.current?.focus();
    else alertRef.current?.focus();
  }, [fresh]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (discard) discardRef.current?.focus();
  }, [discard]);

  function report(nextName: string, nextRole: UserRole) {
    onDirtyChange(nextName.trim() !== user.name || nextRole !== user.role);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    const problem = validateName(name);
    if (problem) {
      event.preventDefault();
      setClientError({ under: state, message: problem });
      nameRef.current?.focus();
      return;
    }
    setClientError(null);

    const trimmed = name.trim();
    if (trimmed === user.name && role === user.role) {
      // Nothing to save: close without asking the server (spec edge case "Nothing changed").
      event.preventDefault();
      onCancel();
      return;
    }
    if (role !== user.role && confirmedRef.current?.value !== "1") {
      event.preventDefault();
      setConfirming(true);
    }
  }

  function confirm() {
    if (confirmedRef.current) confirmedRef.current.value = "1";
    formRef.current?.requestSubmit();
    if (confirmedRef.current) confirmedRef.current.value = "";
    setConfirming(false);
  }

  function cancelConfirm() {
    setConfirming(false);
    saveRef.current?.focus();
  }

  function keep() {
    discard?.onKeep();
    nameRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (discard) keep();
    else if (confirming) cancelConfirm();
    else if (!pending) onCancel();
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      noValidate
      aria-busy={pending}
      aria-label={`Editar ${user.name}`}
      className={styles.form}
    >
      <input type="hidden" name="originalName" value={user.name} />
      <input type="hidden" name="originalRole" value={user.role} />
      <input ref={confirmedRef} type="hidden" name="confirmRole" defaultValue="" />

      <div className={styles.field}>
        <label htmlFor={`${ids}-name`}>Nome completo</label>
        <input
          ref={nameRef}
          id={`${ids}-name`}
          name="name"
          type="text"
          autoComplete="off"
          required
          maxLength={NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            report(event.target.value, role);
          }}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${ids}-name-error` : undefined}
          className={styles.input}
        />
        {nameError && (
          <p id={`${ids}-name-error`} className={styles.fieldError}>
            {nameError}
          </p>
        )}
      </div>

      <fieldset className={styles.field}>
        <legend>Perfil</legend>
        <div className={styles.radios}>
          {USER_ROLES.map((option) => (
            <label key={option} className={styles.radio}>
              <input
                type="radio"
                name="role"
                value={option}
                checked={role === option}
                onChange={() => {
                  setRole(option);
                  report(name, option);
                }}
              />
              {ROLE_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      {fresh?.formError && (
        <div ref={alertRef} role="alert" tabIndex={-1} className={styles.formError}>
          {fresh.formError}
          {fresh.notFound && (
            <>
              {" "}
              <button type="button" className={styles.linkButton} onClick={() => router.refresh()}>
                Recarregar lista
              </button>
            </>
          )}
        </div>
      )}

      {confirming && (
        <div
          ref={confirmRef}
          tabIndex={-1}
          role="group"
          aria-labelledby={`${ids}-confirm`}
          className={styles.confirm}
        >
          <p id={`${ids}-confirm`}>
            Tornar <strong>{name.trim() || user.name}</strong> {ROLE_LABELS[role]}?
          </p>
          <p>{CONSEQUENCE[role]}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={confirm} disabled={pending}>
              Confirmar
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={cancelConfirm}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {discard && (
        <div
          ref={discardRef}
          tabIndex={-1}
          role="group"
          aria-labelledby={`${ids}-discard`}
          className={styles.confirm}
        >
          <p id={`${ids}-discard`}>
            Descartar alterações em <strong>{user.name}</strong>?
          </p>
          <p>Para editar {discard.otherName}, as alterações deste usuário serão perdidas.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={discard.onDiscard}>
              Descartar
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={keep}>
              Continuar editando
            </button>
          </div>
        </div>
      )}

      {/* Stay while a panel is open, so "Cancelar" has somewhere to return the focus. */}
      <div className={styles.actions}>
        <button ref={saveRef} type="submit" className={styles.button} disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className={styles.buttonSecondary} onClick={onCancel} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
