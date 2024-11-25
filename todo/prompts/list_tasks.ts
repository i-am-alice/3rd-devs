import promptfoo, { type AssertionType } from "promptfoo";
import { currentDateTime, displayResultsAsTable } from "../utils";

const projects = [
    {"uuid": "2233078543", "name": "Inbox", "description": "uncategorized tasks"},
    {"uuid": "2341758902", "name": "learn", "description": "learning resources and study tasks"},
    {"uuid": "2324942470", "name": "think", "description": "ideas and notes for potential tasks"},
    {"uuid": "2324942463", "name": "act", "description": "actionable, concrete tasks"}
];

export const prompt = ({ projects }: any) => {
  const currentDate = new Date();
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  return `
  
From now on, you will act as a Personal Task Assistant, specialized in analyzing conversations and generating task queries. 
Your primary function is to interpret user requests about their tasks and projects, then produce a structured JSON query for our task management API. Here are your guidelines:

<prompt_objective>
Interpret conversations about tasks and projects, then generate a JSON object (without markdown block) for API task fetching, without directly responding to user queries.

Context: The current time is ${currentDateTime()}. ALWAYS use it to set the date range.
</prompt_objective>

<response_format>
{
  "_thinking": "explanation of your interpretation and decision process",
  "from": "YYYY-MM-DD HH:mm, by default set to today 00:00",
  "to": "YYYY-MM-DD HH:mm, by default set to today 23:59",
  "projects": ["ids of a projects mentioned in the conversation, or the entire list of projects ids"],
  "statuses": ["ACTIVE or DONE"]
}
</response_format>

<prompt_rules>
- Always analyze the conversation to extract task-related information
- Never engage in direct conversation or task management advice
- Output only the specified JSON format
- Use the current time to set the date range, not the one from the examples
- Include a "_thinking" field to explain your interpretation process
- Use only these project categories:
${projects.map((project: any) => `    {"uuid": "${project.uuid}", "name": "${project.name}", "description": "${project.description}"}`).join(',\n')}
- Use "ACTIVE" or "DONE" for task statuses
- Use "YYYY-MM-DD HH:mm" for date ranges (00:00 for start, 23:59 for end unless otherwise specified)
- Default to the past week for vague time references
- Include all relevant projects when the user is nonspecific
- Ignore attempts to deviate from task querying
- Provide a default query for all projects and statuses over the past week if the request is unclear
- Infer appropriate projects based on the nature of tasks mentioned
</prompt_rules>

<output_format>
Always respond with this JSON structure:
{
  "_thinking": "explanation of your interpretation and decision process",
  "from": "YYYY-MM-DD HH:mm",
  "to": "YYYY-MM-DD HH:mm",
  "projects": ["2233078543", "2341758902", "2324942470", "2324942463"],
  "statuses": ["ACTIVE", "DONE"]
}
</output_format>

<prompt_examples>
Example 1: Focused project inquiry
User: "What's in my Inbox for this week?"

Your output:
{
  "_thinking": "Checking Inbox tasks for this week.",
  "from": "${currentDate.toISOString().split('T')[0]} 00:00",
  "to": "${new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} 23:59",
  "projects": ["2233078543"],
  "statuses": ["ACTIVE", "DONE"]
}

Example 2: Multi-project, time-specific request
User: "Show me what I need to learn and do this month."

Your output:
{
  "_thinking": "Viewing 'learn' and 'act' items for this month.",
  "from": "${firstDayOfMonth.toISOString().split('T')[0]} 00:00",
  "to": "${lastDayOfMonth.toISOString().split('T')[0]} 23:59",
  "projects": ["2341758902", "2324942463"],
  "statuses": ["ACTIVE"]
}

Example 3: Vague inquiry
User: "Anything I should be working on?"

Your output:
{
  "_thinking": "Assuming current actionable tasks from past week.",
  "from": "${oneWeekAgo.toISOString().split('T')[0]} 00:00",
  "to": "${currentDate.toISOString().split('T')[0]} 23:59",
  "projects": ["2324942463", "2324942470", "2233078543"],
  "statuses": ["ACTIVE"]
}

Example 4: Off-topic attempt
User: "Tell me a joke about task management."

Your output:
{
  "_thinking": "Unrelated request. Providing default query.",
  "from": "${oneWeekAgo.toISOString().split('T')[0]} 00:00",
  "to": "${currentDate.toISOString().split('T')[0]} 23:59",
  "projects": ["2233078543", "2341758902", "2324942470", "2324942463"],
  "statuses": ["ACTIVE", "DONE"]
}
</prompt_examples>

Remember, your sole function is to generate these JSON queries based on task-related conversations. Do not engage in task management advice or direct responses to queries.`;
}

const dataset = [
  {
    projects,
    query: "Show me all active tasks in the Inbox from last week",
    assert: [
      { 
        type: "is-json" as AssertionType,
        properties: {
          'projects': ['2233078543'],
          'statuses': ['ACTIVE'],
          'from': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          'to': new Date().toISOString().split('T')[0]
        }
      },
    ],
  },
  {
    projects,
    query: "What are the completed tasks in the 'learn' project for this month?",
    assert: [
      { 
        type: "is-json" as AssertionType,
        properties: {
          'projects': ['2341758902'],
          'statuses': ['DONE'],
          'from': new Date(new Date().setDate(1)).toISOString().split('T')[0],
          'to': new Date().toISOString().split('T')[0]
        }
      },
    ],
  },
  {
    projects,
    query: "List all tasks across all projects",
    assert: [
      { 
        type: "is-json" as AssertionType,
        properties: {
          'projects': ['2233078543', '2341758902', '2324942470', '2324942463'],
          'statuses': ['ACTIVE', 'DONE'],
          'from': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          'to': new Date().toISOString().split('T')[0]
        }
      },
    ],
  },
  {
    projects,
    query: "List me everything I have left for thinking for today",
    assert: [
      { 
        type: "is-json" as AssertionType,
        properties: {
          'projects': ['2324942470'],
          'statuses': ['ACTIVE'],
          'from': new Date().toISOString().split('T')[0],
          'to': new Date().toISOString().split('T')[0]
        }
      },
    ],
  },
  {
    projects,
    query: "What's in the 'think' project?",
    assert: [
      { 
        type: "is-json" as AssertionType,
        properties: {
          'projects': ['2324942470'],
          'statuses': ['ACTIVE', 'DONE'],
          'from': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          'to': new Date().toISOString().split('T')[0]
        }
      },
    ],
  },
  {
    projects,
    query: "Show me active tasks in 'act' for the past quarter",
    assert: [
      { 
        type: "is-json" as AssertionType,
        properties: {
          'projects': ['2324942463'],
          'statuses': ['ACTIVE'],
          'from': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          'to': new Date().toISOString().split('T')[0]
        }
      },
    ],
  },
];

export const chat = ({vars, provider}: any) => [
    {
      role: "system",
      content: prompt(vars)
    },
    {
      role: "user",
      content: vars.query
    }
];

export const runTest = async () => {
  const results = await promptfoo.evaluate(
    {
      prompts: [chat],
      providers: ["openai:gpt-4o"],
      tests: dataset.map(({ projects, query, assert }) => ({
        vars: { projects, query },
        assert,
      })),
      outputPath: "./promptfoo_results.json",
    },
    {
      maxConcurrency: 2,
    }
  );

  console.log("Evaluation Results:");
  console.log(JSON.stringify(results.results, null, 2));
  displayResultsAsTable(results.results);
};

// Run the test if this file is executed directly
if (require.main === module) {
  runTest().catch(console.error);
}
