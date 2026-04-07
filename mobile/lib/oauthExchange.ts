import type { SupabaseClient } from "@supabase/supabase-js";

type ExchangeResult = Awaited<ReturnType<SupabaseClient["auth"]["exchangeCodeForSession"]>>;

/** Same OAuth `code` must only be exchanged once — PKCE verifier is removed from storage after the first call. */
const inFlightByCode = new Map<string, Promise<ExchangeResult>>();

/**
 * Deduplicates concurrent `exchangeCodeForSession` calls (e.g. sign-in screen + `/auth/callback` deep link).
 */
export function exchangeOAuthCodeOnce(client: SupabaseClient, code: string): Promise<ExchangeResult> {
  let p = inFlightByCode.get(code);
  if (!p) {
    p = client.auth.exchangeCodeForSession(code).finally(() => {
      inFlightByCode.delete(code);
    });
    inFlightByCode.set(code, p);
  }
  return p;
}
