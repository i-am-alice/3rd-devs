import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { OpenAiService } from '../lib/OpenAiService';

interface TestQuestion {
    q: string;
    a: string;
}

interface TestData {
    question: string;
    answer: number;
    test?: {
        q: string;
        a: string;
    };
}

interface CalibrationData {
    apikey: string;
    description: string;
    copyright: string;
    'test-data': TestData[];
}

function readCalibrationFile(): string {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const filePath = resolve(__dirname, 'calibration.json');
        return readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error('Error reading calibration file:', error);
        throw error;
    }
}

function parseCalibrationData(jsonString: string): CalibrationData {
    try {
        return JSON.parse(jsonString) as CalibrationData;
    } catch (error) {
        console.error('Error parsing calibration data:', error);
        throw error;
    }
}

function calculateSum(question: string): number {
    const numbers = question.match(/\d+/g)?.map(Number) || [];
    return numbers.reduce((sum, num) => sum + num, 0);
}

function verifyAnswer(question: string, calculatedSum: number, expectedAnswer: number): boolean {
    return calculatedSum === expectedAnswer;
}

function saveCalibrationFile(filePath: string, data: CalibrationData): void {
    try {
        writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');
        console.log(`Calibration file updated successfully at: ${filePath}`);
    } catch (error) {
        console.error('Error saving calibration file:', error);
        throw error;
    }
}

export async function main() {
    try {
        // Read and parse calibration file
        const jsonString = readCalibrationFile();
        const calibrationData = parseCalibrationData(jsonString);

        // Extract test questions and their indices
        const testQuestions: { index: number; question: string }[] = [];
        calibrationData['test-data'].forEach((item, index) => {
            if (item.test && item.test.q) {
                testQuestions.push({
                    index,
                    question: item.test.q
                });
            }
        });

        console.log(`Found ${testQuestions.length} test questions:`);
        testQuestions.forEach(q => {
            console.log(`Index ${q.index}: ${q.question}`);
        });

        if (testQuestions.length > 0) {
            const openAi = new OpenAiService();

            // Process each question individually using askGpt41Nano
            const answers: { index: number; answer: string }[] = [];
            for (const q of testQuestions) {
                const systemPrompt = "You are a helpful assistant providing factual, concise answers. Respond with accurate information and nothing else.";
                const answer = await openAi.askGpt41Nano(systemPrompt, q.question);
                answers.push({
                    index: q.index,
                    answer: answer
                });
                console.log(`Processed question ${q.index}: ${q.question} --> ${answer}`);
            }

            console.log('\nReceived answers from OpenAI:');
            console.log(JSON.stringify(answers, null, 2));

            // Update calibration data with answers
            answers.forEach((answer) => {
                if (calibrationData['test-data'][answer.index].test) {
                    calibrationData['test-data'][answer.index].test!.a = answer.answer;
                }
            });

            // Verify calculations are correct
            const correctedAnswers = calibrationData['test-data'].map((testItem) => {
                const calculatedSum = calculateSum(testItem.question);
                const isCorrect = calculatedSum === testItem.answer;
                return {
                    ...testItem,
                    answer: calculatedSum,
                };
            });

            calibrationData['test-data'] = correctedAnswers;

            // Save the updated calibration file
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
            const outputFilePath = resolve(__dirname, 'calibration-updated.json');
            saveCalibrationFile(outputFilePath, calibrationData);
        }

        console.log('\nCalibration verification complete!');
        // Send updatedCalibrationData to the API endpoint
        try {
            const response = await fetch('https://centrala.ag3nts.org/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    apikey: calibrationData.apikey,
                    task: "JSON",
                    answer: { ...calibrationData }
                })
            });
            const responseBody = await response.text();
            console.log('\nAPI response from https://centrala.ag3nts.org/report:');
            console.log(responseBody);
        } catch (postError) {
            console.error('Failed to send calibration data to API:', postError);
        }
    } catch (error) {
        console.error('An error occurred during calibration:', error);
        throw error;
    }
}

main().catch(error => {
    console.error('Error in main execution:', error);
    process.exit(1);
});
