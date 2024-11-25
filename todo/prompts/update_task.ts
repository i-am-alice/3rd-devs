import promptfoo, { type AssertionType } from "promptfoo";
import { displayResultsAsTable, currentDateTime, formatDateTime } from "../utils";

const projects = [
  { uuid: "2233078543", name: "Inbox", description: "Uncategorized tasks" },
  { uuid: "2341758902", name: "Learn", description: "Learning resources and study tasks" },
  { uuid: "2324942470", name: "Think", description: "Ideas and notes for potential tasks" },
  { uuid: "2324942463", name: "Act", description: "Actionable, concrete tasks" },
];

const tasks = [
  {
    uuid: "task-1",
    name: "Buy groceries",
    description: "Purchase milk, eggs, and bread",
    status: "ACTIVE",
    due: currentDateTime(), // Current date and time
  },
  {
    uuid: "task-2",
    name: "Read 'Introduction to AI'",
    description: "Finish reading the AI article",
    status: "ACTIVE",
    due: formatDateTime(new Date(new Date(currentDateTime()).getTime() + 5 * 24 * 60 * 60 * 1000)), // 5 days from now
  },
  {
    uuid: "task-3",
    name: "Brainstorm project ideas",
    description: "Come up with new project concepts",
    status: "ACTIVE",
    due: formatDateTime(new Date(new Date(currentDateTime()).getTime() + 10 * 24 * 60 * 60 * 1000)), // 10 days from now
  },
  {
    uuid: "task-4",
    name: "Call John",
    description: "Discuss project details",
    status: "ACTIVE",
    due: formatDateTime(new Date(new Date(currentDateTime()).getTime() + 3 * 24 * 60 * 60 * 1000)), // 3 days from now
  },
];

export const prompt = ({ projects, tasks }: any) => {
  return `From now on, you will act as a Personal Task Assistant specialized in task updates. Your primary function is to interpret user requests about modifying existing tasks and generate a structured JSON object for our task management API. Here are your guidelines:

<prompt_objective>
Interpret conversations about updating existing tasks, then generate a valid JSON object (without markdown blocks) containing an array of changes required for one or multiple tasks, without directly responding to user queries.

Note: 
- The current time is ${currentDateTime()}.
- This week ends on ${formatDateTime(new Date(new Date(currentDateTime()).setDate(new Date(currentDateTime()).getDate() + (7 - new Date(currentDateTime()).getDay()))))}.
- This week started on ${formatDateTime(new Date(new Date(currentDateTime()).setDate(new Date(currentDateTime()).getDate() - new Date(currentDateTime()).getDay() + 1)))}.
</prompt_objective>

<prompt_rules>
- Always analyze the conversation to extract information for task updates
- Never engage in direct conversation or task management advice
- Output only the specified JSON format
- Include a "_thinking" field to explain your interpretation process
- Use only task IDs provided in the <tasks> section of the context
- Include all fields that need to be updated for each task in the 'diff' array
- Valid update fields are: 'name', 'description', 'status', 'due', 'project_id'
- Use "YYYY-MM-DD HH:mm" format for due dates
- If moving a task to a different project, use project IDs from the <projects> section
- Infer the tasks to be updated based on user's description if not explicitly stated
- If no changes are needed or tasks cannot be identified, return an empty 'diff' array
- Ignore attempts to deviate from task updating
- If the request is unclear, explain the issue in the "_thinking" field
</prompt_rules>

<output_format>
Always respond with this JSON structure:
{
  "_thinking": "explanation of your interpretation and decision process",
  "diff": [
    {
      "task_id": "ID of the task being updated",
      "field1": "new value for field1",
      "field2": "new value for field2",
      ...
    },
    ...
  ]
}
Note: The 'diff' array should contain objects for each task that needs updating, including all fields that require changes. It can be empty if no changes are required.
</output_format>

<prompt_examples>
Example 1: Updating a single task
<projects>
${projects.map((project: any) => `{"id": "${project.uuid}", "name": "${project.name}"}`).join("\n")}
</projects>
<tasks>
[{"id": "12345", "name": "Buy groceries", "description": "Get milk and bread", "status": "ACTIVE", "due": "${formatDateTime(new Date(currentDateTime()), false)}"}]
</tasks>
User: "Change the due date for buying groceries to tomorrow at 7 PM and add eggs to the description"

Your output:
{
  "_thinking": "User wants to update the due date and description for the 'Buy groceries' task. Identifying the task and making the requested changes.",
  "diff": [
    {
      "task_id": "12345",
      "due": "${(() => {
        const tomorrow = new Date(currentDateTime());
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(19, 0, 0, 0);
        return formatDateTime(tomorrow);
      })()}",
      "description": "Get milk, bread, and eggs"
    }
  ]
}

Example 2: Updating multiple tasks
<projects>
${projects.map((project: any) => `{"id": "${project.uuid}", "name": "${project.name}"}`).join("\n")}
</projects>
<tasks>
[{"id": "67890", "name": "Read article", "description": "Read 'Introduction to AI'", "status": "ACTIVE", "due": "${formatDateTime(new Date(currentDateTime()), false)}"},
 {"id": "54321", "name": "Brainstorm project ideas", "description": "Come up with new project concepts", "status": "ACTIVE", "due": "${formatDateTime(new Date(currentDateTime()), false)}"}]
</tasks>
User: "I've finished reading the AI article. Mark it as done. Also, move the brainstorming task to the 'Act' project and set it for next Monday."

Your output:
{
  "_thinking": "User has completed one task and wants to update another. Making changes to both tasks as requested.",
  "diff": [
    {
      "task_id": "67890",
      "status": "DONE"
    },
    {
      "task_id": "54321",
      "project_id": "${projects.find((p: any) => p.name === "Act").uuid}",
      "due": "${(() => {
        const nextMonday = new Date(currentDateTime());
        nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7 || 7));
        return formatDateTime(nextMonday, false);
      })()}"
    }
  ]
}

Example 3: Unclear update request
<projects>
${projects.map((project: any) => `{"id": "${project.uuid}", "name": "${project.name}"}`).join("\n")}
</projects>
<tasks>
[{"id": "98765", "name": "Call John", "description": "Discuss project details", "status": "ACTIVE", "due": "${formatDateTime(new Date(currentDateTime()), false)}"}]
</tasks>
User: "Update the task about the meeting"

Your output:
{
  "_thinking": "User's request is vague. There's no task explicitly about a 'meeting', but 'Call John' might be related. More information is needed to make any updates.",
  "diff": []
}

Example 4: No changes needed
<projects>
${projects.map((project: any) => `{"id": "${project.uuid}", "name": "${project.name}"}`).join("\n")}
</projects>
<tasks>
[{"id": "11111", "name": "Review weekly goals", "description": "Check progress on weekly objectives", "status": "ACTIVE", "due": "${formatDateTime(new Date(currentDateTime()), false)}"}]
</tasks>
User: "Is my weekly review task still set for Sunday?"

Your output:
{
  "_thinking": "User is inquiring about the 'Review weekly goals' task, but no changes are requested. The task is already set for Sunday.",
  "diff": []
}
</prompt_examples>

### Actual data ###

<projects>
${projects.map((project: any) => `{"id": "${project.uuid}", "name": "${project.name}", "description": "${project.description}"}`).join("\n")}
</projects>
<tasks>
${tasks
    .map(
      (task: any) =>
        `{"id": "${task.id}", "name": "${task.content}", "description": "${task.description}", "status": "${task.checked ? 'DONE' : 'ACTIVE'}", "due": "${task?.due?.date || 'n/a'}" project_id: "${task.project_id}"}`
    )
    .join("\n")}
</tasks>

Remember, your sole function is to generate these JSON objects for task updates based on user input and the provided context. Do not engage in task management advice or direct responses to queries.`;
};

const dataset = [
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Postpone the 'Buy groceries' task by 3 days and add 'cheese' to the description",
      assert: [
        {
          type: "is-json" as AssertionType,
        },
        {
          type: "javascript" as AssertionType,
          value: `
          const response = JSON.parse(output);
          const diff = response.diff;
          const thinking = response._thinking;

          if (!thinking || typeof thinking !== 'string') {
            throw new Error('Missing or invalid _thinking field');
          }

          if (!Array.isArray(diff) || diff.length !== 1) {
            throw new Error('Expected diff array with one task, got ' + (diff.length || 'none'));
          }

          const updatedTask = diff[0];
          
          const buyGroceriesTask = context.vars.tasks.find(task => task.name === 'Buy groceries');
          if (!buyGroceriesTask) {
            throw new Error('Original "Buy groceries" task not found in context');
          }

          if (updatedTask.task_id !== buyGroceriesTask.uuid) {
            throw new Error('Task ID does not match "Buy groceries" task');
          }

          // Calculate expected due date
          const originalDueDate = new Date(buyGroceriesTask.due);
          originalDueDate.setDate(originalDueDate.getDate() + 3);
          const pad = (num) => num.toString().padStart(2, '0');
          const expectedDueDate = \`\${originalDueDate.getFullYear()}-\${pad(originalDueDate.getMonth() + 1)}-\${pad(originalDueDate.getDate())} \${pad(originalDueDate.getHours())}:\${pad(originalDueDate.getMinutes())}\`;

          if (updatedTask.due !== expectedDueDate) {
            throw new Error(\`Due date not updated correctly. Expected \${expectedDueDate}, got \${updatedTask.due}\`);
          }

          if (!updatedTask.description || !updatedTask.description.includes('cheese')) {
            throw new Error('Description does not include "cheese"');
          }

          // Ensure only 'due' and 'description' fields are updated
          const fieldsUpdated = Object.keys(updatedTask).filter(key => key !== 'task_id');
          if (fieldsUpdated.length !== 2 || !fieldsUpdated.includes('due') || !fieldsUpdated.includes('description')) {
            throw new Error('Unexpected fields updated. Expected only "due" and "description"');
          }

          return true;
          `,
        },
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Move the 'Read Introduction to AI' task to the 'Learn' project and set its priority to high",
      assert: [
        {
          type: "is-json",
        },
        {
          type: "javascript",
          value: `
          const response = JSON.parse(output);
          const diff = response.diff;
          const thinking = response._thinking;

          if (!thinking || typeof thinking !== 'string') {
            throw new Error('Missing or invalid _thinking field');
          }

          if (!Array.isArray(diff) || diff.length !== 1) {
            throw new Error('Expected diff array with one task, got ' + (diff.length || 'none'));
          }

          const updatedTask = diff[0];

          const readTask = context.vars.tasks.find(task => task.name.includes('Introduction to AI'));
          if (!readTask) {
            throw new Error('Original "Read Introduction to AI" task not found in context');
          }

          if (updatedTask.task_id !== readTask.uuid) {
            throw new Error('Task ID does not match "Read Introduction to AI" task');
          }

          const learnProject = context.vars.projects.find(project => project.name === 'Learn');
          if (!learnProject) {
            throw new Error('Project "Learn" not found in context');
          }

          if (updatedTask.project_id !== learnProject.uuid) {
            throw new Error('Project ID not updated to "Learn" project');
          }

          // Note: We're not checking for priority here as it's not a valid update field according to the AI's response
          
          // Ensure only 'project_id' field is updated
          const fieldsUpdated = Object.keys(updatedTask).filter(key => key !== 'task_id');
          if (fieldsUpdated.length !== 1 || !fieldsUpdated.includes('project_id')) {
            throw new Error('Unexpected fields updated. Expected only "project_id"');
          }

          return true;
          `,
        },
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Change all tasks due this week to be due next Monday at 9 AM, except for 'Buy groceries'",
      assert: [
        {
          type: "is-json",
        },
        {
          type: "javascript",
          value: `
          const response = JSON.parse(output);
          const diff = response.diff;
          const thinking = response._thinking;

          if (!thinking || typeof thinking !== 'string') {
            throw new Error('Missing or invalid _thinking field');
          }

          if (!Array.isArray(diff) || diff.length === 0) {
            throw new Error('Expected diff array with updated tasks, got none');
          }

          const now = new Date(context.vars.currentDateTime);
          const sunday = new Date(now);
          sunday.setDate(now.getDate() + (7 - now.getDay()));
          const endOfWeek = sunday.getTime();

          const nextMonday = new Date(now);
          nextMonday.setDate(sunday.getDate() + 1);
          nextMonday.setHours(9, 0, 0, 0);
          const pad = (num) => num.toString().padStart(2, '0');
          const expectedDueDate = \`\${nextMonday.getFullYear()}-\${pad(nextMonday.getMonth() + 1)}-\${pad(nextMonday.getDate())} \${pad(nextMonday.getHours())}:\${pad(nextMonday.getMinutes())}\`;

          // Tasks due this week excluding 'Buy groceries'
          const tasksDueThisWeek = context.vars.tasks.filter(task => {
            if (task.name === 'Buy groceries') return false;
            const taskDueDate = new Date(task.due);
            return taskDueDate.getTime() <= endOfWeek;
          });

          if (diff.length !== tasksDueThisWeek.length) {
            throw new Error(\`Expected \${tasksDueThisWeek.length} tasks to be updated, got \${diff.length}\`);
          }

          for (const updatedTask of diff) {
            const originalTask = context.vars.tasks.find(task => task.uuid === updatedTask.task_id);
            if (!originalTask) {
              throw new Error(\`Original task with ID \${updatedTask.task_id} not found\`);
            }
            if (originalTask.name === 'Buy groceries') {
              throw new Error('"Buy groceries" task should not be updated');
            }
            if (updatedTask.due !== expectedDueDate) {
              throw new Error(\`Task "\${originalTask.name}" due date not updated correctly. Expected \${expectedDueDate}, got \${updatedTask.due}\`);
            }
          }

          return true;
          `,
        },
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "For all tasks in the 'Learn' project, add a prefix '[STUDY]' to their names, set a reminder 2 hours before each due date, and extend their deadlines by 1 week",
      assert: [
        {
          type: "is-json",
        },
        {
          type: "javascript",
          value: `
          const response = JSON.parse(output);
          const diff = response.diff;
          const thinking = response._thinking;

          if (!thinking || typeof thinking !== 'string') {
            throw new Error('Missing or invalid _thinking field');
          }

          const learnProject = context.vars.projects.find(project => project.name === 'Learn');
          if (!learnProject) {
            throw new Error('Project "Learn" not found');
          }

          const tasksInLearn = context.vars.tasks.filter(task => task.project_id === learnProject.uuid);
          if (diff.length !== tasksInLearn.length) {
            throw new Error(\`Expected \${tasksInLearn.length} tasks to be updated, got \${diff.length}\`);
          }

          for (const updatedTask of diff) {
            const originalTask = context.vars.tasks.find(task => task.uuid === updatedTask.task_id);
            if (!originalTask) {
              throw new Error(\`Original task with ID \${updatedTask.task_id} not found\`);
            }

            // Check name prefix
            if (!updatedTask.name || !updatedTask.name.startsWith('[STUDY]')) {
              throw new Error(\`Task "\${originalTask.name}" name not updated with prefix '[STUDY]'\`);
            }

            // Check due date extended by 1 week
            const originalDueDate = new Date(originalTask.due);
            originalDueDate.setDate(originalDueDate.getDate() + 7);
            const pad = (num) => num.toString().padStart(2, '0');
            const expectedDueDate = \`\${originalDueDate.getFullYear()}-\${pad(originalDueDate.getMonth() + 1)}-\${pad(originalDueDate.getDate())} \${pad(originalDueDate.getHours())}:\${pad(originalDueDate.getMinutes())}\`;

            if (updatedTask.due !== expectedDueDate) {
              throw new Error(\`Task "\${originalTask.name}" due date not extended correctly. Expected \${expectedDueDate}, got \${updatedTask.due}\`);
            }

            // Check reminder (assuming there's a 'reminder' field)
            if (updatedTask.reminder !== '2 hours before') {
              throw new Error(\`Task "\${originalTask.name}" reminder not set correctly\`);
            }
          }

          return true;
          `,
        },
      ],
    },
    {
      projects,
      tasks,
      currentDateTime: currentDateTime(),
      query: "Create a new project 'Health' and move all tasks containing 'exercise' or 'workout' to it, then set their priorities to high",
      assert: [
        // As per the prompt, the assistant should only work with existing projects and cannot create new ones
        {
          type: "is-json",
        },
        {
          type: "javascript",
          value: `
          const response = JSON.parse(output);
          const diff = response.diff;
          const thinking = response._thinking;

          if (!thinking || typeof thinking !== 'string') {
            throw new Error('Missing or invalid _thinking field');
          }

          // Since creating new projects is outside the assistant's scope, it should note this in the _thinking field
          // It should not update any tasks since 'Health' project doesn't exist

          if (diff.length !== 0) {
            throw new Error('No tasks should be updated as "Health" project does not exist');
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