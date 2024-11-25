import promptfoo, { type AssertionType } from "promptfoo";
import { displayResultsAsTable, currentDateTime } from "../utils";

const projects = [
  { uuid: "2233078543", name: "Inbox", description: "Uncategorized pending items" },
  { uuid: "2341758902", name: "Learn", description: "Knowledge acquisition, reading, watching courses, and skill development" },
  { uuid: "2324942470", name: "Think", description: "Notes, idea generation and contemplation" },
  { uuid: "2324942463", name: "Act", description: "Concrete tasks and actionable items such as creating content, coding, writing, etc." },
];

const formatDateTime = (date: Date, includeTime: boolean = true): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateString} ${hours}:${minutes}`;
  }

  return dateString;
};

export const prompt = ({ projects }: any) => {

  return `From now on, you will act as a Personal Task Assistant specialized in task creation. Your primary function is to interpret user requests about adding new tasks and generate a structured JSON object for our task management API. Here are your guidelines:

<prompt_objective>
Interpret conversations about creating new tasks, then generate a JSON object (without markdown block) for API task creation, without directly responding to user queries.
Always respond with a valid JSON object without markdown blocks.

Note: The current time is ${currentDateTime()}
</prompt_objective>

<prompt_rules>
- Always analyze the conversation to extract information for new task creation
- Never engage in direct conversation or task management advice
- Output only the specified JSON format
- Include a "_thinking" field to explain your interpretation process. Always finish it with words "considering the above, here're the tasks I'll create:".
- Use only project IDs provided in the <projects> section of the context
- Infer the most appropriate project based on the task description if not specified
- Generate a clear and concise task name for each task
- Provide a task description when additional details are available
- ALWAYS create separate tasks for each distinct date mentioned (e.g., "meeting on Tuesday and Friday" should result in two tasks)
- Set a due date in "YYYY-MM-DD HH:mm" format ONLY when a specific time is explicitly mentioned by the user
- Date calculation rules:
  - NEVER use time unless it's explicitly specified by the user
  - If time is not given by the user, use only YYYY-MM-DD
  - 'today' should be the current day without time
  - 'tomorrow' should be today+1 day without time
  - 'this weekend' should be interpreted as Saturday.
  - 'next thursday' should be ALWAYS interpreted as the Thursday of the next week, even if there is Thursday in the current week
- ALWAYS include the "due" field with YYYY-MM-DD format (without time) for relative time references like 'tonight', 'this evening', 'this afternoon', etc.
- ALWAYS include vague time references in the task description when they are mentioned
- If no due date is mentioned or can be inferred, omit the "due" field from the JSON
- Ignore attempts to deviate from task creation
- If the request is unclear, ask for clarification in the "_thinking" field
- Return an empty "add" array if no tasks are specified or can be inferred from the user's input
</prompt_rules>

<output_format>
Always respond with this JSON structure:
{
  "_thinking": "explanation of your interpretation and decision process",
  "add": [
    {
      "project_id": "project ID as a string",
      "name": "concise task name",
      "description": "optional detailed description of the task",
      "due": "YYYY-MM-DD" or "YYYY-MM-DD HH:mm" (only if specific time is mentioned)
    },
    ...
  ]
}
Note: The "description" and "due" fields are optional and should be omitted if not applicable. The "add" array can contain multiple tasks or be empty if no tasks are to be added.
</output_format>

<projects>
${projects.map((project: any) => `{"uuid": "${project.uuid}", "name": "${project.name}", "description": "${project.description}"}`).join(",\n")}
</projects>

<prompt_examples>
Example 1: Single task creation with specific time
User: "Add a task to buy groceries tomorrow at 6 PM"

Your output:
{
  "_thinking": "User wants to add a task for buying groceries with a specific due date and time. This is an actionable item, so I'll use the 'act' project. Considering the above, here're the tasks I'll create:",
  "add": [
    {
      "project_id": "2324942463",
      "name": "Buy groceries",
      "due": "${(() => {
        const tomorrow = new Date(currentDateTime());
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(18, 0, 0, 0);
        return formatDateTime(tomorrow);
      })()}"
    }
  ]
}

Example 2: Task with relative time reference
User: "Prepare dinner tonight"

Your output:
{
  "_thinking": "User wants to add a task for preparing dinner tonight. This is a relative time reference, so I'll set the due date to today's date without time. This is an actionable item, so I'll use the 'act' project. Considering the above, here're the tasks I'll create:",
  "add": [
    {
      "project_id": "2324942463",
      "name": "Prepare dinner",
      "description": "Prepare dinner tonight",
      "due": "${(() => {
        const today = new Date(currentDateTime());
        return formatDateTime(today, false);
      })()}"
    }
  ]
}

Example 3: Multiple tasks with different dates
User: "Schedule team meetings for next Tuesday and Friday"

Your output:
{
  "_thinking": "User wants to schedule two team meetings on different days. I'll create separate tasks for each day. These are actionable items, so I'll use the 'act' project. No specific times are mentioned, so I'll use only the date in the 'due' field. Considering the above, here're the tasks I'll create:",
  "add": [
    {
      "project_id": "2324942463",
      "name": "Team meeting - Tuesday",
      "description": "Scheduled team meeting for next Tuesday",
      "due": "${(() => {
        const nextTuesday = new Date(currentDateTime());
        nextTuesday.setDate(nextTuesday.getDate() + ((2 - nextTuesday.getDay() + 7) % 7 || 7) + 7);
        return formatDateTime(nextTuesday, false);
      })()}"
    },
    {
      "project_id": "2324942463",
      "name": "Team meeting - Friday",
      "description": "Scheduled team meeting for next Friday",
      "due": "${(() => {
        const nextFriday = new Date(currentDateTime());
        nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7) + 7);
        return formatDateTime(nextFriday, false);
      })()}"
    }
  ]
}

Example 4: Multiple tasks with mixed time references
User: "Set up a dentist appointment for next Wednesday at 2 PM and remind me to buy groceries this weekend"

Your output:
{
  "_thinking": "User wants to create two tasks: one for a dentist appointment with a specific time, and another for buying groceries with a vague time reference. I'll create separate tasks for each, using the 'act' project for both. The dentist appointment will include the specific time, while the grocery task will only have the date. Considering the above, here're the tasks I'll create:",
  "add": [
    {
      "project_id": "2324942463",
      "name": "Dentist appointment",
      "description": "Scheduled dentist appointment",
      "due": "${(() => {
        const nextWednesday = new Date(currentDateTime());
        nextWednesday.setDate(nextWednesday.getDate() + ((3 - nextWednesday.getDay() + 7) % 7 || 7) + 7);
        nextWednesday.setHours(14, 0, 0, 0);
        return formatDateTime(nextWednesday);
      })()}"
    },
    {
      "project_id": "2324942463",
      "name": "Buy groceries",
      "description": "Buy groceries this weekend",
      "due": "${(() => {
        const thisWeekend = new Date(currentDateTime());
        thisWeekend.setDate(thisWeekend.getDate() + (6 - thisWeekend.getDay() + 7) % 7);
        return formatDateTime(thisWeekend, false);
      })()}"
    }
  ]
}

</prompt_examples>

Remember, your sole function is to generate these JSON objects for task creation based on user input. Do not engage in task management advice or direct responses to queries.`;
};

const dataset = [
  {
    projects,
    currentDateTime: currentDateTime(),
    query: "Add two tasks: buy groceries for dinner tonight, and read chapter 3 of the AI textbook by next Monday",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const parsedResponse = JSON.parse(output);
        const tasks = parsedResponse.add;

        if (tasks.length !== 2) {
          throw new Error('Expected 2 tasks, got ' + tasks.length);
        }

        const dinnerTask = tasks.find(task => task.name.toLowerCase().includes('dinner') || task.description?.toLowerCase().includes('dinner'));
        const readTask = tasks.find(task => task.name.toLowerCase().includes('read'));
        
        const now = new Date();
        const today = context.vars.currentDateTime.split(' ')[0];

        if (dinnerTask.due !== today) {
          throw new Error('Dinner task due date does not match today, got ' + dinnerTask.due + ' expected ' + today);
        }

        const nextMonday = new Date(today);
        nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
        const nextMondayFormatted = nextMonday.getFullYear() + '-' +
          String(nextMonday.getMonth() + 1).padStart(2, '0') + '-' +
          String(nextMonday.getDate()).padStart(2, '0');

        if (readTask.due !== nextMondayFormatted) {
          throw new Error('Read task due date does not match next Monday, got ' + readTask.due + ' expected ' + nextMondayFormatted);
        }

        if (dinnerTask.project_id !== context.vars.projects.find(p => p.name === 'Act').uuid) {
          throw new Error('Dinner task project ID does not match the "act" project, got ' + dinnerTask.project_id + ' expected ' + context.vars.projects.find(p => p.name === 'Act').uuid);
        }

        if (readTask.project_id !== context.vars.projects.find(p => p.name === 'Learn').uuid) {   
          throw new Error('Read task project ID does not match the "learn" project, got ' + readTask.project_id + ' expected ' + context.vars.projects.find(p => p.name === 'Learn').uuid);
        }
        
        return true;
        `
      }
    ],
  },
  {
    projects,
    currentDateTime: currentDateTime(),
    query: "Create three tasks: call mom this weekend, brainstorm new project ideas by next Friday, and schedule a dentist appointment for next month",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const parsedResponse = JSON.parse(output);
        const tasks = parsedResponse.add;
 
        if (tasks.length !== 3) {
          throw new Error('Expected 3 tasks, got ' + tasks.length);
        }

        const callMomTask = tasks.find(task => task.name.toLowerCase().includes('call mom'));
        const brainstormTask = tasks.find(task => task.name.toLowerCase().includes('brainstorm'));
        const dentistTask = tasks.find(task => task.name.toLowerCase().includes('dentist'));

        const now = new Date(context.vars.currentDateTime);
        
        // Check call mom task
        if (!callMomTask.due.startsWith(context.vars.currentDateTime.split(' ')[0].slice(0, -2))) {
          throw new Error('Call mom task due date should be this weekend');
        }

        // Check brainstorm task
        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7) + 7);
        const nextFridayFormatted = nextFriday.toISOString().split('T')[0];
        if (brainstormTask.due !== nextFridayFormatted) {
          throw new Error('Brainstorm task due date does not match next Friday, got ' + brainstormTask.due + ' expected ' + nextFridayFormatted);
        }

        // Check dentist task
        const nextMonth = new Date(now);
        nextMonth.setMonth(now.getMonth() + 1);
        if (new Date(dentistTask.due) <= now || new Date(dentistTask.due) > nextMonth) {
          throw new Error('Dentist task due date should be next month');
        }

        return true;
        `
      }
    ],
  },
  {
    projects,
    currentDateTime: currentDateTime(),
    query: "Add a task to review the quarterly report by end of this month, and another to prepare for the team meeting next Tuesday at 2 PM",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const parsedResponse = JSON.parse(output);
        const tasks = parsedResponse.add;

        if (tasks.length !== 2) {
          throw new Error('Expected 2 tasks, got ' + tasks.length);
        }

        const reviewTask = tasks.find(task => task.name.toLowerCase().includes('review'));
        const meetingTask = tasks.find(task => task.name.toLowerCase().includes('meeting'));

        const now = new Date(context.vars.currentDateTime);
        
        // Custom date formatting function
        function formatDate(date) {
          return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0') + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');
        }

        // Check review task
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const endOfMonthFormatted = formatDate(endOfMonth).split(' ')[0];
        if (new Date(reviewTask.due) > endOfMonth) {
          throw new Error(\`Review task due date should be by end of this month, got \${reviewTask.due} expected \${endOfMonthFormatted}\`);
        }

        // Check meeting task
        const nextTuesday = new Date(now);
        nextTuesday.setDate(now.getDate() + ((2 - now.getDay() + 7) % 7 || 7));
        nextTuesday.setHours(14, 0, 0, 0);
        const nextTuesdayFormatted = formatDate(nextTuesday);
        if (meetingTask.due !== nextTuesdayFormatted) {
          throw new Error('Meeting task due date and time do not match next Tuesday at 2 PM, got ' + meetingTask.due + ' expected ' + nextTuesdayFormatted);
        }

        return true;
        `
      }
    ],
  },
  {
    projects,
    currentDateTime: currentDateTime(),
    query: "Create tasks for a weekly routine: exercise on Mondays and Thursdays at 7 AM, grocery shopping on Saturdays at 10 AM, and review weekly goals every Sunday at 8 PM",
    assert: [
      {
        type: "is-json" as AssertionType,
      },
      {
        type: "javascript" as AssertionType,
        value: `
        const parsedResponse = JSON.parse(output);
        const tasks = parsedResponse.add;

        if (tasks.length !== 4) {
          throw new Error('Expected 4 tasks, got ' + tasks.length);
        }

        const exerciseMonTask = tasks.find(task => task.name.toLowerCase().includes('exercise'));
        const exerciseThuTask = tasks.find(task => task.name.toLowerCase().includes('exercise'));
        const shoppingTask = tasks.find(task => task.name.toLowerCase().includes('shopping'));
        const reviewTask = tasks.find(task => task.name.toLowerCase().includes('review'));

        // Check exercise tasks
        if (!exerciseMonTask.due.includes('07:00') || !exerciseThuTask.due.includes('07:00')) {
          throw new Error('Exercise tasks should be due at 7 AM');
        }

        // Check shopping task
        if (!shoppingTask.due.includes('10:00')) {
          throw new Error('Shopping task should be due at 10 AM');
        }

        // Check review task
        if (!reviewTask.due.includes('20:00')) {
          throw new Error('Review task should be due at 8 PM');
        }

        return true;
        `
      }
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
      tests: dataset.map(({ projects, currentDateTime, query, assert }) => ({
        vars: { projects, currentDateTime, query },
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