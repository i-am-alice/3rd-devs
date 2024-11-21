import { Neo4jService } from "./Neo4jService";
import { OpenAIService } from "./OpenAIService";
import { AssistantService } from "./AssistantService";
import { initialize } from "./init";
import { formatSearchResults } from "./utils";

if (
  !process.env.NEO4J_URI ||
  !process.env.NEO4J_USER ||
  !process.env.NEO4J_PASSWORD
) {
  throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set");
}

const openAIService = new OpenAIService();
const neo4jService = new Neo4jService(
  process.env.NEO4J_URI,
  process.env.NEO4J_USER,
  process.env.NEO4J_PASSWORD,
  openAIService
);
const assistantService = new AssistantService(openAIService);

const recall = async (query: string) => {
  const recallJson = await assistantService.getRecallJson(query);
  console.log(recallJson)

  let context = "";

  if (recallJson.specific) {
    console.log("Performing specific search");
    const result = await neo4jService.performVectorSearch(
      "document_index",
      recallJson.specific.q,
      5,
      recallJson.specific.types.length > 0 ? `node.type IN ${JSON.stringify(recallJson.specific.types)}` : ""
    );
    context += formatSearchResults(result, "Specific Search");
  }

  if (recallJson.relation) {
    console.log("Performing relation search");
    const result = await neo4jService.relationshipVectorSearch(
      "document_index",
      recallJson.relation.q,
      5,
      recallJson.relation.types.length > 0 ? `node.type IN ${JSON.stringify(recallJson.relation.types)}` : "",
      recallJson.relation.relatedTypes.map((type: string) => `HAS_${type.toUpperCase()}`)
    );
    context += formatSearchResults(result, "Relation Search");
  }

  if (recallJson.general) {
    console.log("Performing general search");
    const result = await neo4jService.facetedSearch(
      recallJson.general.type,
      5,
      null
    );
    context += formatSearchResults(result, "General Search");
  }

  return context;
};

const remember = async (resource: any) => {
  const doc = await neo4jService.addNode("Document", JSON.parse(resource));
  return `<added_resource id="${doc.id}" name="${doc.properties.name}" url="${doc.properties.url}" desc="${doc.properties.description}">${doc.properties.content}</added_resource>`;
};

const answer = async (query: string, context: string) => {
  return assistantService.generateAnswer(query, context);
};

const chat = async (query: string) => {
  // Step 1: Initialize and prepare the database
  await neo4jService.createVectorIndex( "document_index", "Document", "embedding", 3072 );
  await neo4jService.waitForIndexToBeOnline("document_index");
  await initialize(neo4jService, openAIService);

  // Step 2: Determine the action to take based on the query
  const decision = await assistantService.think(query);
  let context = "";

  // Step 3: Execute the appropriate action
  if (decision === "READ") {
    // Step 3a: Retrieve relevant information
    context += await recall(query);
  }

  if (decision === "WRITE") {
    // Step 3b: Create and store new information
    const resource = await assistantService.describe(query);
    context += await remember(resource);
  }

  // Step 4: Generate and return the response
  const response = await answer(query, context);
  console.log('Response', response);
  return response;
};

// Example usage
await chat("List me all the videos we have");
console.log('------------------------------------')
await chat("Find me an article about Cypher query language");
console.log('------------------------------------')
await chat("Find me Neo4j service and then the videos about it");

await neo4jService.close();