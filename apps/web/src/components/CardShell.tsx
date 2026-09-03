"use client";

import { KeyboardEvent, useState } from "react";
import type { CardProfile } from "shared-types";
import { formatRelative } from "@/lib/format";
import { prestigeStars, tierForLevel } from "@/lib/design";
import { useCampusName } from "@/lib/useCampusName";
import { OverviewPanel } from "./OverviewPanel";
import { StatsPanel } from "./StatsPanel";
import { AchievementsPanel } from "./AchievementsPanel";
import styles from "./CardShell.module.css";

type Tab = "overview" | "stats" | "achievements";
const tabs: { id: Tab; label: string }[] = [{ id: "overview", label: "Overview" }, { id: "stats", label: "Stats" }, { id: "achievements", label: "Achievements" }];

type CardShellData = CardProfile & { stale?: boolean; lastSyncedAt?: string };

export function CardShell({ data, guest = false }: { data: CardShellData; guest?: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const tier = tierForLevel(data.level);
  const prestige = prestigeStars(data.expValue);
  const domainRank = data.domainRank.domain && data.domainRank.rank
    ? `${data.domainRank.domain} · ${data.domainRank.rank}`
    : "Unclassified";
  const campusName = useCampusName(data.campusId);

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const next = (tabs.findIndex((tab) => tab.id === activeTab) + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[next].id);
    document.getElementById(`tab-${tabs[next].id}`)?.focus();
  }

  return <main className={styles.page}>
    <section className={`${styles.frame} ${tier.className} clip-outer`}>
      <div className={`${styles.inner} clip-inner`}>
        {guest && <div className={styles.guestBanner} role="note">LIVE SCHOOL21 DATA · READ-ONLY</div>}
        <header className={styles.header}>
          <div><p className={styles.overline}>SCHOOL 21 // STAT CARD</p><h1>{data.login}</h1><p className={styles.subline}>{data.className} <span>·</span> {data.parallelName}</p><p className={styles.domainLine}><span className={styles.domainLabel}>Domain // Rank</span><span className={styles.domainValue}>{domainRank}</span></p></div>
          <div className={styles.levelMark}><span>LEVEL</span><strong>{data.level}</strong><small>{tier.label}</small>{data.level >= 21 && <small className={styles.prestige}>Prestige {prestige.stars}{prestige.overflow > 0 && ` +${prestige.overflow}`}</small>}</div>
        </header>
        {data.stale && data.lastSyncedAt && <div className={styles.stale} role="status">Data last synced {formatRelative(data.lastSyncedAt)} ({new Date(data.lastSyncedAt).toLocaleString()}) — refreshes automatically.</div>}
        <nav className={styles.tabs} role="tablist" aria-label="Card sections">{tabs.map((tab) => <button key={tab.id} id={`tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={moveTab}>{tab.label}</button>)}</nav>
        <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>{activeTab === "overview" && <OverviewPanel data={data} campusName={campusName} />}{activeTab === "stats" && <StatsPanel skills={data.skills} />}{activeTab === "achievements" && <AchievementsPanel badges={data.badges} />}</div>
      </div>
    </section>
  </main>;
}
