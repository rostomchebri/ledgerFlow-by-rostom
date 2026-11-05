"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UploadCloud } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENT_SIZE,
} from "@/lib/documents/schema";

type ClientOption = { id: string; name: string };

export function DocumentUploadForm({ clients }: { clients: ClientOption[] }) {
  const t = useTranslations("documents.upload");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("OTHER");
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError(t("fileRequired"));
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      setError(t("tooLarge"));
      return;
    }
    if (file.type && !(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
      setError(t("typeNotAllowed"));
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("name", name.trim() || file.name);
    form.set("category", category);
    form.set("description", description);
    form.set("tags", tags);
    if (clientId) form.set("clientId", clientId);

    setPending(true);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const body = (await response.json().catch(() => null)) as {
        data?: { id?: string };
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(body?.error?.message ?? t("failed"));
        return;
      }

      router.push(body?.data?.id ? `/documents/${body.data.id}` : "/documents");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      ) : null}

      <section className="glass-card space-y-5 rounded-2xl p-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{t("fileTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("fileDescription")}</p>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="glass-soft flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-dashed px-6 py-10 text-center transition-colors hover:bg-[hsl(var(--card)/0.55)]"
        >
          <UploadCloud aria-hidden="true" className="h-7 w-7 text-primary" />
          <span className="text-sm font-semibold">
            {file ? file.name : t("chooseFile")}
          </span>
          <span className="text-xs text-muted-foreground">{t("limits")}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept={ALLOWED_DOCUMENT_TYPES.join(",")}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="document-name">{t("name")}</Label>
            <Input
              id="document-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="document-category">{t("category")}</Label>
            <Select
              id="document-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {DOCUMENT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {t(`categories.${option}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="document-client">{t("client")}</Label>
            <Select
              id="document-client"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">{t("noClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="document-tags">{t("tags")}</Label>
            <Input
              id="document-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={t("tagsPlaceholder")}
              maxLength={300}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="document-description">{t("description")}</Label>
            <Textarea
              id="document-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud aria-hidden="true" className="h-4 w-4" />
          )}
          {pending ? t("uploading") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
