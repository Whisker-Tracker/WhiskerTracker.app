"use client";

import { useMemo, useState, useTransition } from "react";

import { createManagedUserAction, updateManagedUserAction, updateManagedUserDetailsAction } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import messages_es from "@/messages/es.json";
import type { UserRole } from "@/types/database.types";

type ManagedUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

type EditingUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  password: string;
};

const roleOptions: UserRole[] = ["admin", "caretaker", "volunteer"];

type StatusFilter = "all" | "active" | "inactive";

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function UserManagementForm({
  users,
  currentUserId,
}: Readonly<{
  users: ManagedUser[];
  currentUserId: string;
}>) {
  const t = messages_es.userManagement;
  const common = messages_es.common;

  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);

  const createUser = (formData: FormData) => {
    const email = getFormString(formData, "email");
    const password = getFormString(formData, "password");
    const fullName = getFormString(formData, "full_name");
    const role = (getFormString(formData, "role") || "volunteer") as UserRole;
    const isActive = formData.get("is_active") === "on";

    setMessage("");
    startTransition(async () => {
      const result = await createManagedUserAction({
        email,
        password,
        fullName,
        role,
        isActive,
      });
      setMessage(result.message);
    });
  };

  const updateUser = (formData: FormData) => {
    const id = getFormString(formData, "id");
    const role = (getFormString(formData, "role") || "volunteer") as UserRole;
    const isActive = formData.get("is_active") === "on";

    setMessage("");
    startTransition(async () => {
      const result = await updateManagedUserAction({ id, role, isActive });
      setMessage(result.message);
    });
  };

  const saveUserDetails = () => {
    if (!editingUser) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await updateManagedUserDetailsAction({
        id: editingUser.id,
        email: editingUser.email,
        fullName: editingUser.fullName,
        role: editingUser.role,
        isActive: editingUser.isActive,
        password: editingUser.password || undefined,
      });
      setMessage(result.message);
      if (result.ok) {
        setEditingUser(null);
      }
    });
  };

  const openEditModal = (user: ManagedUser) => {
    setEditingUser({
      id: user.id,
      fullName: user.full_name ?? "",
      email: user.email ?? "",
      role: user.role,
      isActive: user.is_active,
      password: "",
    });
  };

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (statusFilter === "active" && !user.is_active) {
        return false;
      }

      if (statusFilter === "inactive" && user.is_active) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const name = (user.full_name ?? "").toLowerCase();
      const email = (user.email ?? "").toLowerCase();

      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });
  }, [users, query, roleFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>{t.createUser}</CardTitle>
        <CardText className="mt-1">{t.createHint}</CardText>

        <form action={createUser} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.fullName}</span>
            <input
              name="full_name"
              placeholder={t.optional}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.email}</span>
            <input
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.password}</span>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              placeholder={t.passwordHint}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.role}</span>
            <select name="role" defaultValue="volunteer" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700 md:col-span-2">
            <input name="is_active" type="checkbox" defaultChecked />
            <span>{t.activeAccount}</span>
          </label>

          <Button type="submit" disabled={isPending} className="md:col-span-2">
            {isPending ? t.creatingUser : t.createUser}
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle>{t.userManagement}</CardTitle>
        <CardText className="mt-1">{t.manageHint}</CardText>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.search}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.role}</span>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="all">{t.allRoles}</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm text-slate-700">
            <span>{t.status}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="active">{t.active}</option>
              <option value="inactive">{t.inactive}</option>
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {t.showing} {filteredUsers.length} {t.of} {users.length} {t.usersWord}.
        </p>

        <div className="mt-4 space-y-3">
          {filteredUsers.map((user) => (
            <form key={user.id} action={updateUser} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-12 md:items-end">
              <input type="hidden" name="id" value={user.id} />

              <div className="md:col-span-5">
                <p className="text-sm font-semibold text-slate-900">
                  {user.full_name || t.unnamed}
                  {user.id === currentUserId ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{t.you}</span> : null}
                </p>
                <p className="text-xs text-slate-500">{user.email ?? t.noEmail}</p>
              </div>

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-3">
                <span>{t.role}</span>
                <select name="role" defaultValue={user.role} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700 md:col-span-2">
                <input name="is_active" type="checkbox" defaultChecked={user.is_active} />
                <span>{t.active}</span>
              </label>

              <div className="md:col-span-2 md:flex md:justify-end">
                <div className="flex w-full gap-2 md:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEditModal(user)}
                    disabled={isPending}
                    className="w-full md:w-auto"
                  >
                    {common.edit}
                  </Button>
                  <Button type="submit" disabled={isPending} className="w-full md:w-auto">
                    {isPending ? common.loading : common.save}
                  </Button>
                </div>
              </div>
            </form>
          ))}

          {users.length === 0 ? <p className="text-sm text-slate-500">{t.noUsers}</p> : null}
          {users.length > 0 && filteredUsers.length === 0 ? (
            <p className="text-sm text-slate-500">{t.noUsersFiltered}</p>
          ) : null}
        </div>
      </Card>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t.editUser}</h3>
                <p className="text-sm text-slate-600">{t.editHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t.closeEditModal}
              >
                {common.cancel}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.fullName}</span>
                <input
                  value={editingUser.fullName}
                  onChange={(event) => setEditingUser({ ...editingUser, fullName: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.email}</span>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>

              <label className="grid gap-1 text-sm text-slate-700">
                <span>{t.role}</span>
                <select
                  value={editingUser.role}
                  onChange={(event) => setEditingUser({ ...editingUser, role: event.target.value as UserRole })}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editingUser.isActive}
                  onChange={(event) => setEditingUser({ ...editingUser, isActive: event.target.checked })}
                />
                <span>{t.activeAccount}</span>
              </label>

              <label className="grid gap-1 text-sm text-slate-700 md:col-span-2">
                <span>{t.newPasswordOptional}</span>
                <input
                  type="password"
                  minLength={8}
                  value={editingUser.password}
                  onChange={(event) => setEditingUser({ ...editingUser, password: event.target.value })}
                  placeholder={t.keepCurrentPassword}
                  className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)} disabled={isPending}>
                {common.cancel}
              </Button>
              <Button type="button" onClick={saveUserDetails} disabled={isPending || !editingUser.email.trim()}>
                {isPending ? t.updating : t.updateUser}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
