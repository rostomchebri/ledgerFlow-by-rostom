import { describe, expect, it } from "vitest";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import {
  defaultLocale,
  isLocale,
  localeDirections,
  localeLabels,
  locales,
  resolveLocale,
} from "@/i18n/config";

type Messages = { [key: string]: string | Messages };

function flattenKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages)
    .flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string" ? [path] : flattenKeys(value, path);
    })
    .sort();
}

function flattenValues(messages: Messages, prefix = ""): Array<[string, string]> {
  return Object.entries(messages)
    .flatMap(([key, value]): Array<[string, string]> => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string" ? [[path, value]] : flattenValues(value, path);
    })
    .sort(([a], [b]) => a.localeCompare(b));
}

const CATALOGS: Record<string, Messages> = { fr, ar, en };

describe("i18n config", () => {
  it("keeps the default locale inside the supported list", () => {
    expect(locales).toContain(defaultLocale);
  });

  it("has no duplicate locales", () => {
    expect(new Set(locales).size).toBe(locales.length);
  });

  it("validates locale values", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("es")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("falls back to the default locale", () => {
    expect(resolveLocale("ar")).toBe("ar");
    expect(resolveLocale("de")).toBe(defaultLocale);
    expect(resolveLocale(undefined)).toBe(defaultLocale);
  });

  it("marks Arabic as RTL and the others as LTR", () => {
    expect(localeDirections.ar).toBe("rtl");
    expect(localeDirections.fr).toBe("ltr");
    expect(localeDirections.en).toBe("ltr");
  });

  it("labels every locale with a non-empty native name", () => {
    for (const locale of locales) {
      expect(localeLabels[locale].trim().length).toBeGreaterThan(0);
    }
  });
});

describe("translation catalogs", () => {
  const reference = flattenKeys(CATALOGS[defaultLocale]!);

  it.each(locales)("%s has the same keys as the default locale", (locale) => {
    expect(flattenKeys(CATALOGS[locale]!)).toEqual(reference);
  });

  it.each(locales)("%s has no empty translations", (locale) => {
    const empty = flattenValues(CATALOGS[locale]!).filter(([, value]) => value.trim() === "");
    expect(empty).toEqual([]);
  });
});
