// School21 Open API response types.
// Field spellings marked TODO(CP2-verify) are unverified against the live API.

export interface SchoolParticipant {
  login: string;
  className: string;
  parallelName: string;
  expValue: number;
  level: number;
  expToNextLevel: number;
  // TODO(CP2-verify): campus may arrive as an id string or an object
  campus: string | { id: string; name?: string };
  status: string;
}

// Verified against the live API: skill items carry `points`.
export interface SchoolSkill {
  name: string;
  points: number;
}

// Verified against the live API.
export interface SchoolBadge {
  name: string;
  receiptDateTime: string;
  iconUrl: string;
}

// TODO(CP2-verify): field casing
export interface SchoolPoints {
  PRP: number;
  CRP: number;
  Coins: number;
}

export interface SchoolFeedback {
  punctuality: number;
  interest: number;
  thoroughness: number;
  friendliness: number;
}

// TODO(CP2-verify): field names
export interface SchoolExpHistoryEntry {
  amount: number;
  date: string;
}

// TODO(CP2-verify): full shape
export interface SchoolCampus {
  id: string;
  name: string;
}

// TODO(CP2-verify): full shape
export interface SchoolCoalition {
  id: string;
  name: string;
}
