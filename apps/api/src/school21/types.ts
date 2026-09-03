// School21 Open API response types.
// Field spellings marked TODO(CP2-verify) are unverified against the live API.

export interface SchoolParticipant {
  login: string;
  className: string;
  parallelName: string;
  expValue: number;
  level: number;
  expToNextLevel: number;
  // Verified against the live API + OpenAPI ParticipantV1DTO: campus is an
  // object (ParticipantCampusV1DTO), not a bare id string.
  campus: SchoolParticipantCampus;
  status: string;
}

export interface SchoolParticipantCampus {
  id: string;
  shortName: string;
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

// Verified against the live API + OpenAPI ParticipantPointsV1DTO.
export interface SchoolPoints {
  peerReviewPoints: number;
  codeReviewPoints: number;
  coins: number;
}

// Verified against the live API + OpenAPI ParticipantFeedbackV1DTO.
// All fields are nullable: a user with no peer-reviews returns null for all.
export interface SchoolFeedback {
  averageVerifierPunctuality: number | null;
  averageVerifierInterest: number | null;
  averageVerifierThoroughness: number | null;
  averageVerifierFriendliness: number | null;
}

// Verified against the live API + OpenAPI ParticipantXpHistoryItemV1DTO.
export interface SchoolExpHistoryEntry {
  expValue: number;
  accrualDateTime: string;
}

// Verified against the OpenAPI spec: GET /campuses returns { campuses: [...] }.
export interface SchoolCampus {
  id: string;
  shortName: string;
  fullName: string;
}

// Verified against the OpenAPI spec: GET /campuses/{id}/coalitions returns
// { coalitions: [...] } and the id field is `coalitionId`, not `id`.
export interface SchoolCoalition {
  coalitionId: number;
  name: string;
}
