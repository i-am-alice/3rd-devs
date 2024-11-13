import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from 'fs';
import path from 'path';

// Ensure the API key is set in the environment variables
if (!process.env.GOOGLE_AI_STUDIO_API_KEY) {
  throw new Error("GOOGLE_AI_STUDIO_API_KEY is not set in environment variables");
}

const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
const fileManager = new GoogleAIFileManager(apiKey);
const genAI = new GoogleGenerativeAI(apiKey);

async function uploadMediaFile(filePath: string, mimeType: string, displayName: string) {
  const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
  
  const stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the 2MB limit. Current size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
  }

  console.time('Upload File');
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName,
  });
  console.timeEnd('Upload File');
  return uploadResult;
}

async function waitForProcessing(fileName: string) {
  console.time('Processing File');
  let file = await fileManager.getFile(fileName);
  
  // Continuously check the file state until processing is complete
  while (file.state === FileState.PROCESSING) {
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 10_000)); // Wait for 10 seconds
    file = await fileManager.getFile(fileName);
  }
  
  console.timeEnd('Processing File');
  
  if (file.state === FileState.FAILED) {
    throw new Error("Media processing failed.");
  }

  return file;
}

async function generateContent(fileUri: string, mimeType: string): Promise<string> {
  console.time('Generate Content');
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = mimeType.startsWith("video") 
    ? "Analyze the content of this video." 
    : "Transcribe and summarize this audio. Write transcription and nothing else.";

  const result = await model.generateContent([
    prompt,
    {
      fileData: {
        fileUri: fileUri,
        mimeType: mimeType,
      },
    },
  ]);
  
  console.timeEnd('Generate Content');
  return result.response.text();
}

/**
 * Deletes the uploaded file from the Google AI service.
 * @param {string} fileName - The name of the file to delete.
 */
async function deleteUploadedFile(fileName: string) {
  console.time('Delete File');
  try {
    await fileManager.deleteFile(fileName);
    console.log(`Deleted uploaded file: ${fileName}`);
  } catch (error) {
    console.error(`Failed to delete file: ${fileName}`, error);
  }
  console.timeEnd('Delete File');
}


async function processMedia(filePath: string, mimeType: string, displayName: string) {
  // Upload the media file
  const uploadResult = await uploadMediaFile(filePath, mimeType, displayName);
  
  // Wait for the file to be processed
  const processedFile = await waitForProcessing(uploadResult.file.name);
  
  console.log(`Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`);
  
  // Generate transcription and summary or analysis
  const content = await generateContent(processedFile.uri, processedFile.mimeType);
  console.log(content);
  
  // Delete the uploaded file after processing
  await deleteUploadedFile(uploadResult.file.name);
}

// Example usage
const mediaFile = {
  path: path.join(__dirname, 'test.mp3'), // Change this to 'video.mp4' for video
  mimeType: 'audio/mp3', // Change this to 'video/mp4' for video
  displayName: 'Test', // Change this accordingly
};

// Execute the media processing workflow and handle any errors
processMedia(mediaFile.path, mediaFile.mimeType, mediaFile.displayName).catch(console.error);