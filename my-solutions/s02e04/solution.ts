import fs from 'fs';
import path from 'path';
import { OpenAiService } from '../lib/OpenAiService';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

type FileInfo = {
    name: string;
    content: Buffer;
    extension: string;
};

/**
 * Gets all files from the source directory
 * @returns An array of objects containing filename and content
 */
async function getAllSourceFiles(): Promise<FileInfo[]> {
    const sourceDir = path.join(__dirname, './source');
    const validExtensions = ['.mp3', '.txt', '.png'];
    const files: FileInfo[] = [];

    // Create source directory if it doesn't exist
    if (!fs.existsSync(sourceDir)) {
        fs.mkdirSync(sourceDir, { recursive: true });
        console.log(`Created source directory at ${sourceDir}`);
        return files;
    }

    // Read all files in the directory
    const fileNames = fs.readdirSync(sourceDir);

    for (const fileName of fileNames) {
        const filePath = path.join(sourceDir, fileName);
        const fileExt = path.extname(fileName).toLowerCase();

        // Check if it's a file and has a valid extension
        if (fs.statSync(filePath).isFile() && validExtensions.includes(fileExt)) {
            const content = fs.readFileSync(filePath);
            files.push({
                name: fileName,
                content,
                extension: fileExt
            });
        }
    }

    return files;
}

/**
 * Classifies a file as 'people', 'hardware', or 'unknown'
 * @param file Object containing file name and content
 * @returns The category of the file: 'people', 'hardware', or 'unknown'
 */
async function classifyFile(file: FileInfo): Promise<'people' | 'hardware' | 'unknown'> {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
        console.error('Error: OPENAI_API_KEY is not set in environment variables');
        console.error('Please set your OpenAI API key in the .env file or provide it as an environment variable');
        // For demo purposes, return a dummy classification based on filename
        if (file.name.includes('person') || file.name.includes('people') || file.name.includes('interview')) {
            return 'people';
        } else if (file.name.includes('hardware') || file.name.includes('device') || file.name.includes('sektor')) {
            return 'hardware';
        } else {
            return 'unknown';
        }
    }

    const openAiService = new OpenAiService();
    let textContent: string;

    // For MP3 files, first transcribe using OpenAI's Whisper
    if (file.extension === '.mp3') {
        // Create temporary directories for transcription
        const tempInputDir = path.join(__dirname, 'temp_input');
        const tempOutputDir = path.join(__dirname, 'temp_output');

        if (!fs.existsSync(tempInputDir)) {
            fs.mkdirSync(tempInputDir, { recursive: true });
        }

        // Write the audio file to temp directory
        const tempFilePath = path.join(tempInputDir, file.name);
        fs.writeFileSync(tempFilePath, file.content);

        // Transcribe the audio
        const transcriptionResults = await openAiService.transcribeAudio(tempInputDir, tempOutputDir);
        const transcription = transcriptionResults.find(r => path.basename(r.audioFile) === file.name);

        if (!transcription) {
            console.error(`Failed to transcribe ${file.name}`);
            return 'unknown';
        }

        textContent = transcription.text;

        // Clean up temp files
        try {
            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(transcription.transcriptionFile);
        } catch (error) {
            console.error('Error cleaning up temporary files:', error);
        }
    } else if (file.extension === '.txt') {
        // For text files, use the content directly
        textContent = file.content.toString('utf-8');
    } else if (file.extension === '.png') {
        // For PNG images, we'll use the image buffer directly with GPT-4o-mini
        // We'll still set textContent as the filename for the text part of the query
        textContent = file.name;
    } else {
        console.error(`Unsupported file type: ${file.extension}`);
        return 'unknown';
    }

    // Prepare the prompt for classification
    const systemPrompt = `You are a classifier that categorizes content into exactly one of these categories: 'people', 'hardware', or 'unknown'. 
    - 'people' category includes content about individuals, personal stories, conversations, or human-related topics.
    - 'hardware' category includes content about electronic devices, technical equipment, components, or machinery.
    - 'unknown' should be used when the content doesn't clearly fit either the 'people' or 'hardware' categories.
    
    Respond with ONLY ONE WORD: either 'people', 'hardware', or 'unknown'.`;

    // Send to OpenAI for classification
    let classification: string;
    if (file.extension === '.png') {
        // For PNG files, pass the image buffer as well
        classification = await openAiService.askGptO4Mini(systemPrompt, textContent, 1024, file.content, 'png');
    } else {
        // For text and audio files, use the text-only method
        classification = await openAiService.askGptO4Mini(systemPrompt, textContent, 1024);
    }

    // Parse and validate the response
    const normalizedClassification = classification.toLowerCase().trim();

    if (normalizedClassification === 'people') {
        return 'people';
    } else if (normalizedClassification === 'hardware') {
        return 'hardware';
    } else {
        return 'unknown';
    }
}

(async function () {
    try {
        const categoriesToFilesMap: { people: string[]; hardware: string[] } = {
            people: [],
            hardware: []
        }

        console.log('Reading source files...');
        const sourceFiles = await getAllSourceFiles();
        console.log(`Found ${sourceFiles.length} files to process`);

        for (const file of sourceFiles) {
            console.log(`Classifying file: ${file.name}`);
            try {
                const category = await classifyFile(file);
                console.log(`File ${file.name} classified as: ${category}`);
                if (category !== 'unknown') {
                    categoriesToFilesMap[category].push(file.name);
                }
            } catch (error) {
                console.error(`Error classifying file ${file.name}:`, error);
            }
        }

        console.log('\nClassification results:');
        console.log(JSON.stringify(categoriesToFilesMap));
    } catch (error) {
        console.error('An error occurred during execution:', error);
    }
})();

// Instructions for setting up:
// 1. Create a .env file in the project root
// 2. Add your OpenAI API key: OPENAI_API_KEY=your_api_key_here
// 3. Run the solution with: npx ts-node solution.ts