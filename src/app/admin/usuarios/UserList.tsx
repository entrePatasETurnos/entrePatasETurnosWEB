"use client";

import { useState } from "react";
import type { UserRowState, UserRowUser } from "@/lib/user-edit";
import { UserRow } from "./UserRow";
import styles from "./users.module.css";

type RowAction = (prev: UserRowState, formData: FormData) => Promise<UserRowState>;

type Props = {
  users: UserRowUser[];
  myId: number;
  /** Each row's save, bound to its id on the server (research R5). */
  actions: Record<number, RowAction>;
};

/**
 * The page of accounts, with at most one row in edit mode (research R4). Opening another row while the
 * current one has unsaved changes asks, inside the current row, whether to discard them.
 */
export function UserList({ users, myId, actions }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<number | null>(null);

  function open(id: number) {
    setEditingId(id);
    setDirty(false);
    setPendingSwitch(null);
  }

  function requestEdit(id: number) {
    if (editingId !== null && editingId !== id && dirty) setPendingSwitch(id);
    else open(id);
  }

  function close(id: number) {
    // A late answer from a row that is no longer the one being edited must not close the current one.
    setEditingId((current) => (current === id ? null : current));
    if (editingId === id) {
      setDirty(false);
      setPendingSwitch(null);
    }
  }

  const switchTo = pendingSwitch === null ? undefined : users.find((user) => user.id === pendingSwitch);

  return (
    <ul className={styles.rows}>
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          isSelf={user.id === myId}
          editing={editingId === user.id}
          onEdit={() => requestEdit(user.id)}
          onClose={() => close(user.id)}
          onDirtyChange={setDirty}
          discard={
            editingId === user.id && switchTo
              ? {
                  otherName: switchTo.name,
                  onDiscard: () => open(switchTo.id),
                  onKeep: () => setPendingSwitch(null),
                }
              : null
          }
          action={actions[user.id]}
        />
      ))}
    </ul>
  );
}
