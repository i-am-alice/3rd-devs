import { OpenAIService } from "./OpenAIService";
import { TextSplitter } from "./TextService";
import { VectorService } from './VectorService';

const data = [
    'Good to Great: "Good is the enemy of great. To go from good to great requires transcending the curse of competence."',
    'Built to Last: "Clock building, not time telling. Focus on building an organization that can prosper far beyond the presence of any single leader and through multiple product life cycles."',
    'Great by Choice: "20 Mile March. Achieve consistent performance markers, in good times and bad, as a way to build resilience and maintain steady growth."',
    'How the Mighty Fall: "Five stages of decline: hubris born of success, undisciplined pursuit of more, denial of risk and peril, grasping for salvation, and capitulation to irrelevance or death."',
    'Beyond Entrepreneurship 2.0: "The flywheel effect. Success comes from consistently pushing in a single direction, gaining momentum over time."',
    'Turning the Flywheel: "Disciplined people, thought, and action. Great organizations are built on a foundation of disciplined individuals who engage in disciplined thought and take disciplined action."',
    'Built to Last: "Preserve the core, stimulate progress. Enduring great companies maintain their core values and purpose while their business strategies and operating practices endlessly adapt to a changing world."',
    'Good to Great: "First who, then what. Get the right people on the bus, the wrong people off the bus, and the right people in the right seats before you figure out where to drive it."',
    'Start with Why: "People don\'t buy what you do; they buy why you do it. And what you do simply proves what you believe."',
    'Leaders Eat Last: "The true price of leadership is the willingness to place the needs of others above your own. Great leaders truly care about those they are privileged to lead and understand that the true cost of the leadership privilege comes at the expense of self-interest."',
    'The Infinite Game: "In the Infinite Game, the true value of an organization cannot be measured by the success it has achieved based on a set of arbitrary metrics over arbitrary time frames. The true value of an organization is measured by the desire others have to contribute to that organization\'s ability to keep succeeding, not just during the time they are there, but well beyond their own tenure."'
];

const queries = [ 'What does Sinek said about working with people?' ];

const COLLECTION_NAME = "aidevs";

const openai = new OpenAIService();
const vectorService = new VectorService(openai);
const textSplitter = new TextSplitter();

async function initializeData() {
    const points = await Promise.all(data.map(async text => {
        const doc = await textSplitter.document(text, 'gpt-4', { role: 'embedding-test' });
        return doc;
    }));

    await vectorService.initializeCollectionWithData(COLLECTION_NAME, points);
}

async function main() {
    await initializeData();

    const searchResults = await Promise.all(queries.map(query => 
        vectorService.performSearch(COLLECTION_NAME, query, 3)
    ));

    queries.forEach((query, index) => {
        console.log(`Query: ${query}`);
        searchResults[index].forEach((result, resultIndex) => {
            console.log(`  ${resultIndex + 1}. ${result.payload.text} (Score: ${result.score})`);
        });
        console.log();
    });
}

main().catch(console.error);