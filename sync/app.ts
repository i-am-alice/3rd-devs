import { v4 as uuidv4 } from "uuid";
import { DatabaseService } from "./DatabaseService";
import { AlgoliaService } from "./AlgoliaService";
import { VectorService } from "./VectorService";
import { OpenAIService } from "./OpenAIService";

const talebBooks = [
  {
    title: "The Black Swan",
    description:
      "An exploration of rare and unpredictable events, and their massive impact on society and history.",
    author: "Nassim Nicholas Taleb",
  },
  {
    title: "Antifragile",
    description:
      "A book about things that gain from disorder and how to thrive in an uncertain world.",
    author: "Nassim Nicholas Taleb",
  },
  {
    title: "Fooled by Randomness",
    description:
      "An examination of the underestimated role of chance in life and in the markets.",
    author: "Nassim Nicholas Taleb",
  },
  {
    title: "Skin in the Game",
    description:
      "A book about risk and responsibility, and the importance of having a personal stake in decisions and actions.",
    author: "Nassim Nicholas Taleb",
  },
  {
    title: "The Bed of Procrustes",
    description:
      "A collection of philosophical and practical aphorisms that challenge our ideas about knowledge and uncertainty.",
    author: "Nassim Nicholas Taleb",
  },
];

async function initializeData() {
  const openAIService = new OpenAIService();
  const algoliaService = new AlgoliaService(
    process.env.ALGOLIA_APP_ID!,
    process.env.ALGOLIA_API_KEY!
  );
  const vectorService = new VectorService(openAIService);
  const dbService = new DatabaseService(
    "sync/database.db",
    algoliaService,
    vectorService
  );

  const docs = await dbService.getAllDocuments();

  if (docs.length === 0) {
    for (const book of talebBooks) {
      const document = {
        uuid: uuidv4(),
        name: book.title,
        content: book.description,
        source: "initialization",
        conversation_uuid: uuidv4(),
        type: "book",
        description: `A book by ${book.author}`,
        indexed: true,
      };

      // Insert into SQLite database, which will sync to Algolia and Qdrant
      await dbService.insertDocument(document);
    }
  }

  await dbService.updateDocument("4248fef8-e247-4a18-b104-46a93edd915a", {
    name: "Antifragile 2",
  });
  //   await dbService.deleteDocument('189ef4ad-041a-4ce9-933b-350c1c867080');

  console.log(
    "Initialization complete. Example data has been added to all stores."
  );
}

initializeData().catch(console.error);
