import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_COOKIE, resolveLocale } from "./config";

/**
 * Request-scoped locale + messages.
 *
 * The locale comes from the NEXT_LOCALE cookie set by <LocaleSwitcher />.
 * Unknown or missing values fall back to `defaultLocale` (French).
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
