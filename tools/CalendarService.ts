import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs/promises';
import dotenv from 'dotenv';

export class CalendarService {
  private auth: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  getAuthUrl(): string {
    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      redirect_uri: 'https://ai.overment.com/authorize'
    });
  }

  async authenticate() {
    const tokens = await this.loadTokens();
    if (tokens) {
      this.auth.setCredentials(tokens);
    } else {
      throw new Error('No tokens available. Please authenticate first.');
    }
  }

  async handleCallback(code: string) {
    const { tokens } = await this.auth.getToken(code);
    this.auth.setCredentials(tokens);
    await this.saveTokens(tokens);
  }

  async createEvent(event: calendar_v3.Schema$Event) {
    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return response.data;
  }

  async updateEvent(eventId: string, event: calendar_v3.Schema$Event) {
    const response = await this.calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
    });
    return response.data;
  }

  async searchEvents(query: string) {
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      q: query,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.data.items;
  }

  private async loadTokens() {
    dotenv.config();
    const access_token = process.env.GOOGLE_ACCESS_TOKEN;
    const refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
    const expiry_date = process.env.GOOGLE_TOKEN_EXPIRY;

    if (access_token && refresh_token && expiry_date) {
      return {
        access_token,
        refresh_token,
        expiry_date: parseInt(expiry_date, 10),
      };
    }
    return null;
  }

  private async saveTokens(tokens: any) {
    let envContent = await fs.readFile('.env', 'utf-8').catch(() => '');

    const updateEnvVariable = (name: string, value: string) => {
      const regex = new RegExp(`^${name}=.*`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${name}=${value}`);
      } else {
        envContent += `\n${name}=${value}`;
      }
    };

    updateEnvVariable('GOOGLE_ACCESS_TOKEN', tokens.access_token);
    updateEnvVariable('GOOGLE_REFRESH_TOKEN', tokens.refresh_token || '');
    updateEnvVariable('GOOGLE_TOKEN_EXPIRY', tokens.expiry_date?.toString() || '');

    await fs.writeFile('.env', envContent.trim() + '\n');

    // Update process.env
    process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token || '';
    process.env.GOOGLE_TOKEN_EXPIRY = tokens.expiry_date?.toString() || '';
  }
}
