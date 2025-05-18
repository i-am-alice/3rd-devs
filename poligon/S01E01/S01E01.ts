import FirecrawlApp from '@mendable/firecrawl-js';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import axios from 'axios';

// Load environment variables
dotenv.config();

async function getAnswerFromGPT(question: string): Promise<string> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Answer the question concisely and accurately."
                },
                {
                    role: "user",
                    content: question
                }
            ]
        });

        return completion.choices[0].message.content || 'No answer received';
    } catch (error) {
        console.error('Error getting answer from GPT:', error);
        throw error;
    }
}

async function scrapeSecurityQuestion(): Promise<string | null> {
    try {
        const response = await axios.get('https://xyz.ag3nts.org/');
        const content = response.data;
        
        // Find the line starting with "Question:"
        const questionMatch = content.match(/Question:\s*(.*?)(?:\n|$)/);
        
        if (questionMatch) {
            const question = questionMatch[1].trim();
            console.log('Found security question:', question);
            return question;
        } else {
            console.log('No security question found on the page');
            return null;
        }
    } catch (error) {
        console.error('Error scraping the website:', error);
        return null;
    }
}

async function loginAndAccessSecretPage() {
    try {
        // Get the security question
        const question = await scrapeSecurityQuestion();
        if (!question) {
            throw new Error('Could not get security question');
        }

        // Get answer from GPT
        const answer = await getAnswerFromGPT(question);
        console.log('GPT answer:', answer);

        // Prepare login data
        const loginData = new URLSearchParams({
            username: 'tester',
            password: '574e112a',
            answer: answer
        });

        // Send login request
        const loginResponse = await axios.post('https://xyz.ag3nts.org/', loginData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('Login response:', loginResponse.data);

        // If login was successful, the response should contain the secret page URL
        // You might need to extract the URL from the response depending on the format
        // For now, we'll just log the response
        return loginResponse.data;
    } catch (error) {
        console.error('Error during login process:', error);
        throw error;
    }
}

// Run the function
loginAndAccessSecretPage();