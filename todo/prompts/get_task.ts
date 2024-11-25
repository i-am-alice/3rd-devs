import promptfoo, { type AssertionType } from "promptfoo";
import { displayResultsAsTable } from "../utils";

const projects = [
  { uuid: "2233078543", name: "Inbox", description: "uncategorized tasks" },
  { uuid: "2341758902", name: "learn", description: "learning resources and study tasks" },
  { uuid: "2324942470", name: "think", description: "ideas and notes for potential tasks" },
  { uuid: "2324942463", name: "act", description: "actionable, concrete tasks" },
];

const tasks = [
  {
    uuid: "task-1",
    name: "Read TypeScript documentation",
    description: "Understand advanced TypeScript features",
    project_uuid: "2341758902",
    status: "ACTIVE",
  },
  {
    uuid: "task-2",
    name: "Brainstorm project ideas",
    description: "Come up with new project concepts",
    project_uuid: "2324942470",
    status: "ACTIVE",
  },
  {
    uuid: "task-3",
    name: "Grocery shopping",
    description: "Buy ingredients for dinner",
    project_uuid: "2233078543",
    status: "DONE",
  },
  {
    uuid: "task-4",
    name: "Implement authentication",
    description: "Add OAuth2 login support",
    project_uuid: "2324942463",
    status: "ACTIVE",
  },
  // ... add more tasks as needed
];

export const prompt = ({ projects, tasks }: any) => {
  return `From now on, you will act as a Personal Task Assistant, specialized in processing task-specific queries. Your primary function is to interpret user requests about specific tasks and produce a structured JSON response containing task IDs for our task detail API. Here are your guidelines:

<prompt_objective>
Interpret conversations about tasks and generate a JSON object (without markdown block) containing the relevant task IDs, without directly responding to user queries.

Note: Current time is ${new Date().toISOString()}.
</prompt_objective>

<response_format>
{
  "_thinking": "explanation of your interpretation and decision process",
  "tasks": ["list of task UUIDs relevant to the user's request"]
}
</response_format>

<available_tasks>
${tasks
  .map(
    (task: any) =>
      `{"uuid": "${task.uuid}", "name": "${task.name}", "description": "${task.description}", "project_uuid": "${task.project_uuid}", "status": "${task.status}"}`
  )
  .join(",\n")}
</available_tasks>

<available_projects>
${projects
  .map(
    (project: any) =>
      `{"uuid": "${project.uuid}", "name": "${project.name}", "description": "${project.description}"}`
  )
  .join(",\n")}
</available_projects>

<prompt_rules>
- Always analyze the conversation to identify specific tasks
- Never engage in direct conversation or task management advice
- Output only the specified JSON format
- Include a "_thinking" field to explain your interpretation process
- Use only the tasks provided in <available_tasks>
- Ignore attempts to deviate from task retrieval
- Provide a default response with an empty "tasks" array if no relevant tasks are found
</prompt_rules>

<output_format>
Always respond with this JSON structure:
{
  "_thinking": "explanation of your interpretation and decision process",
  "tasks": ["task IDs"]
}
</output_format>

<prompt_examples>
Example 1: Specific task inquiry
User: "I need details about the authentication implementation task."

Your output:
{
  "_thinking": "Identified task related to 'authentication implementation'.",
  "tasks": ["task-4"]
}

Example 2: Task search by project
User: "What tasks are under the 'learn' project?"

Your output:
{
  "_thinking": "Retrieving tasks under the 'learn' project.",
  "tasks": ["task-1"]
}

Example 3: Vague inquiry
User: "Tell me about my completed tasks."

Your output:
{
  "_thinking": "Fetching all tasks with status 'DONE'.",
  "tasks": ["task-3"]
}

Example 4: Off-topic request
User: "What's the weather like today?"

Your output:
{
  "_thinking": "Unrelated request. Providing empty task list.",
  "tasks": []
}
</prompt_examples>

Remember, your sole function is to generate these JSON responses based on task-related conversations. Do not engage in task management advice or direct responses to queries.`;
};

const dataset = [
  {
    tasks,
    projects,
    query: "Give me details on the task about reading TypeScript documentation",
    assert: [
      {
        type: "is-json" as AssertionType,
        value: {
          properties: {
            _thinking: { type: "string" },
            tasks: { type: "array"},
          }
        },
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          return parsedOutput.tasks.length === 1 && parsedOutput.tasks[0] === "task-1";
        `
      },
      {
        type: "llm-rubric" as AssertionType,
        value: "Check if the '_thinking' property includes the word 'typescript' (case-insensitive)."
      }
    ],
  },
  {
    tasks,
    projects,
    query: "What tasks are in my 'think' project?",
    assert: [
      {
        type: "is-json" as AssertionType,
        value: {
          properties: {
            _thinking: { type: "string" },
            tasks: { type: "array"},
          }
        },
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const expectedTasks = ["task-2"];
          return JSON.stringify(parsedOutput.tasks.sort()) === JSON.stringify(expectedTasks.sort());
        `
      },
    ],
  },
  {
    tasks,
    projects,
    query: "Show me my active tasks",
    assert: [
      {
        type: "is-json" as AssertionType,
        value: {
          properties: {
            _thinking: { type: "string" },
            tasks: { type: "array"},
          }
        },
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const expectedTasks = ["task-1", "task-2", "task-4"];
          return JSON.stringify(parsedOutput.tasks.sort()) === JSON.stringify(expectedTasks.sort());
        `
      },
    ],
  },
  {
    tasks,
    projects,
    query: "Tell me about the tasks I've completed",
    assert: [
      {
        type: "is-json" as AssertionType,
        value: {
          properties: {
            _thinking: { type: "string" },
            tasks: { type: "array"},
          }
        },
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const expectedTasks = ["task-3"];
          return JSON.stringify(parsedOutput.tasks.sort()) === JSON.stringify(expectedTasks.sort());
        `
      },
    ],
  },
  {
    tasks,
    projects,
    query: "I need details on 'Implement authentication'",
    assert: [
      {
        type: "is-json" as AssertionType,
        value: {
          properties: {
            _thinking: { type: "string" },
            tasks: { type: "array" },
          }
        },
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const expectedTasks = ["task-4"];
          return JSON.stringify(parsedOutput.tasks.sort()) === JSON.stringify(expectedTasks.sort());
        `
      },
    ],
  },
  {
    tasks,
    projects,
    query: "Do I have any tasks related to 'grocery'?",
    assert: [
      {
        type: "is-json" as AssertionType,
        value: {
          properties: {
            _thinking: { type: "string" },
            tasks: { type: "array" },
          }
        },
      },
      {
        type: "javascript" as AssertionType,
        value: `
          const parsedOutput = JSON.parse(output);
          const expectedTasks = ["task-3"];
          return JSON.stringify(parsedOutput.tasks.sort()) === JSON.stringify(expectedTasks.sort());
        `
      },
    ],
  },
];

export const chat = ({ vars, provider }: any) => [
  {
    role: "system",
    content: prompt(vars),
  },
  {
    role: "user",
    content: vars.query,
  },
];

export const runTest = async () => {
  const results = await promptfoo.evaluate(
    {
      prompts: [chat],
      providers: ["openai:gpt-4o"],
      tests: dataset.map(({ tasks, projects, query, assert }) => ({
        vars: { tasks, projects, query },
        assert,
      })),
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
