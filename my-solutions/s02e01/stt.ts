/**
 * 1. Use OpenAI Whisper API to transcribe audio from files inside "przesluchania" subdirectory
 * 2. Save transcribed text to files inside "transkrypcje" subdirectory with .md file extensions 
 * 
 */

import path from 'path';
import { OpenAiService } from '../lib/OpenAiService';

async function main() {
  try {
    // Create an instance of OpenAiService
    const openaiService = new OpenAiService();

    // Define paths relative to current script
    const currentDir = path.dirname(__filename);
    const inputDir = path.join(currentDir, 'przesluchania');
    const outputDir = path.join(currentDir, 'transkrypcje');

    console.log(`Starting audio transcription...`);
    console.log(`Input directory: ${inputDir}`);
    console.log(`Output directory: ${outputDir}`);

    // Transcribe all audio files in the input directory
    const results = await openaiService.transcribeAudio(inputDir, outputDir);

    // Print summary
    console.log(`\nTranscription complete!`);
    console.log(`Successfully transcribed ${results.length} files.`);
    
    results.forEach(result => {
      console.log(`- ${path.basename(result.audioFile)} → ${path.basename(result.transcriptionFile)}`);
    });
  } catch (error) {
    console.error('Error in transcription process:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);