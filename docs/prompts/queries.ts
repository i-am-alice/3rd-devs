import promptfoo, { type AssertionType } from "promptfoo";
import { displayResultsAsTable, currentDateTime } from "../utils";

export const prompt = () => {
  return `From now on you're a Conversation Analyzer for Hybrid Search Queries. Your sole purpose is to analyze ongoing conversations and extract queries for hybrid (vector and full-text) search.

<prompt_objective>
Generate a JSON object containing contemplation and extracted queries from the latest message in a conversation.
</prompt_objective>

<prompt_rules>
- ALWAYS focus on the latest message in the conversation.
- Consider previous messages ONLY if necessary for context.
- Analyze the content and underlying intent of the latest message.
- Generate unique queries as pairs: natural language (for vector search) and keyword-based (for full-text search).
- STRICTLY adhere to the following JSON structure and property order:
  {
    "_thinking": "[Contemplation about the message]",
    "queries": [
      {
        "natural": "[Natural language query]",
        "search": "[Keyword-based search query]"
      }
    ]
  }
- If no queries can be extracted, return an empty array for "queries".
- NEVER deviate from the specified JSON structure.
- ALWAYS return a valid JSON object, even if some fields are empty.
</prompt_rules>

<prompt_examples>
USER: "What's the capital of France?"
AI: {
  "_thinking": "The user is asking about the capital city of France. This is a straightforward geographical question.",
  "queries": [
    {
      "natural": "What is the capital city of France?",
      "search": "capital France"
    }
  ]
}

USER: "I love the way the sunset looks over the ocean."
AI: {
  "_thinking": "The user is expressing appreciation for a sunset view over the ocean. This statement doesn't contain a direct question or search intent.",
  "queries": []
}

USER: "Can you compare the nutritional benefits of apples and oranges?"
AI: {
  "_thinking": "The user wants to compare the nutritional value of apples and oranges. This requires information about both fruits.",
  "queries": [
    {
      "natural": "What are the nutritional benefits of apples compared to oranges?",
      "search": "apple orange nutrition comparison"
    },
    {
      "natural": "Nutritional content of apples",
      "search": "apple nutritional value"
    },
    {
      "natural": "Nutritional content of oranges",
      "search": "orange nutritional value"
    }
  ]
}

USER: "Tell me about the history of Rome, but focus on the role of Julius Caesar."
AI: {
  "_thinking": "The user is interested in Roman history, specifically the part involving Julius Caesar. This requires a focused query on Caesar's role in Roman history.",
  "queries": [
    {
      "natural": "What was Julius Caesar's role in the history of Rome?",
      "search": "Julius Caesar Rome history impact"
    },
    {
      "natural": "Key events in Julius Caesar's life in Rome",
      "search": "Julius Caesar Roman timeline"
    }
  ]
}
</prompt_examples>
`;
};

const dataset = [
  {
    query: "I'm planning a trip to Japan next month. Any recommendations?",
    type: "queries",
    description: "Extract queries for hybrid search",
    context: "User seeking travel advice",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The output should be a valid JSON object containing '_thinking' and 'queries' fields. The 'queries' field should be an array of objects, each with 'natural' and 'search' properties. The extracted queries should be relevant to planning a trip to Japan, potentially including topics like attractions, accommodations, transportation, and cultural experiences."
      },
    ],
  },
  {
    query: "My car won't start. The battery is fine, but I hear a clicking sound when I turn the key.",
    type: "queries",
    description: "Extract queries for hybrid search",
    context: "User describing a car problem",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The output should be a valid JSON object containing '_thinking' and 'queries' fields. The 'queries' field should be an array of objects, each with 'natural' and 'search' properties. The extracted queries should be relevant to diagnosing and solving the car starting problem, potentially including topics like starter motor issues, ignition system problems, or fuel system malfunctions."
      },
    ],
  },
  {
    query: "Can you explain the concept of quantum entanglement in simple terms?",
    type: "queries",
    description: "Extract queries for hybrid search",
    context: "User asking about a complex scientific concept",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The output should be a valid JSON object containing '_thinking' and 'queries' fields. The 'queries' field should be an array of objects, each with 'natural' and 'search' properties. The extracted queries should be relevant to explaining quantum entanglement in simple terms, potentially including topics like basic quantum mechanics principles, real-world applications, and analogies to help understand the concept."
      },
    ],
  },
  {
    query: "I'm trying to decide between pursuing a career in software engineering or data science. What are the pros and cons of each?",
    type: "queries",
    description: "Extract queries for hybrid search",
    context: "User seeking career advice",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The output should be a valid JSON object containing '_thinking' and 'queries' fields. The 'queries' field should be an array of objects, each with 'natural' and 'search' properties. The extracted queries should be relevant to comparing careers in software engineering and data science, potentially including topics like job market demand, salary expectations, required skills, and day-to-day responsibilities for each field."
      },
    ],
  },
  {
    query: "What are some effective strategies for managing stress and improving mental health during a pandemic?",
    type: "queries",
    description: "Extract queries for hybrid search",
    context: "User seeking mental health advice during a challenging time",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "The output should be a valid JSON object containing '_thinking' and 'queries' fields. The 'queries' field should be an array of objects, each with 'natural' and 'search' properties. The extracted queries should be relevant to managing stress and improving mental health during a pandemic, potentially including topics like coping mechanisms, self-care techniques, professional mental health resources, and maintaining social connections while physically distancing."
      },
    ],
  },
];

export const chat = ({ vars, provider }: any) => [
  {
    role: "system",
    content: prompt(),
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
        ({ query, assert }) => ({
          vars: { query },
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
