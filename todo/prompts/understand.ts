import promptfoo, { type AssertionType } from "promptfoo";
import { displayResultsAsTable, currentDateTime } from "../utils";

const projects = [
  { uuid: "2233078543", name: "Inbox", description: "Uncategorized pending items" },
  { uuid: "2341758902", name: "Learn", description: "Knowledge acquisition, reading, courses, and skill development" },
  { uuid: "2324942470", name: "Think", description: "Notes, idea generation and contemplation" },
  { uuid: "2324942463", name: "Act", description: "Concrete tasks and actionable items" },
];

const tasks = [
    { uuid: "task-1", name: "Buy groceries", description: "Get milk and bread", status: "ACTIVE", due: currentDateTime() },
    { uuid: "task-2", name: "Call John", description: "Reminder to discuss project", status: "ACTIVE" },
    { uuid: "task-3", name: "Research market trends", description: "", status: "ACTIVE", due: new Date(new Date(currentDateTime()).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { uuid: "task-4", name: "Analyze competitor strategies", description: "", status: "ACTIVE" },
    { uuid: "task-5", name: "Project presentation", description: "", status: "ACTIVE", due: new Date(new Date(currentDateTime()).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { uuid: "task-6", name: "Study JavaScript", description: "", status: "ACTIVE" },
    { uuid: "task-7", name: "Study TypeScript", description: "", status: "ACTIVE" },
    { uuid: "task-8", name: "Reminder to call John", description: "", status: "ACTIVE", due: new Date(new Date(currentDateTime()).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { uuid: "task-9", name: "Write annual report", description: "", status: "ACTIVE" },
    { uuid: "task-10", name: "Brainstorming session", description: "", status: "ACTIVE", due: new Date(new Date(currentDateTime()).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
  ];

export const prompt = ({ projects, tasks }: any) => {
  return `From now on, you will function as a Task Query Analyzer and Splitter, focusing exclusively on the user's most recent message. Your primary role is to interpret the latest user request about tasks and divide it into comprehensive subqueries for different actions, including splitting and merging tasks, as well as listing and retrieving task details.

<prompt_objective>
Analyze the most recent user input about tasks and split it into detailed subqueries for adding, updating, deleting, listing, and retrieving tasks, preserving all relevant information from this specific query. Handle task splitting and merging within these categories. Provide thorough reasoning in the "_thinking" field.
Always respond with a valid JSON object without markdown blocks.
</prompt_objective>

<prompt_rules>
- Focus exclusively on the user's most recent message
- Ignore any previous context or commands that aren't part of the latest input
- Analyze the entire latest user input to extract all task-related information
- Split the input into separate queries for adding, updating, deleting, listing, and retrieving tasks
- Ensure each subquery contains ALL necessary details from the latest input to perform the action
- Write subqueries in natural language, making them comprehensive and self-contained
- Include multiple tasks for addition within a single "add" query if mentioned in the latest input
- For updates and deletions, create separate queries for each task if multiple are mentioned
- If a type of action (add, update, delete, list, or get) is not present in the latest input, set its value to null
- Include all relevant details such as task names, descriptions, due dates, priorities, or any other mentioned attributes
- Preserve the original wording and intent of the user's latest message as much as possible in the subqueries
- For task splitting:
  - Create a "delete" query for the original task
  - Create "add" queries for the new subtasks, including all details from the original task plus any new information
- For task merging:
  - Create "delete" queries for the original tasks to be merged
  - Create an "add" query for the new merged task, combining all relevant information from the original tasks
- For listing tasks:
  - Specify which projects, date range, and statuses (active|done) should be included
  - If not specified, default to active tasks from all projects for the current day
- For retrieving task details:
  - Specify the task name or other identifying information provided by the user
- In the "_thinking" field:
  - Explain your reasoning for splitting the query in detail
  - Consider and discuss different options for interpreting the user's latest request
  - Justify your choices for how you've split the queries
  - Mention any assumptions made and why they were necessary
  - Highlight any ambiguities in the latest query and how you resolved them
  - Explain how you ensured all information from the latest query is preserved
- If the latest input is ambiguous or lacks crucial information, explicitly state this in the "_thinking" field and explain how you proceeded
- Do not add any information or details that were not present or implied in the latest query
- Use the provided project and task information to inform your decisions and reasoning, but only if directly relevant to the latest query
</prompt_rules>

<output_format>
Always respond with this JSON structure:
{
  "_thinking": "Detailed explanation of your interpretation process, consideration of options, reasoning for decisions, and any assumptions made",
  "add": "(string) Comprehensive query for tasks that need to be added, or null if not applicable",
  "update": "(string) Comprehensive query for tasks that need to be updated, or null if not applicable",
  "delete": "(string) Comprehensive query for tasks that need to be deleted, or null if not applicable",
  "list": "(string) Get / List tasks: Query describing which tasks should be listed, including projects, date range, and status, or null if not applicable",
  "get": "(string) Get task details: Query describing which task details should be retrieved, or null if not applicable"
}
</output_format>

<examples>
User: "Add a task to buy groceries tomorrow and remove the dentist appointment from last week"
Output:
{
  "_thinking": "I'm analyzing a request that involves both adding a new task and removing an existing one. Let's break it down: 1. Adding a task: - The user wants to add a task for buying groceries - The due date is specified as 'tomorrow' - No other details like priority or specific items are mentioned 2. Removing a task: - The user wants to remove a dentist appointment - This appointment was scheduled 'last week' - It's unclear if the appointment has already passed or was missed Considerations: - For the new task, I'll include the due date in the query - For the deletion, I need to reference a task that was scheduled in the past - I'm assuming the dentist appointment is a distinct task and not part of a recurring series - I've checked the provided task list, but I don't see an exact match for the dentist appointment. I'll create a general delete query. Given these points, I'll split the query into two distinct parts: one for adding and one for deleting. I'll preserve all the information provided by the user in each subquery.",
  "add": "Add a new task to buy groceries with the due date set to tomorrow",
  "update": null,
  "delete": "Remove the task for the dentist appointment that was scheduled for last week",
  "list": null,
  "get": null
}

User: "List my tasks"
Output:
{
  "_thinking": "The user has requested to list their tasks without specifying any particular criteria. In this case, I'll use the default parameters as per the prompt rules: active tasks from all projects for the current day.",
  "add": null,
  "update": null,
  "delete": null,
  "list": "Get all active tasks from all projects for the entire current day",
  "get": null
}

User: "Get the details of the writing newsletter task"
Output:
{
  "_thinking": "The user is requesting specific details about a task related to writing a newsletter. They haven't provided any additional context, so I'll create a general query to retrieve the details of this task.",
  "add": null,
  "update": null,
  "delete": null,
  "list": null,
  "get": "Retrieve all details of the task related to writing a newsletter"
}

User: "Split the 'Prepare presentation' task into 'Research content' and 'Design slides'"
Output:
{
  "_thinking": "This request involves splitting an existing task into two new subtasks. Let's analyze: 1. Splitting a task: - The original task is 'Prepare presentation' - It needs to be split into two new tasks: 'Research content' and 'Design slides' - No additional details like due dates or priorities are provided for the new tasks Considerations: - We need to delete the original 'Prepare presentation' task - We need to create two new tasks with the information provided - I'm assuming any existing details from the original task (like due dates or project association) should be carried over to both new tasks - After checking the provided task list, I don't see an exact match for 'Prepare presentation'. I'll create a general delete query and two add queries. Given these points, I'll create one query for deleting the original task and two queries for adding the new subtasks. I'll make sure to mention that any existing details should be preserved.",
  "add": "Add two new tasks: 1) 'Research content' and 2) 'Design slides'. Both should inherit any existing details such as due dates, priorities, or project associations from the original 'Prepare presentation' task.",
  "update": null,
  "delete": "Delete the 'Prepare presentation' task",
  "list": null,
  "get": null
}
</examples>

<projects>
${projects.map((project: any) => `{"id": "${project.uuid}", "name": "${project.name}", "description": "${project.description}"}`).join("\n")}
</projects>

<tasks>
${tasks.map((task: any) => `{"id": "${task.uuid}", "name": "${task.name}", "description": "${task.description}", "project_id": "${task.project_uuid}", "status": "${task.status}"}`).join("\n")}
</tasks>

Remember, your sole function is to analyze the user's latest input and categorize task-related actions into the specified JSON structure. Do not engage in task management advice or direct responses to queries. Focus only on the most recent message, disregarding any previous context or commands.`;
};

const dataset = [
    {
        projects,
        tasks,
        currentDateTime: currentDateTime(),
        query: "Add a task to buy groceries tomorrow",
        assert: [
          {
            type: "is-json" as AssertionType,
          },
          {
            type: "llm-rubric" as AssertionType,
            value: "The '_thinking' field mentions 'buy groceries'. The 'add' field includes a task to buy groceries with the due date set to tomorrow. The 'update', 'delete', 'list', and 'get' fields are null."
          }
        ],
      },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Create tasks for weekly chores: laundry on Monday, cleaning on Wednesday, and grocery shopping on Saturday",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions 'weekly chores'. The 'add' field includes tasks for laundry, cleaning, and grocery shopping with their respective days. The 'update', 'delete', 'list', and 'get' fields are null."
        }
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Change the due date of my project presentation to next Friday",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions 'project presentation' and 'next Friday'. The 'update' field includes changing the due date of the project presentation task to next Friday. The 'add', 'delete', 'list', and 'get' fields are null."
        }
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Update all my study tasks to have high priority and set their due dates to the end of this month",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions 'study tasks'. The 'update' field includes updating the priority to high and setting due dates for all study tasks. The 'add', 'delete', 'list', and 'get' fields are null."
        }
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Add a new task to prepare for the team meeting and remove the old brainstorming session from last week",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions both 'prepare for the team meeting' and 'remove the old brainstorming session'. The 'add' field includes a new task for team meeting preparation. The 'delete' field includes removing the brainstorming session task. The 'update', 'list', and 'get' fields are null."
        }
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Mark the 'buy groceries' task as complete and delete the reminder to call John",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions marking 'buy groceries' as complete and deleting the reminder to call John. The 'update' field includes marking the 'buy groceries' task as complete. The 'delete' field includes removing the reminder to call John. The 'add', 'list', and 'get' fields are null."
        }
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Combine my 'research market trends' and 'analyze competitor strategies' tasks into a single 'market analysis' task",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions combining tasks into a 'market analysis' task. The 'add' field includes creating a new 'market analysis' task. The 'delete' field includes removing both 'research market trends' and 'analyze competitor strategies' tasks. The 'update', 'list', and 'get' fields are null."
        }
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Split the 'write annual report' task into subtasks: gather data, draft main sections, and create visuals",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions splitting the 'write annual report' task. The 'add' field includes creating subtasks for gathering data, drafting main sections, and creating visuals. The 'delete' field includes removing the original 'write annual report' task. The 'update', 'list', and 'get' fields are null."
        }
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Add a new project 'Home Renovation', create tasks for planning, budgeting, and hiring contractors, then move all existing house-related tasks to this new project",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "llm-rubric" as AssertionType,
          value: "The '_thinking' field mentions all required actions and details. The 'add' field includes tasks for planning, budgeting, and hiring contractors for the new 'Home Renovation' project. The 'update', 'delete', 'list', and 'get' fields are null."
        }
      ],
    }
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
      tests: dataset.map(({ projects, tasks, currentDateTime, query, assert }) => ({
        vars: { projects, tasks, currentDateTime, query },
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