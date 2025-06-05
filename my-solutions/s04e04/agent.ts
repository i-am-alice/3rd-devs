import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { decodeInstructions } from './ai';

interface DroneInstructionRequest {
    instruction: string;
}

interface DronePositionResponse {
    description: string;
}

// Type for the 4x4 map
type MapGrid = string[][];

async function main() {
    const app = express();
    const port = process.env.PORT || 4747;

    // Parse JSON bodies
    app.use(express.json());

    // Load the map data
    const mapData = await loadMapData();

    // Drone agent endpoint
    app.post('/api/drone-agent', async (req, res) => {
        try {
            const { instruction } = req.body as DroneInstructionRequest;
            
            console.log(`\n🔔 ${new Date().toISOString()} - New API request received`);
            console.log(`🗣️ User instruction: "${instruction}"`); 

            if (!instruction) {
                console.log(`❌ Error: Missing instruction parameter`);
                return res.status(400).json({ error: 'Missing instruction parameter' });
            }

            // Get position based on instruction
            const position = await getPositionFromInstruction(instruction, mapData);

            // Get description at that position
            const description = mapData[position.y][position.x];

            // Return the description
            const response: DronePositionResponse = {
                description
            };
            
            console.log(`🎯 Final drone position: (${position.x}, ${position.y})`);
            console.log(`📜 Found description: "${description}"`);

            console.log(`✅ Request completed successfully`);
            return res.json(response);
        } catch (error) {
            console.error('❌ Error processing drone instruction:', error);
            console.log(`❌ Request failed with error`);
            return res.status(500).json({ error: 'Failed to process instruction' });
        }
    });

    // Start the server
    app.listen(port, () => {
        console.log(`Drone agent API listening on port ${port}`);
    });
}

// Function to load map data from map.json
async function loadMapData(): Promise<MapGrid> {
    try {
        const mapFilePath = path.join(__dirname, 'map.json');
        const mapContent = await fs.readFile(mapFilePath, 'utf-8');
        return JSON.parse(mapContent) as MapGrid;
    } catch (error) {
        console.error('Error loading map data:', error);
        throw new Error('Failed to load map data');
    }
}

// Position interface
interface Position {
    x: number;
    y: number;
}

// Function to process instructions and get the final drone position
async function getPositionFromInstruction(instruction: string, map: MapGrid): Promise<Position> {
    // Start position is always at the top-left corner [0,0]
    const position: Position = { x: 0, y: 0 };
    
    // Log the received instruction
    console.log(`📝 Received instruction: "${instruction}"`); 

    // Use OpenAI to decode the instruction into directional commands
    const directions = await decodeInstructions(instruction);
    
    // Log the decoded directions array
    console.log(`🔄 Decoded to ${directions.length} directions:`);
    directions.forEach((dir, index) => {
        console.log(`  ${index}: "${dir.trim()}"`); 
    });
    
    console.log(`🚁 Starting drone at position (${position.x}, ${position.y})`);

    // Process each direction
    for (let i = 0; i < directions.length; i++) {
        const direction = directions[i];
        const originalPosition = { ...position };
        switch (direction.trim().toUpperCase()) {
            case 'PRAWO':
                // Move right if within bounds
                if (position.x < map[0].length - 1) {
                    position.x += 1;
                }
                break;
            case 'LEWO':
                // Move left if within bounds
                if (position.x > 0) {
                    position.x -= 1;
                }
                break;
            case 'GÓRA':
                // Move up if within bounds
                if (position.y > 0) {
                    position.y -= 1;
                }
                break;
            case 'DÓŁ':
                // Move down if within bounds
                if (position.y < map.length - 1) {
                    position.y += 1;
                }
                break;
            default:
                console.warn(`❓ Unknown direction: "${direction}"`);
                break;
        }
        
        // Log each movement
        const directionEmoji = getDirectionEmoji(direction.trim().toUpperCase());
        console.log(`  🔹 Step ${i+1}: ${directionEmoji} "${direction.trim()}" → Position (${position.x}, ${position.y})`);
        
        // Log position changes
        if (originalPosition.x !== position.x || originalPosition.y !== position.y) {
            console.log(`    📍 Moved from (${originalPosition.x}, ${originalPosition.y}) to (${position.x}, ${position.y})`);
        } else {
            console.log(`    ⛔ No movement - hit boundary`);
        }
    }

    return position;
}

// Helper function to get emoji for direction
function getDirectionEmoji(direction: string): string {
    switch (direction) {
        case 'PRAWO': return '➡️';
        case 'LEWO': return '⬅️';
        case 'GÓRA': return '⬆️';
        case 'DÓŁ': return '⬇️';
        default: return '❓';
    }
}

main();
