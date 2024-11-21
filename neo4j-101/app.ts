import { Neo4jService } from "./Neo4jService";
import { OpenAIService } from "./OpenAIService";
import { v4 as uuidv4 } from 'uuid';
import { thinkingSystemPrompt } from "./prompts";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";

if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
  throw new Error("NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set");
}

const openAIService = new OpenAIService();
const neo4jService = new Neo4jService(
  process.env.NEO4J_URI,
  process.env.NEO4J_USER,
  process.env.NEO4J_PASSWORD,
  openAIService
);

async function main3() {
    try {
      // Create vector indexes
      await neo4jService.createVectorIndex('actor_index', 'Actor', 'embedding', 3072);
      await neo4jService.createVectorIndex('movie_index', 'Movie', 'embedding', 3072);
      await neo4jService.waitForIndexToBeOnline('actor_index');
      await neo4jService.waitForIndexToBeOnline('movie_index');
      console.log("Vector indexes 'actor_index' and 'movie_index' are online and ready.");

      // Create Actor nodes
      const actors = [
        { name: 'Keanu Reeves', birthYear: 1964 },
        { name: 'Carrie-Anne Moss', birthYear: 1967 },
        { name: 'Laurence Fishburne', birthYear: 1961 },
        { name: 'Hugo Weaving', birthYear: 1960 }
      ];
      for (const actor of actors) {
        const embedding = await openAIService.createEmbedding(actor.name);
        await neo4jService.addNode('Actor', { ...actor, embedding });
      }
  
      // Create Movie nodes
      const movies = [
        { title: 'The Matrix', releaseYear: 1999 },
        { title: 'The Matrix Reloaded', releaseYear: 2003 },
        { title: 'John Wick', releaseYear: 2014 },
        { title: 'The Lord of the Rings: The Fellowship of the Ring', releaseYear: 2001 }
      ];
      for (const movie of movies) {
        const embedding = await openAIService.createEmbedding(movie.title);
        await neo4jService.addNode('Movie', { ...movie, embedding });
      }
  
      // Create ACTED_IN relationships
      const actedIn = [
        { actor: 'Keanu Reeves', movie: 'The Matrix', character: 'Neo' },
        { actor: 'Carrie-Anne Moss', movie: 'The Matrix', character: 'Trinity' },
        { actor: 'Laurence Fishburne', movie: 'The Matrix', character: 'Morpheus' },
        { actor: 'Hugo Weaving', movie: 'The Matrix', character: 'Agent Smith' },
        { actor: 'Keanu Reeves', movie: 'The Matrix Reloaded', character: 'Neo' },
        { actor: 'Carrie-Anne Moss', movie: 'The Matrix Reloaded', character: 'Trinity' },
        { actor: 'Laurence Fishburne', movie: 'The Matrix Reloaded', character: 'Morpheus' },
        { actor: 'Keanu Reeves', movie: 'John Wick', character: 'John Wick' }
      ];
      for (const role of actedIn) {
        const actor = await neo4jService.findNodeByProperty('Actor', 'name', role.actor);
        const movie = await neo4jService.findNodeByProperty('Movie', 'title', role.movie);
        if (actor && movie) {
          await neo4jService.connectNodes(actor.id, movie.id, 'ACTED_IN', { character: role.character });
        }
      }
  
      // Create Director nodes and DIRECTED relationships
      const directors = [
        { name: 'The Wachowskis', movies: ['The Matrix', 'The Matrix Reloaded'] },
        { name: 'Chad Stahelski', movies: ['John Wick'] }
      ];
      for (const director of directors) {
        const directorNode = await neo4jService.addNode('Director', { name: director.name });
        for (const movieTitle of director.movies) {
          const movie = await neo4jService.findNodeByProperty('Movie', 'title', movieTitle);
          if (movie) {
            await neo4jService.connectNodes(directorNode.id, movie.id, 'DIRECTED');
          }
        }
      }
  
    // Perform vector search
    console.log("\nVector search for 'Sauron':");
    const searchQuery = "Sauron";
    const movieResults = await neo4jService.performVectorSearch('movie_index', searchQuery, 1);
    const actorResults = await neo4jService.performVectorSearch('actor_index', searchQuery, 1);

    console.log("Most relevant movie:", movieResults[0].node.title);
    console.log("Most relevant actor:", actorResults[0].node.name);


    // Perform queries
    console.log("\n1. Actors who acted in 'The Matrix':");
    const query1 = `
      MATCH (actor:Actor)-[role:ACTED_IN]->(movie:Movie)
      WHERE movie.title = 'The Matrix'
      RETURN actor.name, role.character
    `;
    const result1 = await neo4jService.executeQuery(query1);
    result1.records.forEach(record => {
      console.log(`${record.get('actor.name')} as ${record.get('role.character')}`);
    });

    console.log("\n2. Movies Keanu Reeves has acted in:");
    const query2 = `
      MATCH (keanu:Actor {name: 'Keanu Reeves'})-[role:ACTED_IN]->(movie:Movie)
      RETURN movie.title, role.character, movie.releaseYear
      ORDER BY movie.releaseYear
    `;
    const result2 = await neo4jService.executeQuery(query2);
    result2.records.forEach(record => {
      console.log(`${record.get('movie.title')} (${record.get('movie.releaseYear')}) as ${record.get('role.character')}`);
    });

    console.log("\n3. Directors who have worked with Keanu Reeves:");
    const query3 = `
      MATCH (keanu:Actor {name: 'Keanu Reeves'})-[:ACTED_IN]->(movie:Movie)<-[:DIRECTED]-(director:Director)
      RETURN DISTINCT director.name, collect(movie.title) as movies
    `;
    const result3 = await neo4jService.executeQuery(query3);
    result3.records.forEach(record => {
      console.log(`${record.get('director.name')} directed: ${record.get('movies').join(', ')}`);
    });

    console.log("\n4. Number of actors for each movie:");
    const query4 = `
      MATCH (actor:Actor)-[:ACTED_IN]->(movie:Movie)
      RETURN movie.title, count(actor) as actorCount
      ORDER BY actorCount DESC
    `;
    const result4 = await neo4jService.executeQuery(query4);
    result4.records.forEach(record => {
      console.log(`${record.get('movie.title')}: ${record.get('actorCount')} actors`);
    });

    console.log("\n5. Actors who have worked together in multiple movies:");
    const query5 = `
      MATCH (actor1:Actor)-[:ACTED_IN]->(movie:Movie)<-[:ACTED_IN]-(actor2:Actor)
      WHERE actor1.name < actor2.name  // To avoid duplicates
      WITH actor1, actor2, collect(movie.title) as movies
      WHERE size(movies) > 1
      RETURN actor1.name, actor2.name, movies
    `;
    const result5 = await neo4jService.executeQuery(query5);
    result5.records.forEach(record => {
      console.log(`${record.get('actor1.name')} and ${record.get('actor2.name')} worked together in: ${record.get('movies').join(', ')}`);
    });

    console.log("\n6. Oldest actor in each movie:");
    const query6 = `
      MATCH (actor:Actor)-[:ACTED_IN]->(movie:Movie)
      WITH movie, actor
      ORDER BY actor.birthYear
      WITH movie, collect(actor)[0] as oldestActor
      RETURN movie.title, oldestActor.name, oldestActor.birthYear
    `;
    const result6 = await neo4jService.executeQuery(query6);
    result6.records.forEach(record => {
      console.log(`${record.get('movie.title')}: ${record.get('oldestActor.name')} (born ${record.get('oldestActor.birthYear')})`);
    });
  
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await neo4jService.close();
    }
  }
  
  main3();
