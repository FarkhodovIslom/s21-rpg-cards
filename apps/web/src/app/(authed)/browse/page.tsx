"use client";

import Link from "next/link";
import { describeError, getCampuses } from "@/lib/api";
import { useResource, useUnauthorizedRedirect } from "@/lib/useResource";
import styles from "./browse.module.css";

export default function CampusesPage() {
  const resource = useResource(getCampuses, []);
  useUnauthorizedRedirect(resource.error);

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>DISCOVER STUDENTS</p>
          <h1>Browse</h1>
        </div>
        {!resource.loading && !resource.error && (
          <span>{resource.data.campuses.length} campuses</span>
        )}
      </div>
      {resource.loading ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><span>Opening the archive...</span></div></div>
      ) : resource.error ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><h1>Campuses unavailable</h1><p>{describeError(resource.error)}</p>{describeError(resource.error) !== resource.error.message && <p className={styles.detail}>{resource.error.message}</p>}<button className={`${styles.retry} clip-small`} onClick={resource.reload}>Retry</button></div></div>
      ) : resource.data.campuses.length === 0 ? (
        <div className={styles.state}><div className={`${styles.stateBox} clip-small`}><h1>No campuses</h1><p>No campuses available.</p></div></div>
      ) : (
        <div className={styles.grid}>
          {resource.data.campuses.map((campus) => (
            <Link className={`${styles.tile} clip-small`} key={campus.id} href={`/browse/${encodeURIComponent(campus.id)}`}>
              <span className={styles.name}>{campus.shortName}</span>
              <span className={styles.sub}>{campus.fullName}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
