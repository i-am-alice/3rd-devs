import { OpenAIService } from "./OpenAIService";
import type { ChatCompletion, ChatCompletionContentPartImage, ChatCompletionContentPartText, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { readFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import type { ResizedImageMetadata } from "./app.dt";

// Configuration Constants
const IMAGE_PATH = join(__dirname, 'lessons.png');
const OPTIMIZED_IMAGE_PATH = join(__dirname, 'lessons_optimized.png');
const COMPRESSION_LEVEL = 5;
const IMAGE_DETAIL: 'low' | 'high' = 'high';

// Initialize OpenAIService
const openAIService = new OpenAIService();

// Function to process the image
async function processImage(): Promise<{ imageBase64: string; metadata: ResizedImageMetadata }> {
    try {
        const imageBuffer = readFileSync(IMAGE_PATH);
        const resizedImageBuffer = await sharp(imageBuffer)
            .resize(2048, 2048, { fit: 'inside' })
            .png({ compressionLevel: COMPRESSION_LEVEL })
            .toBuffer();

        await sharp(resizedImageBuffer).toFile(OPTIMIZED_IMAGE_PATH);

        const imageBase64 = resizedImageBuffer.toString('base64');
        const metadata = await sharp(resizedImageBuffer).metadata();

        if (!metadata.width || !metadata.height) {
            throw new Error("Unable to retrieve image dimensions.");
        }

        return { imageBase64, metadata: { width: metadata.width, height: metadata.height } };
    } catch (error) {
        console.error("Image processing failed:", error);
        throw error;
    }
}

// Helper function to transform message content
function transformMessageContent(message: ChatCompletionMessageParam): ChatCompletionMessageParam {
    if (typeof message.content === 'string') {
        return { role: message.role, content: message.content } as ChatCompletionMessageParam;
    } else {
        const textContent = message.content?.find((contentPart): contentPart is ChatCompletionContentPartText => 'text' in contentPart)?.text as string;
        return { role: message.role, content: textContent } as ChatCompletionMessageParam;
    }
}

// Main Execution Function
(async () => {
    try {
        const { imageBase64, metadata } = await processImage();
        const imageTokenCost = await openAIService.calculateImageTokens(metadata.width, metadata.height, IMAGE_DETAIL);
        
        const messages: ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: "You are a helpful assistant that can answer questions and help with tasks."
            },
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageBase64}`,
                            detail: "high"
                        }
                    },
                    {
                        type: "text",
                        text: "Tabulate lesson numbers with like and comment counts"
                    },
                ]
            }
        ];

        const mappedMessages: ChatCompletionMessageParam[] = messages.map(transformMessageContent);
        const textTokenCost = await openAIService.countTokens(mappedMessages);
        const totalTokenCost = imageTokenCost + textTokenCost;


        const chatCompletion = await openAIService.completion(messages, "gpt-4o", false, false, 1024) as ChatCompletion;

        console.log(chatCompletion.choices[0].message.content);
        console.log(`-----------------------------------`);
        console.log(`Image Tokens: ${imageTokenCost}`);
        console.log(`Text Tokens: ${textTokenCost}`);
        console.log(`-----------------------------------`);
        console.log(`Estimated Prompt Tokens: ${totalTokenCost}`);
        console.log(`Actual Prompt Tokens: ${chatCompletion.usage?.prompt_tokens}`);
        console.log(`-----------------------------------`);
        console.log(`Total Token Usage: ${chatCompletion.usage?.total_tokens}`);
    } catch (error) {
        console.error("An error occurred during execution:", error);
    }
})();