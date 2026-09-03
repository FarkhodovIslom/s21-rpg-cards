"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "./api";

type Result<T> =
  | { forKey: string; ok: true; data: T }
  | { forKey: string; ok: false; error: ApiError };

export type ResourceResult<T> =
  | { data: T; error: null; loading: false; reload: () => void }
  | { data: null; error: ApiError; loading: false; reload: () => void }
  | { data: null; error: null; loading: true; reload: () => void };

/**
 * Fetches a resource with loading/error state. Refetches when `deps` change
 * or `reload()` is called. Results are tagged with the fetch key they belong
 * to, so stale responses are ignored and `loading` is derived (no state
 * resets, no setState synchronously inside effects).
 */
export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[],
): ResourceResult<T> {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const fetcherRef = useRef(fetcher);

  // Keep the ref current before the fetch effect runs on every commit.
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const fetchKey = `${JSON.stringify(deps)}|${nonce}`;

  useEffect(() => {
    let cancelled = false;
    void fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setResult({ forKey: fetchKey, ok: true, data });
      })
      .catch((caught) => {
        if (cancelled) return;
        setResult({
          forKey: fetchKey,
          ok: false,
          error:
            caught instanceof ApiError
              ? caught
              : new ApiError(0, "Request failed."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (result?.forKey === fetchKey && result.ok) {
    return { data: result.data, error: null, loading: false, reload };
  }
  if (result?.forKey === fetchKey && !result.ok) {
    return { data: null, error: result.error, loading: false, reload };
  }
  return { data: null, error: null, loading: true, reload };
}

/** Redirects to /login (with an expired marker) whenever the error is a 401. */
export function useUnauthorizedRedirect(error: ApiError | null) {
  const router = useRouter();
  useEffect(() => {
    if (error?.isUnauthorized) router.replace("/login?expired=1");
  }, [error, router]);
}
