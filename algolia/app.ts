import { AlgoliaService } from "./AlgoliaService";
import { v4 as uuidv4 } from 'uuid';

const algoliaService = new AlgoliaService(String(process.env.ALGOLIA_APP_ID), String(process.env.ALGOLIA_API_KEY));

const data = [
  {
    author: "Adam",
    text: "I believe in writing clean, maintainable code. Refactoring should be a regular part of our development process."
  },
  {
    author: "Kuba",
    text: "Test-driven development has significantly improved the quality of our codebase. Let's make it a standard practice."
  },
  {
    author: "Mateusz",
    text: "Optimizing our CI/CD pipeline could greatly enhance our deployment efficiency. We should prioritize this in our next sprint."
  },
];

const indexName = "dev_comments";

async function main() {
  // Check if index exists
  const indices = await algoliaService.listIndices();
  const indexExists = indices.items.some(index => index.name === indexName);

  if (!indexExists) {
    // Add data only if index doesn't exist
    for (const item of data) {
      const objectID = uuidv4();
      await algoliaService.addOrUpdateObject(indexName, objectID, { ...item, objectID });
    }
    console.log("Data added to index");
  } else {
    console.log("Index already exists. Skipping data addition.");
  }

  // Perform a sample search
  const query = "code"
  const searchResult = await algoliaService.searchSingleIndex(indexName, query, {
    queryParameters: {
      filters: `author:Adam`
    }
  });
  const hits = searchResult.results[0].hits;
  
  console.table(hits.map(hit => ({
    Author: hit.author,
    Text: hit.text.slice(0, 45) + (hit.text.length > 45 ? '...' : ''),
    ObjectID: hit.objectID,
    MatchLevel: hit._highlightResult.text.matchLevel,
    MatchedWords: hit._highlightResult.text.matchedWords.join(', '),
    UserScore: hit._rankingInfo.userScore
  })));
}

main().catch(console.error);