import { Neo4jService } from './Neo4jService';
import { OpenAIService } from './OpenAIService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function findShortestPath() {
    // Initialize services
    const openAIService = new OpenAIService();
    const neo4jService = new Neo4jService(
        process.env.NEO4J_URI || '',
        process.env.NEO4J_USER || '',
        process.env.NEO4J_PASSWORD || '',
        openAIService
    );

    try {
        // Define source and target usernames
        const sourceUsername = 'Rafał';
        const targetUsername = 'Barbara';

        console.log(`Finding shortest path from '${sourceUsername}' to '${targetUsername}'...`);

        // Use Cypher query to find the shortest path
        const cypher = `
            MATCH (source:User {username: $sourceUsername}),
                (target:User {username: $targetUsername}),
                path = shortestPath((source)-[:CONNECTED_TO*]-(target))
            RETURN [node in nodes(path) | node.username] AS userPath
        `;

        // Execute the query
        const result = await neo4jService.runQuery(cypher, {
            sourceUsername,
            targetUsername
        });

        // Check if a path was found
        if (result.records.length === 0) {
            console.log(`No path found between '${sourceUsername}' and '${targetUsername}'`);
            return;
        }

        // Extract the usernames along the path
        const userPath = result.records[0].get('userPath');

        // Print the path
        console.log('Shortest path:');
        console.log(userPath.join(' → '));

    } catch (error) {
        console.error('Error finding shortest path:', error);
    } finally {
        // Close the database connection
        await neo4jService.close();
    }
}

// Run the function
findShortestPath();
