// Response contracts shared between apps/api and apps/web.
// apps/api compiles to CJS, so it must import these with `import type` only.

export interface CardSkill {
  name: string;
  value: number;
}

export interface CardDomainRank {
  domain: string | null;
  rank: string | null;
}

export interface CardBadge {
  name: string;
  receiptDate: string;
  iconUrl: string | null;
}

export interface CardPoints {
  prp: number;
  crp: number;
  coins: number;
}

export interface CardFeedback {
  punctuality: number | null;
  interest: number | null;
  thoroughness: number | null;
  friendliness: number | null;
}

export interface CardExpEntry {
  amount: number;
  date: string;
}

export interface CardProfile {
  login: string;
  className: string;
  parallelName: string;
  expValue: number;
  level: number;
  expToNextLevel: number;
  campusId: string;
  status: string;
  logtime: number | null;
  skills: CardSkill[];
  domainRank: CardDomainRank;
  badges: CardBadge[];
  points: CardPoints | null;
  feedback: CardFeedback | null;
  expHistory: CardExpEntry[];
}

// GET /api/me/card - served from the Postgres cache, so it carries freshness info.
export interface CardResponse extends CardProfile {
  lastSyncedAt: string;
  stale: boolean;
}

// GET /api/participants/:login - live proxy, never cached.
export type ParticipantSearchResponse = CardProfile;

export interface CampusDto {
  id: string;
  shortName: string;
  fullName: string;
}

export interface CoalitionDto {
  coalitionId: number;
  name: string;
}

export interface CampusListResponse {
  campuses: CampusDto[];
}

export interface CoalitionListResponse {
  coalitions: CoalitionDto[];
}

// Browse endpoints return logins only, not full profiles.
export interface ParticipantLoginsResponse {
  participants: string[];
}
