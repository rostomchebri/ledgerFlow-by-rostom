"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { FirmRole } from "@/lib/rbac";

/** FIRM-04 — change a member's role or remove them from the workspace. */
export function MemberActions({
  memberId,
  role,
  roles,
}: {
  memberId: string;
  role: FirmRole;
  roles: readonly FirmRole[];
}) {
  const t = useTranslations("team.member");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const [value, setValue] = useState<FirmRole>(role);
  const [pending, setPending] = useState<"role" | "remove" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(next: FirmRole) {
    if (next === value) return;
    setValue(next);
    setPending("role");
    setSaved(false);
    setError(null);
    try {
      const response = await fetch(`/api/firms/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!response.ok) {
        setValue(role);
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 1500);
    } catch {
      setValue(role);
      setError(t("failed"));
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    if (!window.confirm(t("removeConfirm"))) return;
    setPending("remove");
    setError(null);
    try {
      const response = await fetch(`/api/firms/members/${memberId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(body?.error?.message ?? t("failed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("failed"));
    } finally {
      setPending(null);
    }
  }

  const options = roles.includes(role) ? roles : ([role, ...roles] as FirmRole[]);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Select
          value={value}
          disabled={pending !== null}
          onChange={(event) => void changeRole(event.target.value as FirmRole)}
          aria-label={t("roleLabel")}
          className="h-8 w-32 text-xs"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {tRoles(option)}
            </option>
          ))}
        </Select>
        {pending === "role" ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : saved ? (
          <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-500" />
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending !== null}
          onClick={() => void remove()}
          title={t("remove")}
        >
          {pending === "remove" ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className="sr-only">{t("remove")}</span>
        </Button>
      </div>
      {error ? <p className="max-w-44 text-end text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
