import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function sendData(): Promise<void> {
    try {
        // First, download the data
        const dataResponse = await axios.get('https://poligon.aidevs.pl/dane.txt');
        const data = dataResponse.data.trim();
        
        // Split the data into a list of strings, handling both spaces and newlines
        const answer = data.split(/\s+/);
        
        // Send the data to the verify endpoint
        const response = await axios.post('https://poligon.aidevs.pl/verify', {
            task: "POLIGON",
            apikey: process.env.API_TEST || '',
            answer: answer
        });
        
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the function
sendData(); 