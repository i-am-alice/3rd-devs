import OpenAI from "openai";
import { z } from "zod";
import { zodFunction } from "openai/helpers/zod";
import type { ChatCompletionCreateParamsBase, ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
const openai = new OpenAI();

function web_search(query: string) {
  return {
    results: [{ url: "https://example.com", title: "Example", description: "Example description" }]
  };
}

function send_email(title: string, content: string, address: string) {
  return {
    success: true
  };
}

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information about a given query",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up information",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email to a specified address",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The subject line of the email",
          },
          content: {
            type: "string",
            description: "The body content of the email",
          },
          address: {
            type: "string",
            description: "The recipient's email address",
          }
        },
        required: ["title", "content", "address"],
        additionalProperties: false,
      },
    },
  }
];

const messages: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: "You are a helpful assistant at adam@overment.com"
  },
  {
    role: "user",
    content: "Send me test email"
  }
];

// Process the initial response with tool calls
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages,
  tools
});


console.log(JSON.stringify(response.choices[0].message));

// Add assistant's message with tool calls to conversation
messages.push(response.choices[0].message);

let newThread: ChatCompletionMessageParam[] = [];
newThread.push(response.choices[0].message);
// Process each tool call and add results
for (const toolCall of response.choices[0].message.tool_calls || []) {
  let result;
  const args = JSON.parse(toolCall.function.arguments);
  
  if (toolCall.function.name === "web_search") {
    result = await web_search(args.query);
  } else if (toolCall.function.name === "send_email") {
    result = await send_email(args.title, args.content, args.address);
  }
  
  // Add tool result to conversation
  messages.push({
    role: "tool",
    content: JSON.stringify(result),
    tool_call_id: toolCall.id
  });
  newThread.push({
    role: "tool",
    content: JSON.stringify(result),
    tool_call_id: toolCall.id
  });
}

// Get final response with tool results
const finalResponse = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: newThread
});

// Add final assistant response
messages.push(finalResponse.choices[0].message);

console.log(messages);