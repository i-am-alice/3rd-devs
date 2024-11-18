import { OpenAIService } from "./OpenAIService";
import { TextSplitter } from "./TextService";
import { VectorService } from './VectorService';
import type { ChatCompletion } from "openai/resources/chat/completions";

const data = [
    { author: 'Jim Collins', text: 'Good to Great: "Good is the enemy of great. To go from good to great requires transcending the curse of competence."' },
    { author: 'Jim Collins', text: 'Built to Last: "Clock building, not time telling. Focus on building an organization that can prosper far beyond the presence of any single leader and through multiple product life cycles."' },
    { author: 'Jim Collins', text: 'Great by Choice: "20 Mile March. Achieve consistent performance markers, in good times and bad, as a way to build resilience and maintain steady growth."' },
    { author: 'Jim Collins', text: 'How the Mighty Fall: "Five stages of decline: hubris born of success, undisciplined pursuit of more, denial of risk and peril, grasping for salvation, and capitulation to irrelevance or death."' },
    { author: 'Jim Collins', text: 'Beyond Entrepreneurship 2.0: "The flywheel effect. Success comes from consistently pushing in a single direction, gaining momentum over time."' },
    { author: 'Jim Collins', text: 'Turning the Flywheel: "Disciplined people, thought, and action. Great organizations are built on a foundation of disciplined individuals who engage in disciplined thought and take disciplined action."' },
    { author: 'Jim Collins', text: 'Built to Last: "Preserve the core, stimulate progress. Enduring great companies maintain their core values and purpose while their business strategies and operating practices endlessly adapt to a changing world."' },
    { author: 'Jim Collins', text: 'Good to Great: "First who, then what. Get the right people on the bus, the wrong people off the bus, and the right people in the right seats before you figure out where to drive it."' },
    { author: 'Simon Sinek', text: 'Start with Why: "People don\'t buy what you do; they buy why you do it. And what you do simply proves what you believe."' },
    { author: 'Simon Sinek', text: 'Leaders Eat Last: "The true price of leadership is the willingness to place the needs of others above your own. Great leaders truly care about those they are privileged to lead and understand that the true cost of the leadership privilege comes at the expense of self-interest."' },
    { author: 'Simon Sinek', text: 'The Infinite Game: "In the Infinite Game, the true value of an organization cannot be measured by the success it has achieved based on a set of arbitrary metrics over arbitrary time frames. The true value of an organization is measured by the desire others have to contribute to that organization\'s ability to keep succeeding, not just during the time they are there, but well beyond their own tenure."' }
];

const query = 'What does Sinek and Collins said about working with people?';

const COLLECTION_NAME = "aidevs";

const openai = new OpenAIService();
const vectorService = new VectorService(openai);
const textSplitter = new TextSplitter();

async function initializeData() {
    const points = await Promise.all(data.map(async ({ author, text }) => {
        const doc = await textSplitter.document(text, 'gpt-4o', { author });
        return doc;
    }));

    await vectorService.initializeCollectionWithData(COLLECTION_NAME, points);
}

async function main() {
    await initializeData();

    const determineAuthor = await openai.completion({
        messages: [
            { role: 'system', content: `You are a helpful assistant that determines the author(s) of a given text. 
                                        Pick between Jim Collins and Simon Sinek. If both are relevant, list them comma-separated. Write back with the name(s) and nothing else.` },
            { role: 'user', content: query }
        ]
    }) as ChatCompletion;

    const authors = determineAuthor.choices[0].message.content?.split(',').map(a => a.trim()) || [];

    const filter = authors.length > 0 ? {
      should: authors.map(author => ({
        key: "author",
        match: {
          value: author
        }
      }))
    } : undefined;

    const searchResults = await vectorService.performSearch(COLLECTION_NAME, query, filter, 15);

    const relevanceChecks = await Promise.all(searchResults.map(async (result) => {
        const relevanceCheck = await openai.completion({
            messages: [
                { role: 'system', content: 'You are a helpful assistant that determines if a given text is relevant to a query. Respond with 1 if relevant, 0 if not relevant.' },
                { role: 'user', content: `Query: ${query}\nText: ${result.payload?.text}` }
            ]
        }) as ChatCompletion;
        const isRelevant = relevanceCheck.choices[0].message.content === '1';
        return { ...result, isRelevant };
    }));

    const relevantResults = relevanceChecks.filter(result => result.isRelevant);

    console.log(`Query: ${query}`);
    console.log(`Author(s): ${authors.join(', ')}`);
    console.table(relevantResults.map((result, index) => ({
        'Author': result.payload?.author || '',
        'Text': result.payload?.text?.slice(0, 45) + '...' || '',
        'Score': result.score
    })));
}

main().catch(console.error);