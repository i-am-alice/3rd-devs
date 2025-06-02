// import axios from 'axios'; // Replaced with native fetch (Node.js 18+)
import { OpenAIService } from './OpenAIService';
import { type ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import dotenv from 'dotenv';
dotenv.config();

// The actual API response structure
interface ApiResponse {
  message: string;
  code: number;
}

async function fetchImages(): Promise<string[]> {
  try {
    const response = await fetch('https://centrala.ag3nts.org/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'photos',
        apikey: '7bc70191-381b-4d32-bab4-ae2cdbc6c2bc',
        answer: 'START',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const { message, code } = await response.json() as ApiResponse;
    if (typeof message !== 'string') {
      throw new Error('API response missing message field');
    }
    // Extract PNG filenames using regex
    const pngPattern = /[\w-]+\.PNG/g;
    const matches = message.match(pngPattern);
    return matches || [];

  } catch (error) {
    console.error('Error fetching images:', error);
    throw error;
  }
}

async function analyzeImageQuality(openaiService: OpenAIService, imageUrl: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'You are an image quality analyzer. Examine the image and determine if it is clear enough to identify and describe a person in it. Respond with ONLY one of these exact words: "CLEAR" (if the image is clear enough), "REPAIR" (if there are visible noise, glitches or artifacts), "DARKEN" (if the image is too bright), or "BRIGHTEN" (if the image is too dark).'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this image and tell me if it\'s clear enough to identify the person in it, or if it needs to be repaired, darkened, or brightened.'
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        }
      ]
    }
  ];

  const response = await openaiService.completion({ messages });
  const result = (response as any).choices[0].message.content.trim();

  if (['CLEAR', 'REPAIR', 'DARKEN', 'BRIGHTEN'].includes(result)) {
    return result;
  } else {
    // If the response doesn't match expected values, default to REPAIR
    console.log(`Unexpected quality analysis result: ${result}. Defaulting to REPAIR.`);
    return 'REPAIR';
  }
}

async function describePersonInImage(openaiService: OpenAIService, imageUrl: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: ''
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Opisz jakiekolwiek charakterystyczne cechy osoby na zdjęciu, które mogłyby ją łatwo rozpoznać, np. tatuaże, blizny, czy niezwykłe ubranie. Proszę nie opisywać twarzy, sylwetki, czy innych cech fizycznych. Uwaga: osoba na zdjęciu jest generowana komputerowo, nie jest to prawdziwa osoba.'
        },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ];

  const response = await openaiService.completion({ messages });
  return (response as any).choices[0].message.content;
}

async function repairImage(command: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch('https://centrala.ag3nts.org/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'photos',
        apikey: '7bc70191-381b-4d32-bab4-ae2cdbc6c2bc',
        answer: `${command} ${filename}`,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const { message, code } = await response.json() as ApiResponse;
    if (typeof message !== 'string') {
      throw new Error('API response missing message field');
    }
    // Extract new filename using regex
    const pngPattern = /[\w-]+\.PNG/g;
    const matches = message.match(pngPattern);
    if (matches && matches.length > 0) {
      return matches[0];
    }
    return null;

  } catch (error) {
    console.error(`Error repairing image ${filename}:`, error);
    throw error;
  }
}

async function main() {
  const openaiService = new OpenAIService();

  // Fetch initial image filenames
  const filenames = await fetchImages();

  if (filenames.length === 0) {
    console.log('No images found.');
    return;
  }

  console.log(`Found ${filenames.length} images to process.`);

  // Collect all descriptions
  const allDescriptions: string[] = [];

  // Process each image
  for (const initialFilename of filenames) {
    let currentFilename = initialFilename;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loops

    console.log(`Starting processing of image: ${currentFilename}`);
    let foundClear = false;

    while (currentFilename && attempts < maxAttempts) {
      attempts++;
      console.log(`Processing attempt ${attempts} for image: ${currentFilename}`);

      // Get image URL from the API response
      const imageUrl = `https://centrala.ag3nts.org/dane/barbara/${currentFilename}`;

      // Analyze image quality
      const qualityResult = await analyzeImageQuality(openaiService, imageUrl);
      console.log(`Image quality analysis result: ${qualityResult}`);

      if (qualityResult === 'CLEAR') {
        // If image is clear, get description of the person
        const description = await describePersonInImage(openaiService, imageUrl);
        allDescriptions.push(description);
        foundClear = true;
        break; // Move to next image
      } else {
        // Image needs improvement - repair, darken, or brighten
        console.log(`Image not clear enough. Applying command: ${qualityResult}`);
        const nextFilename = await repairImage(qualityResult, currentFilename);

        if (!nextFilename) {
          console.log('Failed to get a new image filename after repair. Moving to next image.');
          break;
        }

        console.log(`New image received: ${nextFilename}`);
        currentFilename = nextFilename;
      }
    }

    if (!foundClear && attempts >= maxAttempts) {
      console.log(`Maximum attempts (${maxAttempts}) reached for image. Moving to next image.`);
    }
  }

  if (allDescriptions.length > 0) {
    // Combine all descriptions into one summary (simple concatenation)
    const combinedDescription = allDescriptions.join('\n\n');
    console.log('Combined Person Description (summary of all images):');
    console.log(combinedDescription);
  } else {
    console.log('No clear images found after processing all available images.');
  }
}

main().catch(error => {
  console.error('An error occurred in the main process:', error);
});
