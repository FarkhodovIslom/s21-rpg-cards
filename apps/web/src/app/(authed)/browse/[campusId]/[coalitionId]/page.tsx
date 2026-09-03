"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { describeError, getCampuses, getCampusCoalitions, getCoalitionParticipants } from "@/lib/api";
import { useResource, useUnauthorizedRedirect } from "@/lib/useResource";
import styles from "../../browse.module.css";

export default function ParticipantsPage() {
  const params = useParams<{ campusId: string; coalitionId: string }>();
  const { campusId, coalitionId } = params;
  const resource = useResource(async () => {
    const [campuses, coalitions, participants] = await Promise.all([
      getCampuses(),
      getCampusCoalitions(campusId),
      getCoalitionParticipants(coalitionId),
    ]);
    return { campuses, coalitions, participants };
  }, [campusId, coalitionId]);
  useUnauthorizedRedirect(resource.error);

  const ready = !resource.loading && !resource.error;
  const campus = ready
    ? resource.data.campuses.campuses.find((item) => item.id === campusId)
    : undefined;
  const campusLabel = campus?.shortName ?? campusId;
  const coalition = ready
    ? resource.data.coalitions.coalitions.find(
        (item) => String(item.coalitionId) === coalitionId,
      )
    : undefined;
  const coalitionLabel = coalition?.name ?? `Coalition ${coalitionId}`;

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/browse">Browse</Link>
        <span className={styles.sep}>/</span>
        <Link href={`/browse/${encodeURIComponent(campusId)}`}>{campusLabel}</Link>
        <span className={styles.sep}>/</span>
        <span className={styles.current}>{coalitionLabel}</span>
      </nav>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>{campus?.fullName ?? "PARTICIPANTS"}</p>
          <h1>{coalitionLabel}</h1>
        </div>
        {ready && <span>{resource.data.participants.participants.length} participants</span>}
      </div>
      {resource.loading ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><span>Rolling the rosters...</span></div></div>
      ) : resource.error ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><h1>Participants unavailable</h1><p>{describeError(resource.error)}</p>{describeError(resource.error) !== resource.error.message && <p className={styles.detail}>{resource.error.message}</p>}<button className={`${styles.retry} clip-small`} onClick={resource.reload}>Retry</button></div></div>
      ) : resource.data.participants.participants.length === 0 ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><h1>No participants</h1><p>No participants in this coalition.</p></div></div>
      ) : (
        <div className={styles.grid}>
          {resource.data.participants.participants.map((login) => (
            <Link
              className={`${styles.tile} clip-small`}
              key={login}
              href={`/participant/${encodeURIComponent(login)}`}
            >
              <span className={styles.name}>{login}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
