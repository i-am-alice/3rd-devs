import { OpenAIService } from "./OpenAIService";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import { TasksService } from "./TasksService";
import { prompt as understandPrompt } from "./prompts/understand";
import { prompt as addPrompt } from "./prompts/add_task";
import { prompt as updatePrompt } from "./prompts/update_task";
import { prompt as listPrompt } from "./prompts/list_tasks";
import { prompt as deletePrompt } from "./prompts/delete_task";

const openAIService = new OpenAIService();
const tasksService = new TasksService(process.env.TODOIST_API_KEY as string);

const app = express();
const port = 8080;
app.use(express.json());
app.listen(port, () =>
  console.log(
    `Server running at http://localhost:${port}. Listening for POST /api/chat requests`
  )
);

const projects = [
  {
    uuid: "2233078543",
    name: "Inbox",
    description: "Uncategorized pending items",
  },
  {
    uuid: "2341758902",
    name: "Learn",
    description:
      "Knowledge acquisition, reading, learning from the courses, and skill development",
  },
  {
    uuid: "2324942470",
    name: "Think",
    description: "Notes, idea generation and contemplation",
  },
  {
    uuid: "2324942463",
    name: "Act",
    description:
      "Concrete tasks and actionable items such as creating content, coding, writing, etc.",
  },
];

app.post("/api/chat", async (req, res) => {
  console.log("Received request");
  await fs.writeFile("prompt.md", "");

  try {
    const { messages, conversation_uuid = uuidv4() } = req.body;
    const filteredMessages = messages.filter(
      (msg: any) => msg.role !== "system"
    );

    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const activeTasks = await tasksService.listTasksFromProjects(
      projects.map((project) => project.uuid),
      ["ACTIVE"],
      startDate,
      endDate
    );

    await tasksService.sync();

    const actions = await plan(filteredMessages, activeTasks);
    const results = await execute(actions, activeTasks);
    const completion = await answer(filteredMessages, results, projects);

    return res.json(completion);
  } catch (error) {
    console.error("Error in chat processing:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});

async function addTasks(query: string) {
  const tasks = (await openAIService.completion({
    messages: [
      { role: "system", content: addPrompt({ projects }) },
      { role: "user", content: query },
    ],
    jsonMode: true,
  })) as ChatCompletion;
  const { add } = JSON.parse(tasks.choices[0].message.content as string);
  console.log("Adding tasks", add);
  return await tasksService.addTasks(add);
}

async function updateTasks(query: string, activeTasks: any[]) {
  const updates = (await openAIService.completion({
    messages: [
      {
        role: "system",
        content: updatePrompt({ projects, tasks: activeTasks }),
      },
      { role: "user", content: query },
    ],
    jsonMode: true,
  })) as ChatCompletion;
  const { diff } = JSON.parse(updates.choices[0].message.content as string);
  console.log("Updating tasks", diff);
  return await tasksService.updateTasks(diff);
}

async function listTasks(query: string) {
  const listParams = (await openAIService.completion({
    messages: [
      { role: "system", content: listPrompt({ projects }) },
      { role: "user", content: query },
    ],
    jsonMode: true,
  })) as ChatCompletion;
  const {
    from,
    to,
    projects: projectIds,
    statuses,
  } = JSON.parse(listParams.choices[0].message.content as string);
  console.log("Listing tasks", from, to, projectIds, statuses);
  return await tasksService.listTasksFromProjects(
    projectIds,
    statuses,
    from,
    to
  );
}

async function deleteTasks(query: string, activeTasks: any[]) {
  console.log("Deleting tasks", activeTasks);
  const deleteParams = (await openAIService.completion({
    messages: [
      {
        role: "system",
        content: deletePrompt({ projects, tasks: activeTasks }),
      },
      { role: "user", content: query },
    ],
    jsonMode: true,
  })) as ChatCompletion;
  const { tasks_to_delete } = JSON.parse(
    deleteParams.choices[0].message.content as string
  );
  console.log("Deleting tasks", tasks_to_delete);
  return await tasksService.deleteTasks(tasks_to_delete);
}

async function plan(
  messages: ChatCompletionMessageParam[],
  activeTasks: any[]
) {
  const plan = (await openAIService.completion({
    messages: [
      {
        role: "system",
        content: understandPrompt({ projects, tasks: activeTasks }),
      },
      ...messages,
    ],
    jsonMode: true,
  })) as ChatCompletion;
  const actions = JSON.parse(plan.choices[0].message.content as string);
  console.log("Planning actions", actions);
  return actions;
}

async function execute(actions: any, activeTasks: any[]) {
  const { add, update, list, get, delete: deleteQuery } = actions;
  const results: Record<string, any> = {};

  if (add) results.addedTasks = await addTasks(add);
  if (update) results.updatedTasks = await updateTasks(update, activeTasks);
  if (list) results.tasks = await listTasks(list);
  if (deleteQuery)
    results.deletedTaskIds = await deleteTasks(deleteQuery, activeTasks);
  if (get) results.taskDetails = await tasksService.getTaskDetails(get);

  console.log("Executing actions", results);
  return results;
}

async function answer(
  messages: ChatCompletionMessageParam[],
  results: Record<string, any>,
  projects: any[]
) {
  const context = Object.entries(results)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");

  const allMessages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `As a user's tasks manager, answer the user's query, using the following information\n\n<context>${
        context || "No actions were taken"
      }</context>

      Note: if task include "previous_project" field, it means that the task was moved to a different project.
      
      <projects>${JSON.stringify(projects)}</projects>
      `,
    },
    ...messages,
  ];

  return (await openAIService.completion({
    messages: allMessages,
  })) as ChatCompletion;
}

await tasksService.sync();
const p = await tasksService.listProjects();
console.log(p);
