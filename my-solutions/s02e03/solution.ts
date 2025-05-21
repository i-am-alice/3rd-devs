/**
 * 1. Send a GET request to the following URL: https://centrala.ag3nts.org/data/7bc70191-381b-4d32-bab4-ae2cdbc6c2bc/robotid.json
 * 2. The response body will contain a JSON object with a single property: description
 * 3. Use the description in a prompt for dall-e from OpenAi. Add a method to generate the image to OpenAiService beforehand (using dall-e model and OpenAi library)
 * 4. save generated image to the file
 */

import { OpenAiService } from '../lib/OpenAiService';
import fs from 'fs';
import path from 'path';
import https from 'https';

interface RobotDescription {
  description: string;
}

// Function to fetch the robot description from the API
async function fetchRobotDescription(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = 'https://centrala.ag3nts.org/data/7bc70191-381b-4d32-bab4-ae2cdbc6c2bc/robotid.json';
    
    https.get(url, (res) => {
      let data = '';
      
      // Process the data as it comes in
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // When all data is received
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data) as RobotDescription;
          resolve(jsonData.description);
        } catch (error) {
          reject(`Error parsing JSON: ${error}`);
        }
      });
    }).on('error', (error) => {
      reject(`Error fetching data: ${error.message}`);
    });
  });
}

// Function to download an image from a URL
async function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      
      // Create output directory if it doesn't exist
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create a write stream to save the image
      const fileStream = fs.createWriteStream(outputPath);
      
      // Pipe the HTTP response to the file stream
      res.pipe(fileStream);
      
      // Handle completion and errors
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      
      fileStream.on('error', (error) => {
        fs.unlinkSync(outputPath); // Delete the file if there's an error
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Main function to execute the process
async function main() {
  try {
    // 1 & 2. Fetch the robot description
    console.log('Fetching robot description...');
    const description = await fetchRobotDescription();
    console.log(`Description: ${description}`);
    
    // 3. Generate an image using DALL-E
    console.log('Generating image with DALL-E...');
    const openAiService = new OpenAiService();
    const imageUrl = await openAiService.generateImage(
      description,
      'dall-e-3',
      '1024x1024',
      'standard'
    );
    
    if (!imageUrl) {
      throw new Error('Failed to generate image: No URL returned');
    }
    
    console.log(`Image generated: ${imageUrl}`);
    
    // 4. Save the image to a file
    const outputDir = path.join(__dirname, 'generated');
    const outputFile = path.join(outputDir, 'robot-image.png');
    
    console.log(`Downloading and saving image to ${outputFile}...`);
    await downloadImage(imageUrl, outputFile);
    
    console.log('Process completed successfully!');
    console.log(`Image saved to: ${outputFile}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Execute the main function
main();