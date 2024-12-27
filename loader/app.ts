import { FileService } from './FileService';
import { OpenAIService } from './OpenAIService';

const fileService = new FileService();
const openaiService = new OpenAIService();

// Usage example
async function processAllDocuments() {
  try {
    const results = await Promise.all([
      // Fell free to uncomment any of the following lines to see how the model behaves with different file types

      fileService.process('examples/example.md'),
      fileService.process('examples/example.pdf'),
      fileService.process('examples/example.docx'),
      fileService.process('examples/example.xlsx'),
      fileService.process('examples/example.wav'),
      fileService.process('examples/example.png'),
      // fileService.process('examples/example.mp4'), // You can process audio files too, but examples are not yet available

      // notion 

      
      fileService.process('https://brain.overment.com/')
    ]);


    const query = 'What is within this file?'

    // EXAMPLE: Simple interaction with the file
    // const response = await openaiService.completion({
    //   messages: [
    //   {
    //     role: 'system',
    //     content: `You are an AI assistant analyzing a file. Here's the context from the loaded file:
    //     <file>${results[0].docs[0].text}</file>`
    //   }, 
        
    //   {
    //     role: 'user',
    //     content: query
    //   }],
    //   model: 'gpt-4o-mini'
    // }) as ChatCompletion;
    // console.log(response.choices[0].message.content);

    // EXAMPLE: Simple interaction with the file
    results.forEach((result, index) => {
      console.log(`Result ${index + 1}:`, result);
    });
  } catch (error) {
    console.error('Error processing documents:', error);
  }
}

processAllDocuments().catch(console.error);
