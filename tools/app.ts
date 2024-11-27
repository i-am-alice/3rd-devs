import express from 'express';
import { SpotifyService } from './SpotifyService';
import { CalendarService } from './CalendarService';
import { AssistantService } from './AssistantService';
import { YoutubeService } from './YoutubeService';

const app = express();
const port = 3000;

const assistantService = new AssistantService({
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID as string,
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
  youtubeApiKey: process.env.YOUTUBE_API_KEY as string,
  smsApiToken: process.env.SMSAPI_API_KEY as string,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY as string,
  calendarClientId: process.env.CALENDAR_CLIENT_ID as string,
  calendarClientSecret: process.env.CALENDAR_CLIENT_SECRET as string,
  resendApiKey: process.env.RESEND_API_KEY as string
});

const spotifyService = new SpotifyService(process.env.SPOTIFY_CLIENT_ID as string, process.env.SPOTIFY_CLIENT_SECRET as string);
const youtubeService = new YoutubeService(process.env.YOUTUBE_API_KEY as string);
const calendarService = new CalendarService(
  process.env.CALENDAR_CLIENT_ID as string,
  process.env.CALENDAR_CLIENT_SECRET as string,
  'https://ai.overment.com/authorize'
);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

async function main() {
  // const directions = await assistantService.directions(`I'm at Karmelicka, Kraków and want to get to the Warsaw.`, [], 'b5befc1f-5fb6-4473-a5a4-1395fdc6f968');
  // console.log(directions);
  // const place = await assistantService.searchPlace('Where is eduweb.pl?', [], 'b5befc1f-5fb6-4473-a5a4-1395fdc6f968');
  // console.log(JSON.stringify(place, null, 2));
  const result = await assistantService.playMusic('Nora En Pure, Pretoria', 'b5befc1f-5fb6-4473-a5a4-1395fdc6f968');
  console.log(result);
  // const text = await assistantService.speak('Hello', 'b5befc1f-5fb6-4473-a5a4-1395fdc6f968');
  // console.log(text);
  // const email = await assistantService.sendMail('Write an e-mail with a list of the most important mental models used by Elon Musk', [], 'b5befc1f-5fb6-4473-a5a4-1395fdc6f968');
  // console.log(email);
  // const searchResults = await assistantService.searchMusic("Play Purified Radio", 3, true, 'b5befc1f-5fb6-4473-a5a4-1395fdc6f968');
  // console.log(searchResults);

  // const transcript = await youtubeService.getVideoDetails('https://www.youtube.com/watch?v=TtFm9n3NVzE');
  // console.log(transcript.items[0].snippet);
}

main();

app.get('/google/auth', (req, res) => {
  const authUrl = calendarService.getAuthUrl();
  res.redirect(authUrl);
});

app.get('/authorize', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).send('Invalid code');
    return;
  }

  try {
    await calendarService.handleCallback(code);
    res.send('Authentication successful!');
  } catch (error) {
    console.error('Error during Google authentication:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/spotify/auth', (req, res) => {
  const authUrl = spotifyService.getAuthUrl();
  res.redirect(authUrl);
});

app.get('/spotify/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state) {
    res.status(400).send('State mismatch');
    return;
  }

  try {
    await spotifyService.callback(code as string);
    res.send('Authentication successful!');
  } catch (error) {
    res.status(500).send('Authentication failed');
  }
});