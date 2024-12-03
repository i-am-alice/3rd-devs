import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type { State, Task } from "./types";

import { OpenAIService } from "./OpenAIService";
import { prompt as environmentPrompt } from "./prompts/think/environment";
import { prompt as personalityPrompt } from "./prompts/think/personality";
import { prompt as memoryPrompt } from "./prompts/think/memory";
import { prompt as toolsPrompt } from "./prompts/think/tools";
import { prompt as taskPrompt } from "./prompts/think/task";
import { prompt as actionPrompt } from "./prompts/think/action";
import { prompt as usePrompt } from "./prompts/think/use";
import { prompt as answerPrompt } from "./prompts/think/answer";
import { v4 } from "uuid";

const memory_categories = [
  {
    name: "profiles",
    description:
      "Profiles of people you know, their names, preferences, and other details about them",
  },
  {
    name: "resources",
    description:
      "Learning materials, articles, and references for study and research",
  },
  { name: "tasks", description: "Tasks of the user you have in your memory" },
  {
    name: "events",
    description: "Past or upcoming events, meetings, and important dates",
  },
];
const tools = [
  {
    name: "spotify",
    description: "Use this to play music and search for the music",
    instruction: 'To play music write { "play": "<song name>" }',
  },
  {
    name: "google",
    description: "Use this to search the web",
    instruction: 'To search the web write { "search": "<search query>" }',
  },
  {
    name: "linear",
    description: "Use this to manage tasks",
    instruction: 'To create a task write { "create_task": "<task name>" }',
  },
  {
    name: "calendar",
    description: "Use this to check the calendar",
    instruction: 'To check the calendar write { "calendar": "" }',
  },
  {
    name: "memory",
    description:
      "Use this to search your memory / recall information about yourself, the user and your general knowledge",
    instruction: 'To search your memory write { "memory": "<memory name>" }',
  },
  {
    name: "final_answer",
    description: "Use this to answer the user",
    instruction: 'To answer the user write { "answer": "<answer>" }',
  },
];
const environment =
  "Krakow, Poland. Sunny. 20°C. At home. Wetlands by Nora En Pure is playing now";
const personality = `You're speaking to an AI_devs student who is a generative AI developer who loves music. You're curious and happy to chat. The user uses Linear to manage tasks`;

const memories = [
  {
    name: "Favorite songs",
    category: "profiles",
    content:
      "AC/DC — Back in Black, Queen — Bohemian Rhapsody, Led Zeppelin — Stairway to Heaven, Guns N' Roses — Sweet Child o' Mine, Nirvana — Smells Like Teen Spirit",
  },
  {
    name: "Finish S05E02 lesson of AI_devs",
    category: "tasks",
    content: "No content",
  },
  {
    name: `What's really going on in machine learning? Steven Wolfram`,
    category: "resources",
    content:
      "https://writings.stephenwolfram.com/2024/08/whats-really-going-on-in-machine-learning-some-minimal-models/",
  },
  {
    name: `What's ChatGPT is doing and why it works`,
    category: "resources",
    content:
      "https://writings.stephenwolfram.com/2023/02/what-is-chatgpt-doing-and-why-does-it-work/",
  },
];

const state: State = {
  config: {
    max_steps: 10,
    step: 0,
    task: null,
    action: null,
    ai_name: "Alice",
    username: "Adam",
    environment,
    personality,
    memory_categories,
    tools,
  },
  thoughts: { environment: "", personality: "", memory: "", tools: "" },
  tasks: [],
  documents: [],
  memories: [],
  tools: tools,
  messages: [],
};

const mockToolHandlers = {
  memory: (payload: { memory: string }): { status: string; data: any } => {
    const songMemory = memories.find((m) => m.name === "Favorite songs");
    return {
      status: "success",
      data: songMemory || "No memory found",
    };
  },
  spotify: (payload: { play: string }): { status: string; data: string } => {
    return {
      status: "success",
      data: `Now playing: ${payload.play}`,
    };
  },
  final_answer: async (payload: {
    answer: string;
  }): Promise<{ status: string; data: string }> => {
    const finalResponse = (await openai.completion({
      messages: [
        { role: "system", content: answerPrompt(state) },
        ...state.messages,
      ],
    })) as ChatCompletion;

    return {
      status: "success",
      data: finalResponse.choices[0].message.content || "No response generated",
    };
  },
};

const openai = new OpenAIService();

async function executeThinkingPhase(state: State, userMessage: string) {
  const [environmentThoughts, personalityThoughts] = (await Promise.all([
    openai.completion({
      messages: [
        { role: "system", content: environmentPrompt(state) },
        { role: "user", content: userMessage },
      ],
      jsonMode: true,
    }),
    openai.completion({
      messages: [
        { role: "system", content: personalityPrompt(state) },
        { role: "user", content: userMessage },
      ],
      jsonMode: true,
    }),
  ])) as [ChatCompletion, ChatCompletion];

  const { result: environmentAnalysis } = JSON.parse(
    environmentThoughts.choices[0].message.content || "{}"
  );
  const { result: personalityAnalysis } = JSON.parse(
    personalityThoughts.choices[0].message.content || "{}"
  );

  state.thoughts.environment = environmentAnalysis;
  state.thoughts.personality = personalityAnalysis;

  const [memoryAnalysis, toolsAnalysis] = (await Promise.all([
    openai.completion({
      messages: [
        { role: "system", content: memoryPrompt(state) },
        { role: "user", content: userMessage },
      ],
      jsonMode: true,
    }),
    openai.completion({
      messages: [
        { role: "system", content: toolsPrompt(state) },
        { role: "user", content: userMessage },
      ],
      jsonMode: true,
    }),
  ])) as [ChatCompletion, ChatCompletion];

  const { result: memoryReflection } = JSON.parse(
    memoryAnalysis.choices[0].message.content || "{}"
  );
  const { result: toolsReflection } = JSON.parse(
    toolsAnalysis.choices[0].message.content || "{}"
  );

  state.thoughts.memory = memoryReflection;
  state.thoughts.tools = toolsReflection;

  console.log("\n=== Thinking Phase Results ===");
  console.log("Environment:", environmentAnalysis);
  console.log("Personality:", personalityAnalysis);
  console.log("Memory:", memoryReflection);
  console.log("Tools:", toolsReflection);
}

async function executePlanningPhase(state: State, userMessage: string) {
  const taskThoughts = (await openai.completion({
    messages: [
      { role: "system", content: taskPrompt(state) },
      { role: "user", content: userMessage },
    ],
    jsonMode: true,
  })) as ChatCompletion;

  const { result: taskReflection } = JSON.parse(
    taskThoughts.choices[0].message.content || "{}"
  );

  // Process each task from the reflection
  const updatedTasks = taskReflection.map((reflectedTask: Partial<Task>) => {
    if (reflectedTask.uuid) {
      // Update existing task
      const existingTask = state.tasks.find(
        (t) => t.uuid === reflectedTask.uuid
      );
      if (existingTask && existingTask.status === "pending") {
        return {
          ...existingTask,
          name: reflectedTask.name,
          description: reflectedTask.description,
          updated_at: new Date().toISOString(),
        };
      }
      return existingTask; // Return unchanged if completed or not found
    } else {
      // Create new task
      return {
        uuid: v4(),
        conversation_uuid: v4(),
        status: "pending",
        name: reflectedTask.name,
        description: reflectedTask.description,
        actions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  });

  // Update state with processed tasks
  state.tasks = updatedTasks;

  const firstPendingTask = state.tasks.find(
    (task) => task.status === "pending"
  );
  if (firstPendingTask) {
    state.config.task = firstPendingTask.uuid;
  }

  const actionThoughts = (await openai.completion({
    messages: [
      { role: "system", content: actionPrompt(state) },
      { role: "user", content: userMessage },
    ],
    jsonMode: true,
  })) as ChatCompletion;

  const { result: actionReflection } = JSON.parse(
    actionThoughts.choices[0].message.content || "{}"
  );

  if (actionReflection) {
    const taskToUpdate = state.tasks.find(
      (task) => task.uuid === actionReflection.task_uuid
    );

    if (taskToUpdate) {
      const action = {
        uuid: v4(),
        task_uuid: taskToUpdate.uuid,
        ...actionReflection,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        result: null,
        payload: {},
      };

      taskToUpdate.actions = [action];
      state.config.task = taskToUpdate.uuid;
      state.config.action = action.uuid;
    }
  }

  console.log("\n=== Planning Phase Results ===");
  console.log("Tasks:", state.tasks);
  const currentTask = state.tasks.find((t) => t.uuid === state.config.task);
  const currentAction = currentTask?.actions.find(
    (a) => a.uuid === state.config.action
  );
  console.log("Current Task:", currentTask?.name || "None");
  console.log("Current Action:", currentAction?.name || "None");
}

async function executeActionPhase(state: State, userMessage: string) {
  if (!state.config.task || !state.config.action) return;

  const useThoughts = (await openai.completion({
    messages: [
      { role: "system", content: usePrompt(state) },
      { role: "user", content: userMessage },
    ],
    jsonMode: true,
  })) as ChatCompletion;

  const { result: useReflection } = JSON.parse(
    useThoughts.choices[0].message.content || "{}"
  );

  const task = state.tasks.find((t) => t.uuid === state.config.task);
  const action = task?.actions.find((a) => a.uuid === state.config.action);

  if (task && action) {
    action.payload = useReflection;

    const toolHandler =
      mockToolHandlers[action.tool_name as keyof typeof mockToolHandlers];
    if (toolHandler) {
      action.result = await toolHandler(useReflection);

      // Ten fragment kodu jest tylko na potrzeby tego przykładu. Zwykle pamięć będzie obsługiwana analogicznie jak pozostałe narzędzia.
      if (action && action.tool_name === "memory") {
        state.memories.push({
          name: action.result.data.name,
          category: action.result.data.category,
          content: action.result.data.content,
        });
        action.result = {
          status: "success",
          data: `Memory "${action.result.data.name}" recalled successfully`,
        };
      }
      console.log("\n=== Action Phase Results ===");
      console.log(`${action.tool_name} result:`, action.result);
    }
  }
}

async function executeLoop(state: State, userMessage: string) {
  state.config.step = 0;
  state.messages = [...state.messages, { role: "user", content: userMessage }];

  // Gather initial thoughts / general context
  await executeThinkingPhase(state, userMessage);

  while (state.config.step < state.config.max_steps) {
    console.log(`\n=== Starting Step ${state.config.step + 1} ===`);
    await executePlanningPhase(state, userMessage);
    await executeActionPhase(state, userMessage);

    // Check current action before updating state
    const currentTask = state.tasks.find(
      (task) => task.uuid === state.config.task
    );
    const currentAction = currentTask?.actions.find(
      (action) => action.uuid === state.config.action
    );

    if (!currentAction || currentAction?.tool_name === "final_answer") {
      console.log("\n=== Loop Complete ===");
      break;
    }

    // Update task status and find next task after checking loop continuation
    if (currentTask) {
      currentTask.status = "completed";
      const nextTask = state.tasks.find((t) => t.status === "pending");
      if (nextTask) {
        state.config.task = nextTask.uuid;
        state.config.action = nextTask.actions[0]?.uuid || null;
      } else {
        state.config.task = null;
        state.config.action = null;
      }
    }

    state.config.step++;
  }
}

// Execute the loop
const userMessage = `Play my fav music`;
await executeLoop(state, userMessage);
console.log("\n=== Final State ===");
console.log(JSON.stringify(state, null, 2));
