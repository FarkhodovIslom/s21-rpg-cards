import type { CardSkill } from "shared-types";
import { SkillRadar } from "./SkillRadar";
import styles from "./StatsPanel.module.css";

export function StatsPanel({ skills }: { skills: CardSkill[] }) {
  const sorted = [...skills].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value ?? 0;
  return <section className={styles.panel}><div className={styles.heading}><div><p className={styles.kicker}>RAW SCHOOL 21 SKILLS</p><h2>Attributes</h2></div><span>{skills.length} skills</span></div><SkillRadar skills={sorted} /><div className={styles.bars}>{sorted.length ? sorted.map((skill, index) => <div className={styles.barRow} key={`${skill.name}-${index}`}><div className={styles.label}><span>{skill.name}</span><strong>{skill.value}</strong></div><div className={`${styles.track} clip-small`}><i style={{ width: `${max ? (skill.value / max) * 100 : 0}%` }} /></div></div>) : <p className={styles.empty}>No skills recorded yet.</p>}</div></section>;
}
