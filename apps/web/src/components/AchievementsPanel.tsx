import type { CardBadge } from "shared-types";
import { formatDate } from "@/lib/format";
import styles from "./AchievementsPanel.module.css";

export function AchievementsPanel({ badges }: { badges: CardBadge[] }) {
  const sorted = [...badges].sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
  return <section className={styles.panel}><div className={styles.heading}><div><p className={styles.kicker}>PROVEN RECORD</p><h2>Achievements</h2></div><span>{badges.length} earned</span></div>{sorted.length ? <div className={styles.grid}>{sorted.map((badge, index) => <article className={`${styles.badge} clip-small`} key={`${badge.name}-${badge.receiptDate}-${index}`}><h3>{badge.name}</h3><time>{formatDate(badge.receiptDate)}</time></article>)}</div> : <p className={styles.empty}>No achievements recorded yet.</p>}</section>;
}
