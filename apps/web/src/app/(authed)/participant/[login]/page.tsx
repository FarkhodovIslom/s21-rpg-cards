"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { describeError, searchParticipant } from "@/lib/api";
import { useResource, useUnauthorizedRedirect } from "@/lib/useResource";
import { CardShell } from "@/components/CardShell";
import styles from "./page.module.css";

export default function ParticipantPage() {
  const params = useParams<{ login: string }>();
  const login = params.login;
  const { data, error, loading, reload } = useResource(
    () => searchParticipant(login),
    [login],
  );
  useUnauthorizedRedirect(error);

  if (loading) return (
    <main className={styles.state}>
      <div className={`${styles.skeleton} clip-outer`}>
        <span>Summoning {login}&apos;s card from School21...</span>
        <div className={styles.shimmer} aria-hidden="true" />
        <div className={`${styles.shimmer} ${styles.shimmerShort}`} aria-hidden="true" />
      </div>
    </main>
  );
  if (error?.status === 404) return (
    <main className={styles.state}>
      <div className={`${styles.empty} clip-outer`}>
        <p className={styles.kicker}>NOT FOUND</p>
        <h1>No such student</h1>
        <p>No student with login &apos;{login}&apos; was found.</p>
        <Link className={styles.back} href="/browse">Back to browse</Link>
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
  return data ? <CardShell data={data} guest /> : null;
}
