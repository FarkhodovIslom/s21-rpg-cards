import type { CardProfile } from "shared-types";
import { formatDate, formatXp } from "@/lib/format";
import styles from "./OverviewPanel.module.css";

function value(value: number | string | null | undefined) { return value === null || value === undefined || value === "" ? "—" : value; }

export function OverviewPanel({ data, campusName }: { data: CardProfile; campusName?: string }) {
  const feedback = data.feedback;
  return <div className={styles.grid}>
    <section className={`${styles.xp} clip-small`}><p className={styles.kicker}>OFFICIAL PROGRESS</p><div className={styles.xpLine}><strong>Level {data.level}</strong><span>{formatXp(data.expValue)} XP</span></div><p className={styles.next}>{formatXp(data.expToNextLevel)} XP to Level {data.level + 1}</p><div className={`${styles.track} clip-small`} aria-hidden="true"><span /></div></section>
    <section className={`${styles.panel} clip-small`}><h2>Identity</h2><dl>{[["Class", data.className], ["Parallel", data.parallelName], ["Campus", campusName ?? data.campusId], ["Status", data.status], ["Log time", data.logtime ? `${data.logtime} hours` : "No logged time this week"]].map(([label, item]) => <div key={label}><dt>{label}</dt><dd>{item}</dd></div>)}</dl></section>
    <section className={`${styles.panel} clip-small`}><h2>Points</h2><div className={styles.metrics}>{[["PRP", data.points?.prp], ["CRP", data.points?.crp], ["Coins", data.points?.coins]].map(([label, item]) => <div key={label}><strong>{value(item as number | undefined)}</strong><span>{label}</span></div>)}</div></section>
    <section className={`${styles.panel} clip-small`}><h2>Feedback</h2><div className={styles.metrics}>{[["Punctuality", feedback?.punctuality], ["Interest", feedback?.interest], ["Thoroughness", feedback?.thoroughness], ["Friendliness", feedback?.friendliness]].map(([label, item]) => <div key={label}><strong>{value(item as number | null | undefined)}</strong><span>{label}</span></div>)}</div></section>
    <section className={`${styles.panel} ${styles.activity} clip-small`}><h2>Recent activity</h2>{data.expHistory.length ? <ul>{data.expHistory.map((entry, index) => <li key={`${entry.date}-${index}`}><strong>+{formatXp(entry.amount)} XP</strong><time>{formatDate(entry.date)}</time></li>)}</ul> : <p className={styles.muted}>No recent XP activity.</p>}</section>
  </div>;
}
