import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Agent } from "./AgentService";
import type { State } from "./types/agent";
import type { ChatCompletion, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { instruction as webInstruction } from "./prompts/web/web";

const app = express();
const port = 3000;

app.use(express.json());
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const state: State = {
  config: { max_steps: 10, current_step: 0, active_step: null },
  messages: [],
  tools: [
    {
      uuid: uuidv4(),
      name: "web_search",
      description: "Use this to search the web for external information",
      instruction: webInstruction,
      parameters: JSON.stringify({
        query: `Command to the web search tool, including the search query and all important details, keywords and urls from the avilable context`
      }),
    },
    {
      uuid: uuidv4(),
      name: "final_answer",
      description: "Use this tool to write a message to the user",
      instruction: "...",
      parameters: JSON.stringify({}),
    },
  ],
  documents: [],
  actions: [],
};

app.post("/api/chat", async (req, res) => {
  let { messages, conversation_uuid } = req.body;
  state.messages =
    messages.length === 1 ? [...state.messages, ...messages.filter((m: ChatCompletionMessageParam) => m.role !== "system")] : messages.filter((m: ChatCompletionMessageParam) => m.role !== "system");

  const agent = new Agent(state);

  for (let i = 0; i < state.config.max_steps; i++) {
    // Make a plan  
    const nextMove = await agent.plan();
    console.log('Thinking...', nextMove._thinking);
    console.table([{
      Tool: nextMove.tool,
      Query: nextMove.query
    }]);
    // If there's no tool to use, we're done
    if (!nextMove.tool || nextMove.tool === "final_answer") break;
    // Set the active step
    state.config.active_step = { name: nextMove.tool, query: nextMove.query };
    // Generate the parameters for the tool
    const parameters = await agent.describe(nextMove.tool, nextMove.query);
    // Use the tool
    await agent.useTool(nextMove.tool, parameters, conversation_uuid);

    // Increase the step counter
    state.config.current_step++;
  }

  // Generate the answer
  const answer = await agent.generateAnswer() as ChatCompletion;
  state.messages = [...state.messages, answer.choices[0].message];
  return res.json(answer);
});
