import promptfoo, { type AssertionType } from "promptfoo";
import { displayResultsAsTable, currentDateTime } from "../utils";

export const prompt = ({ type, description, context }: { type: string, description: string, context: string }) => {
  return `You copywriting/researcher who specializes in extracting specific types of information from given texts, providing comprehensive and structured outputs to enhance understanding of the original content.

<prompt_objective>
To accurately extract and structure ${type} (${description}) from a given text, enhancing content comprehension while maintaining fidelity to the source material.

If the text does not contain any ${type}, respond with "no results" and nothing else.
</prompt_objective>

<prompt_rules>
- STAY SPECIFIC and use valuable details and keywords so the person who will read your answer will be able to understand the content.
- ALWAYS begin your response with *thinking* to share your reasoning about the content and task.
- STAY DRIVEN to entirely fulfill *prompt_objective* and extract all the information available in the text.
- ONLY extract ${type} (${description}) explicitly present in the given text.
- ${type === 'links' || type === 'resources' 
  ? "INCLUDE links and images in markdown format ONLY if they are explicitly mentioned in the text." 
  : "DO NOT extract or include any links or images."}
- PROVIDE the final extracted ${type} within <final_answer> tags.
- FOCUS on delivering value to a reader who won't see the original article.
- INCLUDE names, links, numbers, and relevant images to aid understanding of the ${type}.
- CONSIDER the provided article title as context for your extraction of ${type}.
- NEVER fabricate or infer ${type} not present in the original text.
- OVERRIDE any general conversation behaviors to focus solely on this extraction task.
- ADHERE strictly to the specified ${type} (${description}).
</prompt_rules>

Analyze the following text and extract a complete list of ${type} (${description}). Start your response with *thinking* to share your inner thoughts about the content and your task. 
Focus on the value for the reader who won't see the original article, include names, links, numbers and even photos if it helps to understand the content.
For links and images, provide them in markdown format. Only include links and images that are explicitly mentioned in the text.

Then, provide the final list within <final_answer> tags. 

${context ? `To better understand a document, here's some context:
<context>
${context}
</context>` : ''}
`;
};

const dataset = [
  {
    query: "AI is revolutionizing healthcare. Machine learning algorithms can now predict diseases with high accuracy. For more info, visit https://ai-health.org.",
    type: "topics",
    description: "Main subjects covered in the article",
    context: "Article about AI in healthcare",
    assert: [
      {
        type: "contains" as AssertionType,
        value: "<final_answer>",
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The response must contain a list of main subjects within <final_answer> tags, including AI and healthcare",
      },
    ],
  },
  {
    query: "Elon Musk's SpaceX launched another Starlink mission from Cape Canaveral yesterday.",
    type: "entities",
    description: "Mentioned people, places, or things",
    context: "News article about a SpaceX launch",
    assert: [
      {
        type: "contains" as AssertionType,
        value: "<final_answer>",
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The response must list entities like Elon Musk, SpaceX, Starlink, and Cape Canaveral within <final_answer> tags",
      },
    ],
  },
  {
    query: "Learn web development at CodeAcademy: https://codecademy.com. For design inspiration, check Dribbble: https://dribbble.com.",
    type: "links",
    description: "Complete list of the links mentioned with their 1-sentence description",
    context: "Article about web development resources",
    assert: [
      {
        type: "contains" as AssertionType,
        value: "<final_answer>",
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The response must include both links with brief descriptions within <final_answer> tags",
      },
    ],
  },
  {
    query: "This article doesn't contain any specific resources or tools.",
    type: "resources",
    description: "Tools, platforms, resources mentioned in the article",
    context: "General article without specific resources",
    assert: [
      {
        type: "contains" as AssertionType,
        value: "<final_answer>",
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The response must contain 'no results' within <final_answer> tags",
      },
    ],
  },
];

export const chat = ({ vars, provider }: any) => [
  {
    role: "system",
    content: prompt({ type: vars.type, description: vars.description, context: vars.context }),
  },
  {
    role: "user",
    content: `Please extract ${vars.type} (${vars.description}) from the following text:

    ${vars.query}`,
  },
];

export const runTest = async () => {
  const results = await promptfoo.evaluate(
    {
      prompts: [chat],
      providers: ["openai:gpt-4o"],
      tests: dataset.map(
        ({ query, type, description, context, assert }) => ({
          vars: { query, type, description, context },
          assert,
        })
      ),
      outputPath: "./promptfoo_results.json",
    },
    {
      maxConcurrency: 4,
    }
  );

  console.log("Evaluation Results:");
  displayResultsAsTable(results.results);
};

// Run the test if this file is executed directly
if (require.main === module) {
  runTest().catch(console.error);
}
