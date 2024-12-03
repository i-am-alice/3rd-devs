
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type Config = {
    max_steps: number;
    step: number;
    task: string | null;
    action: string | null;
    ai_name: string;
    username: string;
    environment: string;
    personality: string;
    memory_categories: { name: string, description: string }[];
    tools: { name: string, description: string }[];
}

export type Task = {
    uuid: string;
    conversation_uuid: string;
    status: 'pending' | 'completed' | 'failed';
    name: string;
    actions: Action[];
    description: string;
    created_at: string;
    updated_at: string;
}

interface ActionResult {
    status: string;
    data: any;
}

export type Action = {
    uuid: string;
    task_uuid: string;
    name: string;
    tool_name: string;
    payload: Record<string, any>;
    result: ActionResult | null;
    status: 'pending' | 'completed' | 'failed';
    sequence: number;
    description: string;
}

export type Document = {
    uuid: string;
    conversation_uuid: string;
    text: string;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export type Memory = {
    name: string;
    category: string;
    content: string;
}

export type Tool = {
    name: string;
    description: string;
    instruction: string;
}

export type State = {
    config: Config;
    thoughts: { environment: string, personality: string, memory: string, tools: string };
    tasks: Task[];
    documents: Document[];
    memories: Memory[];
    tools: Tool[];
    messages: ChatCompletionMessageParam[];
}
