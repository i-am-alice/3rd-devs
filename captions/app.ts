import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from './OpenAIService';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { extractImageContextSystemMessage, refineDescriptionSystemMessage, previewImageSystemMessage } from './prompts';

const openaiService = new OpenAIService();

// Update the type definition for Image
export type Image = {
    alt: string;
    url: string;
    context: string;
    description: string;
    preview: string;
    base64: string;
    name: string;
};


async function extractImages(article: string): Promise<Image[]> {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = [...article.matchAll(imageRegex)];

    const imagePromises = matches.map(async ([, alt, url]) => {
        try {
            const name = url.split('/').pop() || '';
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');

            return {
                alt,
                url,
                context: '',
                description: '',
                preview: '',
                base64,
                name
            };
        } catch (error) {
            console.error(`Error processing image ${url}:`, error);
            return null;
        }
    });

    const results = await Promise.all(imagePromises);
    return results.filter((link): link is Image => link !== null);
}


// Update the previewImage function signature
async function previewImage(image: Image): Promise<{ name: string; preview: string }> {
    const userMessage: ChatCompletionMessageParam = {
        role: 'user',
        content: [
            {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image.base64}` }
            },
            {
                type: "text",
                text: `Describe the image ${image.name} concisely. Focus on the main elements and overall composition. Return the result in JSON format with only 'name' and 'preview' properties.`
            }
        ]
    };

    const response = await openaiService.completion([previewImageSystemMessage, userMessage], 'gpt-4o', false, true) as ChatCompletion;
    const result = JSON.parse(response.choices[0].message.content || '{}');
    return { name: result.name || image.name, preview: result.preview || '' };
}

async function getImageContext(title: string, article: string, images: Image[]): Promise<{ images: Array<{ name: string, context: string, preview: string }> }> {
    const userMessage: ChatCompletionMessageParam = {
        role: 'user',
        content: `Title: ${title}\n\n${article}`
    };

    const response = await openaiService.completion([extractImageContextSystemMessage(images), userMessage], 'gpt-4o', false, true) as ChatCompletion;
    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Generate previews for all images simultaneously
    const previewPromises = images.map(image => previewImage(image));
    const previews = await Promise.all(previewPromises);

    // Merge context and preview information
    const mergedResults = result.images.map((contextImage: { name: string, context: string }) => {
        const preview = previews.find(p => p.name === contextImage.name);
        return {
            ...contextImage,
            preview: preview ? preview.preview : ''
        };
    });

    return { images: mergedResults };
}

// Update the refineDescription function signature
async function refineDescription(image: Image): Promise<Image> {
    const userMessage: ChatCompletionMessageParam = {
        role: 'user',
        content: [
            {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image.base64}` }
            },
            {
                type: "text",
                text: `Write a description of the image ${image.name}. I have some <context>${image.context}</context> that should be useful for understanding the image in a better way. An initial preview of the image is: <preview>${image.preview}</preview>. A good description briefly describes what is on the image, and uses the context to make it more relevant to the article. The purpose of this description is for summarizing the article, so we need just an essence of the image considering the context, not a detailed description of what is on the image.`
            }
        ]
    };

    console.log(userMessage);

    const response = await openaiService.completion([refineDescriptionSystemMessage, userMessage], 'gpt-4o', false) as ChatCompletion;
    const result = response.choices[0].message.content || '';
    return { ...image, description: result };
}

/**
 * Generates a detailed summary by orchestrating all processing steps, including embedding relevant links and images within the content.
 */
async function processAndSummarizeImages(title: string, path: string) {
    // Read the article file
    const article = await readFile(path, 'utf-8');

    // Extract images from the article
    const images = await extractImages(article);
    console.log('Number of images found:', images.length);

    const contexts = await getImageContext(title, article, images);
    console.log('Number of image metadata found:', contexts.images.length);

    // Process each image: use context and preview from getImageContext, then refine description
    const processedImages = await Promise.all(images.map(async (image) => {
        const { context = '', preview = '' } = contexts.images.find(ctx => ctx.name === image.name) || {};
        return await refineDescription({ ...image, preview, context });
    }));

    // Prepare and save the summarized images (excluding base64 data)
    const describedImages = processedImages.map(({ base64, ...rest }) => rest);
    await writeFile(join(__dirname, 'descriptions.json'), JSON.stringify(describedImages, null, 2));

    // Prepare and save the final data (only url and description)
    const captions = describedImages.map(({ url, description }) => ({ url, description }));
    await writeFile(join(__dirname, 'captions.json'), JSON.stringify(captions, null, 2));

    // Log completion messages
    console.log('Final data saved to final.json');
}

// Execute the main function
processAndSummarizeImages('Lesson #0201 — Audio i interfejs głosowy', join(__dirname, 'article.md'))
    .catch(error => console.error('Error while processing and summarizing images:', error));