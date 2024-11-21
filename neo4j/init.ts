import { v4 as uuidv4 } from "uuid";
import { Neo4jService } from "./Neo4jService";
import { OpenAIService } from "./OpenAIService";
import { DocumentType, type Document } from "./types";

export const initialize = async (neo4jService: Neo4jService, openAIService: OpenAIService) => {
  const existingRecords = await neo4jService.executeQuery(`
    MATCH (d:Document)
    RETURN count(d) AS count
  `);

  if (existingRecords.records[0].get("count").toNumber() > 0) {
    console.log("Records already exist. Skipping initialization.");
    return;
  }

  const documents: Document[] = [
    {
      uuid: uuidv4(),
      name: "Neo4j Graph Database",
      description: "A popular graph database management system",
      content: "Neo4j is a native graph database platform that is built to leverage data relationships. It uses a property graph model to efficiently store and query connected data.",
      url: "https://neo4j.com",
      images: ["neo4j_logo.png"],
      type: DocumentType.Application,
      tags: ["graph database", "nosql", "cypher"],
      embedding: await openAIService.createEmbedding("Neo4j graph database management system"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uuid: uuidv4(),
      name: "Introduction to Neo4j",
      description: "A beginner's guide to Neo4j and graph databases",
      content: "This article introduces Neo4j, explaining what graph databases are, how they differ from relational databases, and the basic concepts of nodes, relationships, and properties in Neo4j.",
      url: "https://neo4j.com/developer/graph-database/",
      images: ["neo4j_intro.png"],
      type: DocumentType.Article,
      tags: ["introduction", "graph database", "tutorial"],
      embedding: await openAIService.createEmbedding("Introduction to Neo4j and graph databases"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uuid: uuidv4(),
      name: "Neo4j vs Elasticsearch",
      description: "Comparison between Neo4j and Elasticsearch for different use cases",
      content: "This video compares Neo4j and Elasticsearch, discussing their strengths, weaknesses, and ideal use cases. It covers topics such as data modeling, querying capabilities, and performance characteristics.",
      url: "https://www.youtube.com/watch?v=example",
      images: ["comparison_thumbnail.jpg"],
      type: DocumentType.Video,
      tags: ["comparison", "elasticsearch", "database comparison"],
      embedding: await openAIService.createEmbedding("Comparison between Neo4j and Elasticsearch"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uuid: uuidv4(),
      name: "Graph Databases in the Cloud",
      description: "Exploring cloud-based graph database solutions",
      content: "This article discusses various cloud-based graph database solutions, including Neo4j Aura, Amazon Neptune, and Azure Cosmos DB. It covers deployment options, scalability, and managed services for graph databases.",
      url: "https://example.com/graph-databases-cloud",
      images: ["cloud_graph_db.png"],
      type: DocumentType.Article,
      tags: ["cloud", "graph database", "managed services"],
      embedding: await openAIService.createEmbedding("Cloud-based graph database solutions"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uuid: uuidv4(),
      name: "Cypher Query Language Tutorial",
      description: "Learn how to write Cypher queries for Neo4j",
      content: "This comprehensive tutorial covers the basics of the Cypher query language used in Neo4j. It includes examples of creating nodes, defining relationships, and performing complex graph queries.",
      url: "https://neo4j.com/developer/cypher/",
      images: ["cypher_tutorial.png"],
      type: DocumentType.Article,
      tags: ["cypher", "query language", "tutorial"],
      embedding: await openAIService.createEmbedding("Cypher query language tutorial for Neo4j"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uuid: uuidv4(),
      name: "Neo4j APOC Library",
      description: "Overview of the APOC library for Neo4j",
      content: "The APOC (Awesome Procedures On Cypher) library is a collection of useful procedures and functions for Neo4j. This documentation covers installation, usage, and common use cases for APOC procedures.",
      url: "https://neo4j.com/labs/apoc/",
      images: ["apoc_logo.png"],
      type: DocumentType.Article,
      tags: ["apoc", "library", "procedures"],
      embedding: await openAIService.createEmbedding("Neo4j APOC library documentation"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const doc of documents) {
    const newDoc = await neo4jService.addNode("Document", doc);
    console.log(`Added document: ${newDoc.properties.name}`);
  }

  const neo4jApp = await neo4jService.findNodeByProperty("Document", "name", "Neo4j Graph Database");
  const introArticle = await neo4jService.findNodeByProperty("Document", "name", "Introduction to Neo4j");
  const comparisonVideo = await neo4jService.findNodeByProperty("Document", "name", "Neo4j vs Elasticsearch");
  const cloudArticle = await neo4jService.findNodeByProperty("Document", "name", "Graph Databases in the Cloud");
  const cypherTutorial = await neo4jService.findNodeByProperty("Document", "name", "Cypher Query Language Tutorial");
  const apocDoc = await neo4jService.findNodeByProperty("Document", "name", "Neo4j APOC Library");

  if (neo4jApp && introArticle && comparisonVideo && cloudArticle && cypherTutorial && apocDoc) {
    await neo4jService.connectNodes(neo4jApp.id, introArticle.id, "HAS_ARTICLE");
    await neo4jService.connectNodes(neo4jApp.id, comparisonVideo.id, "HAS_VIDEO");
    await neo4jService.connectNodes(neo4jApp.id, cloudArticle.id, "HAS_ARTICLE");
    await neo4jService.connectNodes(neo4jApp.id, cypherTutorial.id, "HAS_TUTORIAL");
    await neo4jService.connectNodes(neo4jApp.id, apocDoc.id, "HAS_DOCUMENTATION");
    console.log("Created relationships between documents");
  }
};