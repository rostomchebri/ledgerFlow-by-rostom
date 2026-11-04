"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client.
 *
 * The default base URL is the current origin + `/api/auth`, so no public env
 * variable is needed in the browser bundle.
 */
export const authClient = createAuthClient({
  fetchOptions: {
    onError: async (context) => {
      if (context.response.status !== 429) return;

      const retryAfter = context.response.headers.get("X-Retry-After");
      if (retryAfter) {
        console.warn(`[auth] rate limited; retry after ${retryAfter}s`);
      }
    },
  },
});

export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } =
  authClient;
