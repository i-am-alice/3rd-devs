import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';

interface ChatConfig {
  messages: ChatCompletionMessageParam[];
  model?: string;
  stream?: boolean;
}

export class AssistantService {
  constructor(private openaiService: OpenAIService) {}

  async answer(config: ChatConfig) {
    const { messages, model = "gpt-4o", stream = false } = config;
    const filteredMessages = this.filterValidMessages(messages);

    try {
        const completion = await this.openaiService.completion(filteredMessages, model, stream) as ChatCompletion;
        return completion.choices[0].message.content || 'There was an error processing your request.';
    } catch (error) {
      console.error("Error in processChat:", error);
      throw new Error("Failed to process chat. Please try again later.");
    }
  }

  private filterValidMessages(messages: ChatCompletionMessageParam[]) {
    return messages.filter(msg => msg && typeof msg.content === 'string' && msg.content !== '');
  }

  addSystemMessage(messages: ChatCompletionMessageParam[], relevantContexts: { type: string, content: string }[]): ChatCompletionMessageParam[] {
    const baseSystemMessage = "You are a helpful assistant who can answer questions based on the knowledge from previous messages and memories.";
    let systemMessageContent = baseSystemMessage;

    if (relevantContexts.length > 0) {
      systemMessageContent += "\n\n<relevant_context>\n" + 
        relevantContexts.map(context => {
          return `<${context.type}>${context.content}</${context.type}>`;
        }).join('\n') + "\n</relevant_context>";
    } else {
      systemMessageContent += "\n\n<no_context>No relevant context from previous conversations was found. Please respond based on your general knowledge and the current conversation.</no_context>";
    }

    return [{ role: 'system', content: systemMessageContent }, ...messages];
  }

  async learn(messages: ChatCompletionMessageParam[]): Promise<false | { title: string, keywords: string[], content: string }> {
    const learningPrompt: ChatCompletionMessageParam[] = [
      { role: 'system', content: `As an Adaptive Learning Analyzer with human-like memory tagging, your task is to scan AI-User conversations, extract key insights, and generate structured learning data. Your primary objective is to produce a JSON object containing _thoughts, keywords, content, and title based on your analysis, emphasizing memorable and useful tags.

Core Rules:
- Always return a valid JSON object, nothing else.
- Analyze only the most recent AI-User exchange.
- When the user speaks about himself, ALWAYS add a tag 'adam' to the keywords.
- When you have existing information, skip learning and set 'content' and 'title' to null.
- Learn from user messages unless explicitly asked to remember the conversation.
- Provide ultra-concise self-reflection in the _thoughts field.
- Extract memorable, specific keywords for the keywords field:
  * Use lowercase for all tags
  * Split compound concepts into individual tags (e.g., "krakow_location" becomes ["krakow", "location"])
  * Prefer specific terms over generic ones (e.g., "tesla" over "car")
  * Omit unhelpful descriptors (e.g., "black_matte" as a color)
  * Focus on key concepts, names, and unique identifiers
  * Use mnemonic techniques to create more memorable tags
  * Limit to 3-7 tags per entry
- Rephrase user information as if it's your own knowledge in the content field
- Set content to null if no specific, useful information needs saving.
- Never store trivial information (e.g., chitchat, greetings).
- Don't process document information unless explicitly requested.
- Focus on future-relevant information, mimicking human selective attention.
- Maintain your base behavior; this analysis doesn't override your core functionality.
- Generate a slugified, ultra-concise title for potential filename use.

Examples of expected behavior:

USER: I live in Krakow, it's a beautiful city in southern Poland.
AI: {
  "_thoughts": "User shared living location and brief description",
  "keywords": ["krakow", "poland", "city", "south"],
  "content": "The user lives in Krakow, a city in southern Poland described as beautiful",
  "title": "place-of-living"
}

USER: I just bought a Tesla Model S in matte black.
AI: {
  "_thoughts": "User mentioned recent car purchase",
  "keywords": ["tesla", "model-s", "purchase"],
  "content": "The user recently bought a Tesla Model S",
  "title": "tesla-ownership"
}

USER: My favorite programming languages are Python and JavaScript.
AI: {
  "_thoughts": "User expressed programming language preferences",
  "keywords": ["python", "javascript", "coding", "preferences"],
  "content": "The user's favorite programming languages are Python and JavaScript",
  "title": "programming-languages"
}

USER: Hey, how's it going?
AI: {
  "_thoughts": "Generic greeting, no significant information",
  "keywords": [],
  "content": null,
  "title": null
}

USER: Remember this: The speed of light is approximately 299,792,458 meters per second.
AI: {
  "_thoughts": "User shared scientific fact about light speed",
  "keywords": ["light", "speed", "physics", "science"],
  "content": "The speed of light is approximately 299,792,458 meters per second",
  "title": "speed-of-light"
}`},
      ...messages.filter(msg => msg.role !== 'system')
    ];

    try {
      const result = await this.openaiService.completion(learningPrompt, 'gpt-4o', false, true) as ChatCompletion;
      const memory = result.choices[0].message.content;
  
      if (!memory || memory.toLowerCase() === 'false') {
        return false;
      }
  
      try {
        const parsedMemory = JSON.parse(memory);
        console.log(`---\nMemory: ${JSON.stringify(parsedMemory)}\n---`);
        const { title, keywords, content } = parsedMemory;
  
        if (!content) {
          return false;
        }
  
        return { title, keywords, content };
      } catch (parseError) {
        console.error("Error parsing learn result:", parseError);
        return false;
      }
    } catch (error) {
      console.error("Error in learn method:", error);
      return false;
    }
  }
}
