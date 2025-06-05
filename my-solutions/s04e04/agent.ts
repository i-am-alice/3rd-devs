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

            if (!instruction) {
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

            return res.json(response);
        } catch (error) {
            console.error('Error processing drone instruction:', error);
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

    // Use OpenAI to decode the instruction into directional commands
    const directions = await decodeInstructions(instruction);

    // Process each direction
    for (const direction of directions) {
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
                console.warn(`Unknown direction: ${direction}`);
                break;
        }
    }

    return position;
}

main();
