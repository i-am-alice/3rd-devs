import fs from 'fs';
import path from 'path';
import { OpenAiService } from '../lib/OpenAiService';

// Directory containing the context .md files
const OUTPUT_DIR = path.join(__dirname, 'output');

function readAllMarkdownFiles(dir: string): Record<string, string> {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const contents: Record<string, string> = {};
  for (const file of files) {
    contents[file] = fs.readFileSync(path.join(dir, file), 'utf8');
  }
  return contents;
}

function preparePromptPolish(mdFiles: Record<string, string>): string {
  // Best practice: clear instructions, delimiters, context, linking index.md, Polish
  const index = mdFiles['index.md'] || '';
  const others = Object.entries(mdFiles)
    .filter(([name]) => name !== 'index.md')
    .map(([name, content]) => `---\nPlik: ${name}\n${content.trim()}`)
    .join('\n\n');
  return [
    'Odpowiedz na pytanie użytkownika na podstawie poniższych materiałów.',
    'Zwróć szczególną uwagę na powiązania między tagami i odniesieniami w pliku index.md oraz treścią pozostałych plików.',
    'Odpowiadaj wyłącznie po polsku. Jeśli nie masz wystarczających informacji, napisz to wprost.',
    '---',
    'index.md:',
    index.trim(),
    '---',
    others
  ].join('\n\n');
}

async function main() {
  const question = process.argv[2];
  if (!question) {
    console.error('Podaj pytanie jako pierwszy argument wywołania.');
    process.exit(1);
  }

  const mdFiles = readAllMarkdownFiles(OUTPUT_DIR);
  const prompt = preparePromptPolish(mdFiles);

  const openai = new OpenAiService();
  try {
    const answer = await openai.askGpt41Nano(prompt, question, 512);
    console.log(answer);
  } catch (e) {
    console.error('Błąd podczas uzyskiwania odpowiedzi od OpenAI:', e);
    process.exit(2);
  }
}

main();