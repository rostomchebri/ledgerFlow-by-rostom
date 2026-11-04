"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { getPasswordIssues, type PasswordIssue } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

const ISSUES: PasswordIssue[] = ["tooShort", "missingLetter", "missingNumber", "tooCommon"];

export function PasswordHints({ password, className }: { password: string; className?: string }) {
  const t = useTranslations("auth.passwordIssues");
  const current = new Set(getPasswordIssues(password));

  return (
    <ul className={cn("grid gap-1 text-xs text-muted-foreground", className)}>
      {ISSUES.map((issue) => {
        const passed = !current.has(issue);
        const Icon = passed ? Check : X;

        return (
          <li
            key={issue}
            className={cn(
              "flex items-center gap-1.5",
              passed && "text-emerald-700 dark:text-emerald-400",
            )}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {t(issue)}
          </li>
        );
      })}
    </ul>
  );
}
