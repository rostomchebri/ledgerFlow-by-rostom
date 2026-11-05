"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
};

/** TASK-04 — task comment thread. */
export function TaskComments({
  taskId,
  initialComments,
}: {
  taskId: string;
  initialComments: CommentItem[];
}) {
  const t = useTranslations("tasks.comments");
  const locale = useLocale();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: CommentItem;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.data) {
        setError(payload?.error?.message ?? t("failed"));
        return;
      }

      setComments((previous) => [...previous, payload.data!]);
      setBody("");
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquare aria-hidden="true" className="h-4 w-4" />
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="glass-soft rounded-xl px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{comment.author.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatter.format(new Date(comment.createdAt))}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("placeholder")}
          rows={3}
          maxLength={4000}
          aria-label={t("placeholder")}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Send aria-hidden="true" className="h-4 w-4" />
            )}
            {pending ? t("sending") : t("submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
