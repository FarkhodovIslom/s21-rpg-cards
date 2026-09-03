import type {
  CardResponse,
  CampusListResponse,
  CoalitionListResponse,
  ParticipantLoginsResponse,
  ParticipantSearchResponse,
} from "shared-types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isServerError() {
    return this.status >= 500;
  }

  get isNotSynced() {
    return this.status === 404 && this.message.toLowerCase().includes("synced");
  }
}

export function describeError(error: ApiError): string {
  if (error.isNetworkError) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  if (error.isServerError) {
    return "School21 is not responding right now. Try again in a moment.";
  }
  return error.message;
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, { ...init, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Network request failed");
  }
  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    } catch {
      // Keep the HTTP status text when the API did not return JSON.
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export function getOwnCard() {
  return request<CardResponse>("/api/me/card");
}

export function searchParticipant(login: string) {
  return request<ParticipantSearchResponse>(
    `/api/participants/${encodeURIComponent(login)}`,
  );
}

export function getCampuses() {
  return request<CampusListResponse>("/api/campuses");
}

export function getCampusCoalitions(campusId: string) {
  return request<CoalitionListResponse>(
    `/api/campuses/${encodeURIComponent(campusId)}/coalitions`,
  );
}

export function getCoalitionParticipants(coalitionId: string) {
  return request<ParticipantLoginsResponse>(
    `/api/coalitions/${encodeURIComponent(coalitionId)}/participants`,
  );
}

export async function login(loginValue: string, password: string): Promise<void> {
  await request<{ success: true }>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginValue, password }),
  });
}
