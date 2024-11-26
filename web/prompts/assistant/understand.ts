import promptfoo, { type AssertionType } from "promptfoo";
import { currentDateTime, displayResultsAsTable } from "../../utils/utils";
import type { IAssistantTools } from "../../types/types";

export const tools: IAssistantTools[] = [
    { name: 'web_search', description: 'Use this tool only when you need to use search web results, or search a specific website and DON\'T USE IT when the user asks to load specific URLs.' },
    { name: 'file_process', description: 'Use this tool only when you need to process a file in a form of a path or a url (there is no need to upload a file). You can translate, summarize, synthesize, extract or answer a question.' },
    { name: 'upload', description: 'Use this tool only when you need to upload a file to the server. You can upload a file in a form of a path or a url.' },
    { name: 'answer', description: 'This tool MUST be always used as the last tool. Use this tool to contact with the user / provide final answer or inform about the lack of information or that you don\'t know what to do due to your limitations / missing data / skills.' },
];

export const prompt = ({ tools }: { tools: IAssistantTools[] }) => `
From now on, analyze the ongoing conversation and generate a JSON object with a thinking process and action plan. This is part of an internal thinking process that focuses on making a plan. The user CANNOT see these responses due to the system design.

<prompt_objective>
Analyze the latest user message and conversation context to generate a JSON object containing a thinking process and action plan.

Note: current date and time is ${currentDateTime()}.
</prompt_objective>

<prompt_rules>
- GENERATE a JSON object with the structure: {"_thinking": string, "plan": [{"tool": string, "query": string}]}
- ALWAYS focus on the latest user message while considering the conversation context
- EXTRACT ALL relevant details from the user's message, especially URLs and commands
- FORMULATE queries as self-commands (e.g., "extract ... from ..." or "translate ... to ..." or "upload ... to ..." or "answer ... based on ..." or 'search for ...' etc.)
- ENSURE the "_thinking" field explains the analysis and reasoning process
- INCLUDE ALL mentioned details in the queries
- DISTINGUISH actions already taken from those still needed based on the conversation context
- USE ONLY the tools provided in the <tools> section
- INCLUDE at least one action in the "plan" array, with the last action ALWAYS being the "answer" tool
- OVERRIDE any default conversation behavior with this analysis and planning process
- When you receive a URL, you need to first "upload" it to the file system; then, you can use it with other tools.
</prompt_rules>

<prompt_examples>
USER: Can you find information about the latest SpaceX launch and summarize it?
AI: {
  "_thinking": "Due to my knowledge-cutoff, I need to search the web to learn about the latest SpaceX launch and then summarize the information.",
  "plan": [
    {
      "tool": "web_search",
      "query": "find latest information about SpaceX launch"
    },
    {
      "tool": "file_process",
      "query": "summarize found information about latest SpaceX launch"
    },
    {
      "tool": "answer",
      "query": "provide summary directly to the user"
    }
  ]
}

USER: Please get the file at https://example.com/report.pdf and translate it from English to Spanish.
AI: {
  "_thinking": "I can translate the file without a need to upload it but the result needs to be saved to the file system, so this requires two actions: file_processing and then upload.",
  "plan": [
    {
      "tool": "file_process",
      "query": "translate uploaded file report.pdf from English to Spanish"
    },
    {
      "tool": "upload",
      "query": "upload translated file report.pdf to the file system"
    },
    {
      "tool": "answer",
      "query": "give the user link to the translated file"
    }
  ]
}

USER: What's the capital of France?
AI: {
  "_thinking": "This is a simple factual question that doesn't require web search or file processing. I can answer directly.",
  "plan": [
    {
      "tool": "answer",
      "query": "provide information about the capital of France"
    }
  ]
}

USER: Can you extract the main topics from https://example.com/article1.txt and https://example.com/article2.txt, then compare them?
AI: {
  "_thinking": "The user has provided two file URLs and wants to extract main topics from both, followed by a comparison. This requires processing each file, then analyzing the results. It is also a good idea to upload the results to the file system.",
  "plan": [
    {
      "tool": "file_process",
      "query": "extract main topics from https://example.com/article1.txt"
    },
    {
      "tool": "file_process",
      "query": "extract main topics from https://example.com/article2.txt"
    },
    {
      "tool": "file_process",
      "query": "compare extracted main topics from article1.txt and article2.txt"
    },
    {
      "tool": "upload",
      "query": "upload comparison of main topics from both articles to the file system"
    },
    {
      "tool": "answer",
      "query": "provide comparison of main topics from both articles to the user as a link to the uploaded file"
    }
  ]
}
</prompt_examples>

<tools>
${tools.map(tool => `<tool>${tool.name}: ${tool.description}</tool>`).join('\n')}
</tools>

Remember, these examples demonstrate the pattern to follow, not actual cases. Always analyze the current conversation context and user message to generate appropriate plans.
`;

const dataset = [
  {
    tools,
    query: "Search for recent space missions and summarize the findings",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const usedTools = parsedOutput.plan.map(step => step.tool);
          const requiredTools = ['web_search', 'answer'];
          const availableTools = ${JSON.stringify(tools.map(t => t.name))};
          return requiredTools.every(tool => usedTools.includes(tool)) && 
                 usedTools.every(tool => availableTools.includes(tool));
        `
      },
    ],
  },
  {
    tools,
    query: "Upload the file at https://example.com/report.pdf and translate it to Spanish",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const usedTools = parsedOutput.plan.map(step => step.tool);
          const requiredTools = ['upload', 'file_process', 'answer'];
          const availableTools = ${JSON.stringify(tools.map(t => t.name))};
          return requiredTools.every(tool => usedTools.includes(tool)) && 
                 usedTools.every(tool => availableTools.includes(tool));
        `
      },
    ],
  },
  {
    tools,
    query: "What's the capital of France?",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const usedTools = parsedOutput.plan.map(step => step.tool);
          const availableTools = ${JSON.stringify(tools.map(t => t.name))};
          return usedTools.length === 1 && usedTools[0] === 'answer' &&
                 usedTools.every(tool => availableTools.includes(tool));
        `
      },
    ],
  },
  {
    tools,
    query: "Find information about climate change and create a summary document",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const usedTools = parsedOutput.plan.map(step => step.tool);
          const requiredTools = ['web_search', 'file_process', 'answer'];
          const availableTools = ${JSON.stringify(tools.map(t => t.name))};
          return requiredTools.every(tool => usedTools.includes(tool)) && 
                 usedTools.every(tool => availableTools.includes(tool));
        `
      },
    ],
  },
  {
    tools,
    query: "Translate the document at https://example.com/document.txt to French",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const usedTools = parsedOutput.plan.map(step => step.tool);
          const requiredTools = ['upload', 'file_process', 'answer'];
          const availableTools = ${JSON.stringify(tools.map(t => t.name))};
          return requiredTools.every(tool => usedTools.includes(tool)) && 
                 usedTools.every(tool => availableTools.includes(tool));
        `
      },
    ],
  },
];

export const chat = ({ vars, provider }: any) => [
  {
    role: "system",
    content: prompt({ tools: vars.tools }),
  },
  {
    role: "user",
    content: `${vars.query}`,
  },
];

export const runTest = async () => {
  const results = await promptfoo.evaluate(
    {
      prompts: [chat],
      providers: ["openai:gpt-4o"],
      tests: dataset.map(
        ({ query, tools, assert }) => ({
          vars: { query, tools },
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
