import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// In-memory database
const database = [
  { id: 1, name: "Adam", age: 28, occupation: "Software Engineer", hobby: "Rock climbing" },
  { id: 2, name: "Michał", age: 35, occupation: "Data Scientist", hobby: "Playing guitar" },
  { id: 3, name: "Jakub", age: 31, occupation: "UX Designer", hobby: "Photography" },
];

async function selectPerson(question: string): Promise<number> {
  const openai = new OpenAI();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: "You are an assistant that selects the most relevant person for a given question. Respond with only the person's ID (1 for Adam, 2 for Michał, or 3 for Jakub)." },
    { role: "user", content: question }
  ];

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: "gpt-4o",
      max_tokens: 1,
      temperature: 0,
    });

    const completion = chatCompletion.choices[0].message?.content;
    return completion ? parseInt(completion.trim()) : 1;
  } catch (error) {
    console.error("Error in selectPerson:", error);
    return 1; // Default to Adam if there's an error
  }
}

async function answerQuestion(question: string, personId: number): Promise<string> {
  const openai = new OpenAI();
  const person = database.find(p => p.id === personId) || database[0];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: `You are an assistant answering questions about ${person.name}. Use the following information: ${JSON.stringify(person)}` },
    { role: "user", content: question }
  ];

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: "gpt-4o",
      max_tokens: 500,
      temperature: 0.7,
    });

    return chatCompletion.choices[0].message?.content || "I couldn't generate an answer.";
  } catch (error) {
    console.error("Error in answerQuestion:", error);
    return "Sorry, I encountered an error while trying to answer the question.";
  }
}

// Example usage
async function main() {
  const questions = [
    "Who is the oldest person?",
    "Tell me about Adam's hobby",
    "What does Michał do for a living?",
    "How old is Jakub?",
  ];

  for (const question of questions) {
    const selectedPersonId = await selectPerson(question);
    const answer = await answerQuestion(question, selectedPersonId);
    console.log(`Question: "${question}"\nAnswer: ${answer}\n`);
  }
}

main();