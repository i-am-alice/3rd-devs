import { SpotifyApi, type AccessToken } from "@spotify/web-api-ts-sdk";
import fs from 'fs/promises';
import crypto from 'crypto';

export class SpotifyService {
  private api: SpotifyApi;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string) {
    if (!clientId || !clientSecret) {
      throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in environment variables');
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = 'https://ai.overment.com/spotify/callback';
  }

  async initialize() {
    const accessToken = await this.getAccessToken();
    this.api = SpotifyApi.withAccessToken(this.clientId, accessToken);
  }

  async search(query: string, types: Array<'album' | 'artist' | 'playlist' | 'track'>, limit: number = 5) {
    return this.api.search(query, types, undefined, limit);
  }

  async searchTracks(query: string, limit = 20) {
    return this.api.search(query, ['track'], undefined, limit);
  }

  async getPlayerStatus() {
    return this.api.player.getPlaybackState();
  }

  async getTrackInfo(trackUri: string) {
    return this.api.tracks.get(trackUri);
  }

  async playTrack(uri: string) {
    const devices = await this.api.player.getAvailableDevices();
    if (devices.devices.length === 0) {
      console.error('no devices found');
      throw new Error('No active devices found');
    }
    
    const activeDevice = devices.devices.find(device => device.is_active);
    const deviceId = activeDevice ? activeDevice.id : devices.devices[0].id;

    if (!deviceId) {
      console.error('no active device found');
      throw new Error('No active device found');
    }
    
    const isPlaylist = uri.startsWith('spotify:playlist:');
    
    if (isPlaylist) {
      return this.api.player.startResumePlayback(deviceId, uri);
    } else {
      return this.api.player.startResumePlayback(deviceId, undefined, [uri]);
    }
  }

  async playPlaylist(playlistUri: string, deviceId?: string, positionMs?: number) {
    const devices = await this.api.player.getAvailableDevices();
    if (devices.devices.length === 0) {
      throw new Error('No active devices found');
    }
    
    const targetDevice = deviceId || devices.devices.find(device => device.is_active)?.id || devices.devices[0].id;

    if (!targetDevice) {
      throw new Error('No active device found');
    }
    
    return this.api.player.startResumePlayback(
      targetDevice,
      playlistUri,
      undefined,
      undefined,
      positionMs
    );
  }

  async getAvailableDevices() {
    return this.api.player.getAvailableDevices();
  }

  private async getAccessToken(): Promise<AccessToken> {
    const access_token = process.env.SPOTIFY_ACCESS_TOKEN;
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
    const expires_in = parseInt(process.env.SPOTIFY_TOKEN_EXPIRY || '0', 10);

    if (!access_token || !refresh_token || Date.now() + 60000 > expires_in) {
      const refreshedTokens = await this.refreshAccessToken(refresh_token || '');
      await this.saveTokens(refreshedTokens.access_token, refreshedTokens.refresh_token || refresh_token || '', refreshedTokens.expires_in);
      
      return {
        access_token: refreshedTokens.access_token,
        token_type: "Bearer",
        expires_in: refreshedTokens.expires_in,
        expires: Date.now() + refreshedTokens.expires_in * 1000,
        refresh_token: refreshedTokens.refresh_token || refresh_token || ''
      };
    }

    return {
      access_token,
      token_type: "Bearer",
      expires_in: Math.floor((expires_in - Date.now()) / 1000),
      expires: expires_in,
      refresh_token: refresh_token
    };
  }

  private async refreshAccessToken(refresh_token: string) {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    return response.json();
  }

  private async saveTokens(access_token: string, refresh_token: string, expires_in: number) {
    process.env.SPOTIFY_ACCESS_TOKEN = access_token;
    process.env.SPOTIFY_REFRESH_TOKEN = refresh_token;
    process.env.SPOTIFY_TOKEN_EXPIRY = (Date.now() + expires_in * 1000).toString();

    // Read current .env file
    let envContent = await fs.readFile('.env', 'utf-8').catch(() => '');

    // Update or add new variables
    const updateEnvVariable = (name: string, value: string) => {
      const regex = new RegExp(`^${name}=.*`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${name}=${value}`);
      } else {
        envContent += `\n${name}=${value}`;
      }
    };

    updateEnvVariable('SPOTIFY_ACCESS_TOKEN', access_token);
    updateEnvVariable('SPOTIFY_REFRESH_TOKEN', refresh_token);
    updateEnvVariable('SPOTIFY_TOKEN_EXPIRY', (Date.now() + expires_in * 1000).toString());

    // Write updated content back to .env file
    await fs.writeFile('.env', envContent.trim() + '\n');
  }

  getAuthUrl(): string {
    const state = crypto.randomBytes(16).toString('hex');
    const scope = 'user-read-playback-state user-modify-playback-state';

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('state', state);

    return authUrl.toString();
  }

  async callback(code: string): Promise<void> {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const { access_token, refresh_token, expires_in } = await response.json();

    await this.saveTokens(access_token, refresh_token, expires_in);
  }

  async getAlbum(albumId: string) {
    await this.initialize();
    return this.api.albums.get(albumId);
  }

  async getPlaylist(playlistId: string) {
    await this.initialize();
    return this.api.playlists.getPlaylist(playlistId);
  }
}
