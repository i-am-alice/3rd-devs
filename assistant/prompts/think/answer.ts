import type { State } from "../../types";

export const prompt = (state: State) => `
Inform the user about the tasks you've performed. Be concise but informative.

<memories>
${state.memories.map(m => 
    `<memory category="${m.category}">${m.name}: ${m.content}</memory>`
).join('\n')}
</memories>

<performed_tasks>
${state.tasks.map(task => 
    `<task name="${task.name}" status="${task.status}">
    <description>${task.description}</description>
    ${task.actions.map(action => 
        `<action tool="${action.tool_name}" status="${action.status}">
        ${action.result ? `<result>${typeof action.result.data === 'string' ? action.result.data : JSON.stringify(action.result.data)}</result>` : ''}
        </action>`
    ).join('\n')}
    </task>`
).join('\n')}
</performed_tasks>
`;