import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
  SchoolBadge,
  SchoolCampus,
  SchoolCoalition,
  SchoolExpHistoryEntry,
  SchoolFeedback,
  SchoolParticipant,
  SchoolPoints,
  SchoolSkill,
} from './types.js';

@Injectable()
export class School21ClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const baseUrl = this.configService.get<string>('SCHOOL21_API_BASE_URL');
    if (!baseUrl) {
      throw new Error('SCHOOL21_API_BASE_URL is not configured');
    }
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, accessToken: string): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data;
    } catch (error) {
      // Normalized error: never leak the AxiosError (config/headers/body) — CP1 security lesson
      const status =
        error instanceof AxiosError ? error.response?.status : undefined;
      throw new Error(
        `School21 API request failed: GET ${path} (${status ?? 'network error'})`,
      );
    }
  }

  async getParticipant(
    login: string,
    accessToken: string,
  ): Promise<SchoolParticipant> {
    return this.request<SchoolParticipant>(
      `/participants/${login}`,
      accessToken,
    );
  }

  async getSkills(login: string, accessToken: string): Promise<SchoolSkill[]> {
    const response = await this.request<{ skills: SchoolSkill[] }>(
      `/participants/${login}/skills`,
      accessToken,
    );
    return response.skills;
  }

  async getBadges(login: string, accessToken: string): Promise<SchoolBadge[]> {
    const response = await this.request<{ badges: SchoolBadge[] }>(
      `/participants/${login}/badges`,
      accessToken,
    );
    return response.badges;
  }

  async getPoints(login: string, accessToken: string): Promise<SchoolPoints> {
    return this.request<SchoolPoints>(
      `/participants/${login}/points`,
      accessToken,
    );
  }

  async getFeedback(
    login: string,
    accessToken: string,
  ): Promise<SchoolFeedback> {
    return this.request<SchoolFeedback>(
      `/participants/${login}/feedback`,
      accessToken,
    );
  }

  async getLogtime(login: string, accessToken: string): Promise<number> {
    const body = await this.request<number>(
      `/participants/${login}/logtime`,
      accessToken,
    );
    if (typeof body !== 'number' || !Number.isFinite(body)) {
      throw new Error(
        `Unexpected /logtime response for ${login}: expected raw number`,
      );
    }
    return body;
  }

  async getExperienceHistory(
    login: string,
    accessToken: string,
  ): Promise<SchoolExpHistoryEntry[]> {
    const response = await this.request<{
      expHistory: SchoolExpHistoryEntry[];
    }>(`/participants/${login}/experience-history`, accessToken);
    return response.expHistory;
  }

  async getCampuses(accessToken: string): Promise<SchoolCampus[]> {
    const response = await this.request<{ campuses: SchoolCampus[] }>(
      '/campuses',
      accessToken,
    );
    return response.campuses;
  }

  async getCampusCoalitions(
    campusId: string,
    accessToken: string,
  ): Promise<SchoolCoalition[]> {
    const response = await this.request<{ coalitions: SchoolCoalition[] }>(
      `/campuses/${campusId}/coalitions`,
      accessToken,
    );
    return response.coalitions;
  }

  // Browse endpoints return logins only, not full participant objects.
  async getCampusParticipants(
    campusId: string,
    accessToken: string,
  ): Promise<string[]> {
    const response = await this.request<{ participants: string[] }>(
      `/campuses/${campusId}/participants`,
      accessToken,
    );
    return response.participants;
  }

  async getCoalitionParticipants(
    coalitionId: string,
    accessToken: string,
  ): Promise<string[]> {
    const response = await this.request<{ participants: string[] }>(
      `/coalitions/${coalitionId}/participants`,
      accessToken,
    );
    return response.participants;
  }
}
