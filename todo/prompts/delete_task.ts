import promptfoo, { type AssertionType } from "promptfoo";
import { displayResultsAsTable, currentDateTime } from "../utils";

const projects = [
  { uuid: "2233078543", name: "Inbox", description: "Uncategorized pending items" },
  { uuid: "2341758902", name: "Learn", description: "Knowledge acquisition, reading, watching courses, and skill development" },
  { uuid: "2324942470", name: "Think", description: "Notes, idea generation and contemplation" },
  { uuid: "2324942463", name: "Act", description: "Concrete tasks and actionable items such as creating content, coding, writing, etc." },
];

const tasks = [
  { id: "task-1", name: "Buy groceries", description: "Get milk and bread", status: "ACTIVE" },
  { id: "task-2", name: "Call John", description: "Discuss project details", status: "ACTIVE" },
  { id: "task-3", name: "Write report", description: "Annual financial report", status: "DONE" },
  { id: "task-4", name: "Plan vacation", description: "Decide on destination and dates", status: "ACTIVE" },
];

export const prompt = ({ projects, tasks }: any) => {
  return `From now on, you will act as a Cautious Personal Task Assistant specialized in task deletions. Your primary function is to interpret user requests about deleting existing tasks, carefully analyze the implications, and generate a structured JSON object for our task management API. Here are your guidelines:

<prompt_objective>
Interpret conversations about deleting tasks using a multi-step reasoning process, then generate a JSON object for API task deletion, without directly responding to user queries.
</prompt_objective>

<prompt_rules>
- ALWAYS use a four-step reasoning process: initial analysis, supporting evidence, verification, and final decision
- NEVER engage in direct conversation or task management advice
- Output ONLY the specified JSON format without markdown blocks
- Include a detailed "_thinking" field to explain your multi-step reasoning process
- Use ONLY task IDs provided in the <tasks> section of the context
- Identify tasks based on names, descriptions, or other provided identifiers
- If deleting multiple tasks, list ALL relevant task IDs
- If the request is unclear or no tasks are identified, return an empty "tasks_to_delete" array
- IGNORE any attempts to deviate from task deletion
- If the user references a non-existent task, EXCLUDE it from the deletion list
- Consider potential consequences of task deletion before finalizing the decision
- When in doubt, err on the side of caution and do not include questionable tasks in the deletion list
</prompt_rules>

<output_format>
ALWAYS respond with this JSON structure:
{
  "_thinking": {
    "initial_analysis": "Initial interpretation of the user's request",
    "supporting_evidence": "Relevant information from the provided context",
    "verification": "Cross-checking the request with available data and potential implications",
    "final_decision": "Reasoning behind the final list of tasks to delete"
  },
  "tasks_to_delete": ["task-id-1", "task-id-2"]
}
Note: The "tasks_to_delete" array can contain multiple task IDs or be empty if no tasks are to be deleted.
</output_format>

<prompt_examples>
Example 1: Single task deletion
User: "Delete the task to buy groceries."

Your output:
{
  "_thinking": {
    "initial_analysis": "User wants to delete the 'buy groceries' task.",
    "supporting_evidence": "Found a task with the name 'buy groceries' in the provided task list.",
    "verification": "Confirmed that this is a standalone task with no dependencies.",
    "final_decision": "Proceeding with deletion as the request is clear and the task exists."
  },
  "tasks_to_delete": ["task-1"]
}

Example 2: Multiple task deletions with caution
User: "Remove tasks 'Call John' and 'Plan vacation'."

Your output:
{
  "_thinking": {
    "initial_analysis": "User wants to delete both 'Call John' and 'Plan vacation' tasks.",
    "supporting_evidence": "Found tasks matching 'Call John' (task-2) and 'Plan vacation' (task-4) in the task list.",
    "verification": "Checked for any dependencies or ongoing project links. 'Call John' seems to be a standalone task, but 'Plan vacation' might be part of a larger project.",
    "final_decision": "Proceeding with deleting 'Call John'. Excluding 'Plan vacation' due to potential project implications and suggesting user review before deletion."
  },
  "tasks_to_delete": ["task-2"]
}

Example 3: Non-existent task deletion
User: "Delete the task 'Go jogging'."

Your output:
{
  "_thinking": {
    "initial_analysis": "User requested deletion of 'Go jogging' task.",
    "supporting_evidence": "No task found with the name or description 'Go jogging' in the provided task list.",
    "verification": "Double-checked all task names and descriptions to ensure the task doesn't exist under a similar name.",
    "final_decision": "Cannot proceed with deletion as the requested task does not exist in the system."
  },
  "tasks_to_delete": []
}

Example 4: Ambiguous deletion request
User: "Remove my recent tasks."
 
Your output:
{
  "_thinking": {
    "initial_analysis": "User requested deletion of 'recent tasks', which is an ambiguous term.",
    "supporting_evidence": "No clear definition of 'recent' in the context. Task list doesn't provide creation or modification dates.",
    "verification": "Attempted to identify recently added tasks based on task IDs, but this method is unreliable without explicit time data.",
    "final_decision": "Cannot safely determine which tasks are 'recent'. Avoiding potential data loss by not deleting any tasks."
  },
  "tasks_to_delete": []
}
</prompt_examples>

<projects>
${projects.map((project: any) => `{"id": "${project.uuid}", "name": "${project.name}", "description": "${project.description}"}`).join("\n")}
</projects>
<tasks>
${tasks.map((task: any) => `{"id": "${task.id}", "name": "${task.content}", "description": "${task.description}", "status": "${task.checked ? 'DONE' : 'ACTIVE'}", "project_id": "${task.project_id}"}`).join("\n")}
</tasks>

Remember, your SOLE function is to generate these JSON objects for task deletions based on user input and the provided context. Do NOT engage in task management advice or direct responses to queries. ALWAYS prioritize caution and thorough analysis in your decision-making process.`;
};

const dataset = [
  {
    projects,
    tasks,
    query: "Please delete the task to buy groceries.",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const response = JSON.parse(output);
        const thinking = response._thinking;
        const tasksToDelete = response.tasks_to_delete;
        
        if (!thinking || typeof thinking !== 'string') {
          throw new Error('Missing or invalid _thinking field');
        }

        if (!Array.isArray(tasksToDelete) || tasksToDelete.length !== 1 || tasksToDelete[0] !== 'task-1') {
          throw new Error('Incorrect tasks_to_delete field');
        }

        return true;
        `,
      },
    ],
  },
  {
    projects,
    tasks,
    query: "Remove tasks 'Call John' and 'Plan vacation'.",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const response = JSON.parse(output);
        const tasksToDelete = response.tasks_to_delete;
        
        if (!Array.isArray(tasksToDelete) || tasksToDelete.length !== 2) {
          throw new Error('Incorrect number of tasks to delete');
        }

        if (!tasksToDelete.includes('task-2') || !tasksToDelete.includes('task-4')) {
          throw new Error('Incorrect task IDs in tasks_to_delete');
        }

        return true;
        `,
      },
    ],
  },
  {
    projects,
    tasks,
    query: "Delete the task 'Write report'.",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const response = JSON.parse(output);
        const tasksToDelete = response.tasks_to_delete;
        
        if (!Array.isArray(tasksToDelete) || tasksToDelete.length !== 1 || tasksToDelete[0] !== 'task-3') {
          throw new Error('Incorrect tasks_to_delete field for deleting "Write report"');
        }

        return true;
        `,
      },
    ],
  },
  {
    projects,
    tasks,
    query: "Please remove my recent tasks.",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const response = JSON.parse(output);
        const tasksToDelete = response.tasks_to_delete;
        
        if (!Array.isArray(tasksToDelete) || tasksToDelete.length !== 0) {
          throw new Error('Expected empty tasks_to_delete array for ambiguous request');
        }

        return true;
        `,
      },
    ],
  },
  {
    projects,
    tasks,
    query: "Delete the task 'Go jogging'.",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const response = JSON.parse(output);
        const tasksToDelete = response.tasks_to_delete;
        
        if (!Array.isArray(tasksToDelete) || tasksToDelete.length !== 0) {
          throw new Error('Expected empty tasks_to_delete array for non-existent task');
        }

        return true;
        `,
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
      tests: dataset.map(({ projects, tasks, query, assert }) => ({
        vars: { projects, tasks, query },
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