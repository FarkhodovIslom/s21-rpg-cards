"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { describeError, getCampuses, getCampusCoalitions } from "@/lib/api";
import { useResource, useUnauthorizedRedirect } from "@/lib/useResource";
import styles from "../browse.module.css";

export default function CoalitionsPage() {
  const params = useParams<{ campusId: string }>();
  const campusId = params.campusId;
  const resource = useResource(async () => {
    const [campuses, coalitions] = await Promise.all([
      getCampuses(),
      getCampusCoalitions(campusId),
    ]);
    return { campuses, coalitions };
  }, [campusId]);
  useUnauthorizedRedirect(resource.error);

  const campus =
    !resource.loading && !resource.error
      ? resource.data.campuses.campuses.find((item) => item.id === campusId)
      : undefined;
  const campusLabel = campus?.shortName ?? campusId;

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/browse">Browse</Link>
        <span className={styles.sep}>/</span>
        <span className={styles.current}>{campusLabel}</span>
      </nav>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>{campus?.fullName ?? "COALITIONS"}</p>
          <h1>{campusLabel}</h1>
        </div>
        {!resource.loading && !resource.error && (
          <span>{resource.data.coalitions.coalitions.length} coalitions</span>
        )}
      </div>
      {resource.loading ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><span>Consulting the ledgers...</span></div></div>
      ) : resource.error ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><h1>Coalitions unavailable</h1><p>{describeError(resource.error)}</p>{describeError(resource.error) !== resource.error.message && <p className={styles.detail}>{resource.error.message}</p>}<button className={`${styles.retry} clip-small`} onClick={resource.reload}>Retry</button></div></div>
      ) : resource.data.coalitions.coalitions.length === 0 ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><h1>No coalitions</h1><p>No coalitions for this campus.</p></div></div>
      ) : (
        <div className={styles.grid}>
          {resource.data.coalitions.coalitions.map((coalition) => (
            <Link
              className={`${styles.tile} clip-small`}
              key={coalition.coalitionId}
              href={`/browse/${encodeURIComponent(campusId)}/${encodeURIComponent(coalition.coalitionId)}`}
            >
              <span className={styles.name}>{coalition.name}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
