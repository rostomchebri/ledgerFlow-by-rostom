"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentDownloadButtonProps = {
  documentId: string;
  /** Server-side original name; used when the response header is unavailable. */
  fallbackFilename: string;
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  /** Render only the icon; the label remains available to screen readers. */
  iconOnly?: boolean;
  className?: string;
};

/**
 * DOC-05 — downloads go through the authenticated API route, never through a
 * storage URL. Fetching into a blob lets us surface authorization/storage
 * failures in the UI instead of opening a blank tab, and lets us keep the
 * original filename and extension.
 */
function filenameFromHeader(header: string | null, fallback: string): string {
  if (!header) return fallback;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      // Fall through to the ASCII filename below.
    }
  }

  const quoted = /filename="?([^";]+)"?/i.exec(header)?.[1];
  return quoted?.trim() || fallback;
}

export function DocumentDownloadButton({
  documentId,
  fallbackFilename,
  label,
  variant = "ghost",
  size = "sm",
  iconOnly = false,
  className,
}: DocumentDownloadButtonProps) {
  const t = useTranslations("documents");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function errorForStatus(status: number): string {
    if (status === 404) return t("downloadMissing");
    if (status === 401 || status === 403) return t("downloadForbidden");
    if (status === 503) return t("downloadUnavailable");
    return t("downloadError");
  }

  async function download() {
    if (pending) return;

    setPending(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(documentId)}/download?download=1`,
        { cache: "no-store", signal: controller.signal },
      );

      if (!response.ok) {
        setError(errorForStatus(response.status));
        return;
      }

      const blob = await response.blob();
      const filename = filenameFromHeader(
        response.headers.get("content-disposition"),
        fallbackFilename,
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(t("downloadNetwork"));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPending(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => void download()}
        disabled={pending}
        aria-label={iconOnly ? label : undefined}
        title={error ?? label}
        className={cn(iconOnly && "px-2", className)}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {iconOnly ? <span className="sr-only">{label}</span> : label}
      </Button>
      {error ? (
        <span
          role="alert"
          className="absolute end-0 top-full z-30 mt-1.5 w-56 rounded-lg border border-destructive/30 bg-popover px-2.5 py-1.5 text-[11px] leading-4 text-destructive shadow-popover"
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
