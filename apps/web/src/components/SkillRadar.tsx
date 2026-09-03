import type { CardSkill } from "shared-types";
import styles from "./SkillRadar.module.css";

function point(index: number, count: number, radius: number, center: number) { const angle = (Math.PI * 2 * index) / count - Math.PI / 2; return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius]; }
function polygon(count: number, radius: number, center: number) { return Array.from({ length: count }, (_, index) => point(index, count, radius, center).join(",")).join(" "); }

export function SkillRadar({ skills }: { skills: CardSkill[] }) {
  if (skills.length < 3) return null;
  const top = skills.slice(0, 8); const max = Math.max(...top.map((skill) => skill.value), 0); const center = 150; const radius = 105;
  const valuePolygon = top.map((skill, index) => point(index, top.length, max ? radius * (skill.value / max) : 0, center).join(",")).join(" ");
  return <div className={styles.wrap}><svg viewBox="0 0 300 300" role="img" aria-label="Skill radar chart">{[.25, .5, .75, 1].map((scale) => <polygon key={scale} points={polygon(top.length, radius * scale, center)} className={styles.ring} />)}{top.map((skill, index) => { const [x, y] = point(index, top.length, radius, center); return <line key={`${skill.name}-${index}`} x1={center} y1={center} x2={x} y2={y} className={styles.axis} />; })}<polygon points={valuePolygon} className={styles.value} />{top.map((skill, index) => { const [x, y] = point(index, top.length, radius + 18, center); return <text key={`${skill.name}-${index}`} x={x} y={y} textAnchor="middle" className={styles.label}>{skill.name}</text>; })}</svg></div>;
}
