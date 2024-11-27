import { SpotifyService } from './SpotifyService';
import { YoutubeService } from './YoutubeService';
import { SmsService } from './SmsService';
import { NotificationService } from './NotificationService';
import { MapsService } from './MapsService';
import { CalendarService } from './CalendarService';
import { ResendService } from './ResendService';
import { TextService } from './TextService';
import type { IDoc } from './types/types';
import { prompt as spotifyPlayPrompt } from './prompts/spotify/play';
import { OpenAIService } from './OpenAIService';
import type OpenAI from 'openai';
import { prompt as writeEmailPrompt } from './prompts/email/write';
import { prompt as navigationPrompt } from './prompts/map/navigation';
import { prompt as searchingPrompt } from './prompts/map/search';
import { v4 } from 'uuid';

interface AssistantServiceConfig {
  spotifyClientId: string;
  spotifyClientSecret: string;
  youtubeApiKey: string;
  smsApiToken: string;
  googleMapsApiKey: string;
  calendarClientId: string;
  calendarClientSecret: string;
  resendApiKey: string;
}

export class AssistantService {
  private textService: TextService;
  private spotifyService: SpotifyService;
  private youtubeService: YoutubeService;
  private smsService: SmsService;
  private notificationService: NotificationService;
  private mapsService: MapsService;
  private calendarService: CalendarService;
  private resendService: ResendService;
  private openaiService: OpenAIService;

  constructor(config: AssistantServiceConfig) {
    this.textService = new TextService();
    this.spotifyService = new SpotifyService(config.spotifyClientId, config.spotifyClientSecret);
    this.youtubeService = new YoutubeService(config.youtubeApiKey);
    this.smsService = new SmsService(config.smsApiToken);
    this.notificationService = new NotificationService();
    this.mapsService = new MapsService(config.googleMapsApiKey);
    this.calendarService = new CalendarService(
      config.calendarClientId,
      config.calendarClientSecret,
      'https://ai.overment.com/authorize'
    );
    this.resendService = new ResendService(config.resendApiKey);
    this.openaiService = new OpenAIService();
  }

  async playMusic(query: string, conversation_uuid: string): Promise<IDoc> {
    await this.spotifyService.initialize();
    
    const searchResults = await this.searchMusic(query, 5, false, conversation_uuid);
    
    if ((!searchResults.tracks || searchResults.tracks.items.length === 0) && 
        (!searchResults.playlists || searchResults.playlists.items.length === 0) &&
        (!searchResults.albums || searchResults.albums.items.length === 0)) {
      return this.textService.document(
        "No tracks, playlists, or albums found for the given query.",
        'gpt-4o',
        {
          uuid: v4(),
          name: "PlayMusicFailed",
          description: `Attempted to play music with query: "${query}". No results found.`,
          type: 'text',
          content_type: 'complete',
          source: 'spotify',
          conversation_uuid
        }
      );
    }
    
    const decision = await this.openaiService.completion({
      model: "gpt-4o",
      messages: [
        { role: "system", content: spotifyPlayPrompt({ results: JSON.stringify(searchResults) }) },
        { role: 'user', content: query }
      ],
      jsonMode: true
    }) as OpenAI.Chat.Completions.ChatCompletion;

    const spotifyURI = JSON.parse(decision.choices[0].message?.content || '{}');

    if (spotifyURI.result === 'no match') {
      return this.textService.document(
        "No suitable track, playlist, or album found for the given query.",
        'gpt-4o',
        {
          uuid: v4(),
          name: "PlayMusicFailed",
          description: `AI couldn't find a suitable match for query: "${query}".`,
          type: 'text',
          content_type: 'complete',
          source: 'spotify',
          conversation_uuid
        }
      );
    }

    try {
      const uriParts = spotifyURI.result.split(':');
      const contentType = uriParts[1];
      const contentId = uriParts[2];
      let content = '';

      switch (contentType) {
        case 'track':
          await this.spotifyService.playTrack(spotifyURI.result);
          const selectedTrack = searchResults.tracks.items.find(track => track.uri === spotifyURI.result);
          content = `Now playing: "${selectedTrack.name}" by ${selectedTrack.artists.map(a => a.name).join(', ')}\nTrack URI: ${selectedTrack.uri}\nAlbum: ${selectedTrack.album.name}\nDuration: ${Math.floor(selectedTrack.duration_ms / 1000)} seconds`;
          break;
        case 'playlist':
          await this.spotifyService.playPlaylist(spotifyURI.result);
          const playlist = await this.spotifyService.getPlaylist(contentId);
          content = `Now playing playlist: "${playlist.name}" by ${playlist.owner.display_name}\nPlaylist URI: ${playlist.uri}\nTracks: ${playlist.tracks.total}`;
          break;
        case 'album':
          // For albums, we'll play the first track of the album
          const album = await this.spotifyService.getAlbum(contentId);
          if (album.tracks.items.length > 0) {
            const firstTrackUri = album.tracks.items[0].uri;
            await this.spotifyService.playTrack(firstTrackUri);
            content = `Now playing album: "${album.name}" by ${album.artists.map(a => a.name).join(', ')}\nAlbum URI: ${album.uri}\nTracks: ${album.tracks.total}\nStarting with track: "${album.tracks.items[0].name}"`;
          } else {
            throw new Error("Album has no tracks");
          }
          break;
        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      return this.textService.document(
        content,
        'gpt-4o',
        {
          uuid: v4(),
          name: "PlayMusicSuccess",
          description: `Successfully played music for query: "${query}". ${content}`,
          type: 'text',
          content_type: 'complete',
          source: 'spotify',
          conversation_uuid
        }
      );
    } catch (error) {
      console.error(error);
      return this.textService.document(
        `Failed to play the selected content. Error: ${error.message}`,
        'gpt-4o',
        {
          uuid: v4(),
          name: "PlayMusicFailed",
          description: `Failed to play music for query: "${query}". Error occurred while trying to play the content.`,
          type: 'text',
          content_type: 'complete',
          source: 'spotify',
          conversation_uuid
        }
      );
    }
  }

  async searchMusic(query: string, limit: number = 5, format: boolean = false, conversation_uuid: string): Promise<any> {
    await this.spotifyService.initialize();
    const searchResults = await this.spotifyService.search(query, ['track', 'album', 'playlist'], limit);
    if (format) {
      return this.formatMusicSearchResults(searchResults, query, conversation_uuid);
    }
    return searchResults;
  }

  async speak(text: string, conversation_uuid: string): Promise<IDoc> {
    try {
      await this.notificationService.speak(text);
      
      return this.textService.document(
        `Successfully spoke the text: "${text}"`,
        'gpt-4o',
        {
          uuid: v4(),
          name: "SpeakSuccess",
          description: `Text-to-speech conversion successful for: "${text}"`,
          type: 'text',
          content_type: 'complete',
          source: 'notification',
          conversation_uuid
        }
      );
    } catch (error) {
      console.error(error);
      return this.textService.document(
        `Failed to speak the text. Error: ${error.message}`,
        'gpt-4o',
        {
          uuid: v4(),
          name: "SpeakFailed",
          description: `Failed to convert text to speech: "${text}". Error occurred during speech synthesis.`,
          type: 'text',
          content_type: 'complete',
          source: 'notification',
          conversation_uuid
        }
      );
    }
  }

  async sendMail(query: string, documents: IDoc[], conversation_uuid: string): Promise<IDoc> {
    const writing = await this.openaiService.completion({
      model: "gpt-4o",
      messages: [{ role: "system", content: writeEmailPrompt({ documents }) }, { role: 'user', content: query }],
      jsonMode: true
    }) as OpenAI.Chat.Completions.ChatCompletion;

    const email = JSON.parse(writing.choices[0].message?.content || '{}') as { subject: string, content: string };

    const htmlContent = await this.textService.markdownToHtml(email.content);

    await this.resendService.sendMessage({
      from: String(process.env.FROM_EMAIL),
      to: String(process.env.USER_EMAIL),
      subject: email.subject,
      text: email.content,
      html: htmlContent
    });

    return this.textService.document(
      `${email.subject}\n\n${email.content}`,
      'gpt-4o',
      {
        name: "SendEmailSuccess",
        description: `Successfully sent an email based on query: "${query}" with subject: "${email.subject}"`,
        type: 'text',
        content_type: 'complete',
        source: 'email',
        conversation_uuid
      }
    );
  }

  async directions(query: string, documents: IDoc[], conversation_uuid: string): Promise<IDoc> {
    const plan = await this.openaiService.completion({
      model: "gpt-4o",
      messages: [{ role: "system", content: navigationPrompt({ documents }) }, { role: 'user', content: query }],
      jsonMode: true
    }) as OpenAI.Chat.Completions.ChatCompletion;

    const { origin, destination, mode = 'driving' } = JSON.parse(plan.choices[0].message?.content || '{}');

    try {
      const directions = await this.mapsService.getDirections(origin, destination, mode);
      
      if (!directions) {
        return this.textService.document(
          `No directions found for the route from ${origin} to ${destination}.`,
          'gpt-4o',
          {
            uuid: v4(),
            name: "GetDirectionsNoResults",
            description: `No directions found for query: "${query}".`,
            type: 'text',
            content_type: 'complete',
            source: 'maps',
            conversation_uuid
          }
        );
      }

      const formattedDirections = `
Directions from ${directions.startAddress} to ${directions.endAddress}:
Total distance: ${directions.distance}
Estimated duration: ${directions.duration}
Route summary: ${directions.summary}

Step-by-step instructions:
${directions.steps.map((step: { instructions: string, distance: string, duration: string }, index: number) => 
  `${index + 1}. ${step.instructions} (${step.distance}, ${step.duration})`
).join('\n')}

${directions.warnings.length > 0 ? `Warnings: ${directions.warnings.join(', ')}` : ''}
      `.trim();

      return this.textService.document(
        formattedDirections,
        'gpt-4o',
        {
          name: "GetDirectionsSuccess",
          description: `Successfully fetched directions for query: "${query}".`,
          type: 'text',
          content_type: 'complete',
          source: 'maps',
          conversation_uuid
        }
      );
    } catch (error) {
      console.error("Error getting directions:", error);
      return this.textService.document(
        `Failed to get directions. Error: ${error.message}`,
        'gpt-4o',
        {
          name: "GetDirectionsFailed",
          description: `Failed to fetch directions for query: "${query}".`,
          type: 'text',
          content_type: 'complete',
          source: 'maps',
          conversation_uuid
        }
      );
    }
  }

  async searchPlace(query: string, documents: IDoc[], conversation_uuid: string): Promise<IDoc[]> {
    const searching = await this.openaiService.completion({
      model: "gpt-4o",
      messages: [{ role: "system", content: searchingPrompt({ documents }) }, { role: 'user', content: query }],
      jsonMode: true
    }) as OpenAI.Chat.Completions.ChatCompletion;

    const { queries } = JSON.parse(searching.choices[0].message?.content || '{}') as { queries: string[] };

    console.log(queries);

    const placePromises = queries.map(async (q) => {
      const places = await this.mapsService.findPlaceFromText(q);
      return Promise.all(places.map(async (place) => {
        if (!place.place_id) {
          return null;
        }
        const details = await this.mapsService.getPlaceDetails(place.place_id);
        return this.textService.document(
          JSON.stringify(details),
          'gpt-4o',
          {
            uuid: place.place_id,
            name: details.name,
            description: `This is a place found based on query: "${q}"`,
            type: 'place',
            content_type: 'complete',
            source: 'maps',
            conversation_uuid
          }
        );
      }));
    });

    const results = await Promise.all(placePromises);
    return results.flat().filter((doc): doc is IDoc => doc !== null);
  }

  private async formatMusicSearchResults(searchResults: any, query: string, conversation_uuid: string): Promise<IDoc> {
    if ((!searchResults.tracks || searchResults.tracks.items.length === 0) && 
        (!searchResults.playlists || searchResults.playlists.items.length === 0)) {
      return this.textService.document(
        "No tracks or playlists found for the given query.",
        'gpt-4o',
        {
          uuid: v4(),
          name: "SearchMusicNoResults",
          description: `Searched for music with query: "${query}". No results found.`,
          type: 'text',
          content_type: 'complete',
          source: 'spotify',
          conversation_uuid
        }
      );
    }
    
    let content = '';
    
    if (searchResults.tracks && searchResults.tracks.items.length > 0) {
      content += "Tracks:\n";
      searchResults.tracks.items.forEach((track, index) => {
        content += `${index + 1}. "${track.name}" by ${track.artists.map(a => a.name).join(', ')}\n`;
        content += `   Album: ${track.album.name}\n`;
        content += `   Duration: ${Math.floor(track.duration_ms / 1000)} seconds\n`;
        content += `   URI: ${track.uri}\n\n`;
      });
    }

    if (searchResults.albums && searchResults.albums.items.length > 0) {
      content += "Albums:\n";
      searchResults.albums.items.forEach((album, index) => {
        content += `${index + 1}. "${album.name}" by ${album.artists.map(a => a.name).join(', ')}\n`;
        content += `   URI: ${album.uri}\n\n`;
      });
    }
    
    if (searchResults.playlists && searchResults.playlists.items.length > 0) {
      content += "Playlists:\n";
      searchResults.playlists.items.forEach((playlist, index) => {
        content += `${index + 1}. "${playlist.name}" by ${playlist.owner.display_name}\n`;
        content += `   Tracks: ${playlist.tracks.total}\n`;
        content += `   URI: ${playlist.uri}\n\n`;
      });
    }

    return this.textService.document(
      content.trim(),
      'gpt-4o',
      {
        uuid: v4(),
        name: "SearchMusicResults",
        description: `Successfully searched for music with query: "${query}". Found ${searchResults.tracks?.items.length || 0} tracks and ${searchResults.playlists?.items.length || 0} playlists.`,
        type: 'text',
        content_type: 'complete',
        source: 'spotify',
        conversation_uuid
      }
    );
  }


  

}
