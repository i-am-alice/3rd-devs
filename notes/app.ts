import type { ChatCompletion } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";



const noteTypes = [
    {
        name: 'tasks',
        description: 'Tasks to be done',
        formatting: `bullet list in which each item start with the project name followed by a concise description of the task`,
        context: `Projects:
        
        - Tech•sistence: A newsletter about the latest tech and workflow tools; coworker: Greg
        - eduweb.pl: An online platform with courses for programmers & designers; coworkers: Greg, Peter (video), Joanna
        - easy.tools: A platform for selling digital products and managing online business; coworkers: Greg, Peter (dev), Marta, Michał
        - heyalice.app: Desktop LLM client for macOS; coworker: Greg`,
    },
    {
        name: 'grocery-list',
        description: 'Grocery list',
        formatting: `bullet list of items to buy, optionally grouped by categories`,
        context: `# Grocery List Formatting Guide

1. Structure:
   - Begin with a clear title: "Grocery List for [Date/Week]"
   - Organize items by store layout or category (e.g., Produce, Dairy, Meats)

2. Item Format:
   - List each item on a new line
   - Include quantity and unit (e.g., "2 lbs chicken breast")
   - Add brief descriptors if necessary (e.g., "ripe avocados")

3. Categorization:
   - Group similar items under headers
   - Use bold formatting for category headers

4. Prioritization:
   - Place essential items at the top of each category
   - Mark urgent items with an asterisk (*)

5. Flexibility:
   - Include space for spontaneous additions
   - Note potential substitutions in parentheses

6. Meal Planning Integration:
   - Link items to planned meals where applicable
   - Use a coding system (e.g., [M1] for Meal 1) to connect items to specific recipes

7. Budget Considerations:
   - Include estimated prices if budget tracking is important
   - Mark sale items or those with coupons

8. Special Notes:
   - Add any dietary restrictions or preferences at the top
   - Include a section for non-food items if necessary

9. Digital Enhancements:
   - If converting to a digital format, include clickable checkboxes
   - Add links to recipes or nutritional information where relevant

Remember to keep the list concise, clear, and tailored to the user's specific needs and shopping habits.`,
    },
    {
        name: 'meeting-notes',
        description: 'Meeting notes',
        formatting: `structured notes with headers for agenda, decisions, action items, and follow-ups`,
        context: `Projects:
        
        - Tech•sistence: A newsletter about the latest tech and workflow tools; coworker: Greg
        - eduweb.pl: An online platform with courses for programmers & designers; coworkers: Greg, Peter (video), Joanna
        - easy.tools: A platform for selling digital products and managing online business; coworkers: Greg, Peter (dev), Marta, Michał
        - heyalice.app: Desktop LLM client for macOS; coworker: Greg`,
    },
];


const determineNoteType = async (message: string) => {
    const openai = new OpenAIService();
    const response = await openai.completion({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: `You are an intelligent note classification system. Your task is to categorize the given message into one of the following note types:

${noteTypes.map(type => `- ${type.name}: ${type.description}`).join('\n')}

Analyze the content and context of the message carefully. Respond ONLY with the lowercased name of the most appropriate note type. If uncertain, choose the closest match.` },
            { role: 'user', content: message },
        ],
    }) as ChatCompletion;

    return response.choices[0].message.content?.trim().toLowerCase() || 'unknown';
}

const formatNote = async (type: string, message: string) => {
    const noteType = noteTypes.find(t => t.name === type);
    if (!noteType) return `Error: Invalid note type "${type}"`;

    const openai = new OpenAIService();
    const response = await openai.completion({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: formatNoteSystemPrompt(noteType) },
            { role: 'user', content: message },
        ],
    }) as ChatCompletion;

    return response.choices[0].message.content || 'There was an error formatting the note. Original message: ' + message;
}

const refineNote = async (note: string, originalMessage: string) => {
    const openai = new OpenAIService();
    const response = await openai.completion({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: refineNoteSystemPrompt(note, originalMessage) },
            { role: 'user', content: "Please refine this note. Write refined version and nothing else." },
        ],
    }) as ChatCompletion;

    return response.choices[0].message.content;
}

import fs from 'fs/promises';
import path from 'path';
import { formatNoteSystemPrompt, refineNoteSystemPrompt } from "./prompts";

const main = async () => {
    const reasoningPath = path.join(__dirname, 'reasoning.md');
    await fs.writeFile(reasoningPath, ''); // Clear the file

    // const message = ` gotta tackle a few things today. Car’s due for an oil change - should probably book that in. Need to call the bank about that weird charge on the credit card. Oh, and don’t forget to water the plants - they’re looking a bit sad. Maybe I should set a reminder for that. Laundry’s piling up too, definitely need to sort that out. And if I have time, would be great to finish that book I started last week. Busy day ahead, but let’s get it done!`;
    const message = `So i spoke with Greg about the latest features that should include voice interaction in the real time you know, but we also need a good presentation for the next conference about this app.`;
    // const message = `The fridge is looking pretty bare - no eggs, milk, or fresh veggies. Could really go for some pasta tonight, but we’re all out of sauce and parmesan. Oh, and we’re running low on snacks too. Maybe pick up some chips or crackers? And if you’re feeling fancy, some good cheese would be amazing. Let me know if you need me to be more specific. Ouh and I need to buy batteries for the mouse. Thanks!`;

    // Step 1: Determine note type
    const noteType = await determineNoteType(message);
    await fs.appendFile(reasoningPath, `Note Type: ${noteType}\n\n---\n\n`);

    // Step 2: Format note

    const formattedNote = await formatNote(noteType, message);
    await fs.appendFile(reasoningPath, `Formatted Note:\n${formattedNote}\n\n---\n\n`);

    // Step 3: Refine note
    const refinedNote = await refineNote(formattedNote, message);
    await fs.appendFile(reasoningPath, `Refined Note:\n${refinedNote}\n\n`);
}

main();