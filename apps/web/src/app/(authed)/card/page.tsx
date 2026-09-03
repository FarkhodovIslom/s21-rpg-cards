"use client";

import type { CardResponse } from "shared-types";
import { describeError, getOwnCard } from "@/lib/api";
import { useResource, useUnauthorizedRedirect } from "@/lib/useResource";
import { CardShell } from "@/components/CardShell";
import styles from "./page.module.css";

export default function CardPage() {
  const { data, error, loading, reload } = useResource<CardResponse>(
    getOwnCard,
    [],
  );
  useUnauthorizedRedirect(error);

  if (loading) return (
    <main className={styles.state}>
      <div className={`${styles.skeleton} clip-outer`}>
        <span>Reading your archive...</span>
        <div className={styles.shimmer} aria-hidden="true" />
        <div className={`${styles.shimmer} ${styles.shimmerShort}`} aria-hidden="true" />
      </div>
    </main>
  );
  if (error?.isNotSynced) return (
    <main className={styles.state}>
      <div className={`${styles.empty} clip-outer`}>
        <p className={styles.kicker}>CARD NOT READY</p>
        <h1>Your card is being prepared</h1>
        <p>The archive pulls School21 data on a schedule. Your card appears here once the first sync completes.</p>
        <button className={`${styles.retry} clip-small`} onClick={reload}>Check again</button>
      </div>
    </main>
  );
  if (error) return (
    <main className={styles.state}>
      <div className={`${styles.empty} clip-outer`}>
        <p className={styles.kicker}>ARCHIVE ERROR</p>
        <h1>Card unavailable</h1>
        <p>{describeError(error)}</p>
        {describeError(error) !== error.message && <p className={styles.detail}>{error.message}</p>}
        <button className={`${styles.retry} clip-small`} onClick={reload}>Retry</button>
      </div>
    </main>
  );
  return data ? <CardShell data={data} /> : null;
}
