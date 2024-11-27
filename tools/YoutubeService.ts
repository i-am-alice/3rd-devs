import { parse } from 'node-html-parser';

export class YoutubeService {
  private apiKey: string;
  private readonly USER_AGENT: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.USER_AGENT = this.generateUserAgent();
  }

  private generateUserAgent(): string {
    const browserVersions = ['91.0.4472.124', '92.0.4515.107', '93.0.4577.63'];
    const osVersions = ['10.15.7', '11.0.0', '11.2.3'];
    const randomBrowserVersion = browserVersions[Math.floor(Math.random() * browserVersions.length)];
    const randomOsVersion = osVersions[Math.floor(Math.random() * osVersions.length)];
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${randomOsVersion}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomBrowserVersion} Safari/537.36`;
  }

  async getVideoDetails(url: string): Promise<any> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${this.apiKey}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  private extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async getVideoTranscript(url: string, lang: string = 'en'): Promise<any[]> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: { 'User-Agent': this.USER_AGENT }
      });
      const pageContent = await response.text();

      const transcriptUrl = this.parseTranscriptEndpoint(pageContent, lang);

      if (!transcriptUrl) throw new Error('Failed to locate a transcript for this video!');

      const transcriptResponse = await fetch(transcriptUrl);
      const transcriptXML = parse(await transcriptResponse.text());

      const chunks = transcriptXML.getElementsByTagName('text');
      const transcript = chunks.map(chunk => ({
        start: parseFloat(chunk.getAttribute('start') || '0'),
        dur: parseFloat(chunk.getAttribute('dur') || '0'),
        text: chunk.textContent.trim()
      })).filter(item => item.start !== null && item.dur !== null);

      return transcript;
    } catch (e) {
      throw new Error(`[YoutubeTranscript] ${e.message}`);
    }
  }

  private parseTranscriptEndpoint(html: string, langCode: string): string | null {
    try {
      const root = parse(html);
      const scripts = root.getElementsByTagName('script');
      const playerScript = scripts.find((script) =>
        script.textContent?.includes('var ytInitialPlayerResponse = {')
      );

      const dataString = playerScript?.textContent?.split('var ytInitialPlayerResponse = ')?.[1]?.split('};')?.[0] + '}';

      if (!dataString) throw new Error('Could not find ytInitialPlayerResponse');

      const data = JSON.parse(dataString.trim());
      const availableCaptions = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

      let captionTrack = availableCaptions?.[0];
      if (langCode) {
        captionTrack =
          availableCaptions.find((track: any) => track.languageCode.includes(langCode)) ?? availableCaptions?.[0];
      }

      return captionTrack?.baseUrl || null;
    } catch (e) {
      console.error(`YoutubeService.parseTranscriptEndpoint ${e.message}`);
      return null;
    }
  }
}
