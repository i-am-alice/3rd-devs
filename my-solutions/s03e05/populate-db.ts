import { Neo4jService } from './Neo4jService';
import { OpenAIService } from './OpenAIService';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface User {
    id: string;
    username: string;
    access_level: string;
    is_active: string;
    lastlog: string;
}

interface Connection {
    user1_id: string;
    user2_id: string;
}

async function populateDatabase() {
    // Initialize services
    const openAIService = new OpenAIService();
    const neo4jService = new Neo4jService(
        process.env.NEO4J_URI || '',
        process.env.NEO4J_USER || '',
        process.env.NEO4J_PASSWORD || '',
        openAIService
    );

    try {
        // Read users from users.json file
        const usersData = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8');
        const users: User[] = JSON.parse(usersData);

        // Read connections from connections.json file
        const connectionsData = fs.readFileSync(path.join(__dirname, 'connections.json'), 'utf-8');
        const connections: Connection[] = JSON.parse(connectionsData);

        console.log(`Loaded ${users.length} users and ${connections.length} connections`);

        // Create user nodes in Neo4j
        const userNodes = new Map<string, number>(); // Map to store user id -> neo4j node id

        for (const user of users) {
            // Prepare node properties according to requirements
            const nodeProperties = {
                userId: user.id,
                username: user.username,
                access_level: user.access_level,
                is_active: user.is_active,
                lastlog: user.lastlog
            };

            // Create the user node
            const result = await neo4jService.addNode('User', nodeProperties);
            userNodes.set(user.id, result.id);
            console.log(`Created user node for ${user.username} with id: ${result.id}`);
        }

        // Create relationships between users based on connections
        for (const connection of connections) {
            const user1NodeId = userNodes.get(connection.user1_id);
            const user2NodeId = userNodes.get(connection.user2_id);

            // Skip if either user doesn't exist in our database
            if (!user1NodeId || !user2NodeId) {
                console.warn(`Skipping connection between ${connection.user1_id} and ${connection.user2_id} - one or both users not found`);
                continue;
            }

            // Create the relationship
            await neo4jService.connectNodes(user1NodeId, user2NodeId, 'CONNECTED_TO', {});
            console.log(`Created relationship between users with ids: ${connection.user1_id} and ${connection.user2_id}`);
        }

        console.log('Database population completed successfully');
    } catch (error) {
        console.error('Error populating database:', error);
    } finally {
        // Close the database connection
        await neo4jService.close();
    }
}

// Run the function
populateDatabase();
