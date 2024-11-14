import { OpenAIService } from './OpenAIService';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateMarkmapSyntax(transcription: string, openAIService: OpenAIService): Promise<string> {
  const response = await openAIService.completion({
    messages: [
      { role: "system", content: `This transcription was generated from dictated audio and may contain imperfections. Convert it into a valid markmap syntax, focusing on the most crucial concepts and including necessary additional notes. Remove background noise and unrelated fragments. Begin your response with a *thinking* block to reflect on structuring and presentation. Then, use <final_result> tags to enclose the markmap syntax without any additional formatting. Start the markmap content immediately after the opening tag.
        
      Mindmap should include: main topic, subtopics and notes related to them. Labels should be informative and concise.` },
      { role: "user", content: transcription }
    ],
    model: "gpt-4o",
  });

  if (openAIService.isStreamResponse(response)) {
    throw new Error("Unexpected streaming response");
  }

  return response.choices[0].message.content || '';
}

async function main() {
  const mindmapDir = path.join(__dirname);
  const voicenotePath = path.join(mindmapDir, 'voicenote.mp3');
  const markmapPath = path.join(mindmapDir, 'markmap.md');
  const mindmapPath = path.join(mindmapDir, 'mindmap.html');

  const openAIService = new OpenAIService();

  try {
    const audioBuffer = await fs.readFile(voicenotePath);
    const transcription = await openAIService.transcribe(audioBuffer);
    const markmapSyntax = await generateMarkmapSyntax(transcription, openAIService);

    // Write markmap syntax to a file in the mindmap directory
    await fs.writeFile(markmapPath, markmapSyntax);

    // Use markmap-cli to generate the HTML mindmap in the mindmap directory
    await execAsync(`npx markmap-cli ${markmapPath} -o ${mindmapPath}`);

    console.log('Mindmap HTML generated successfully in the mindmap directory.');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();