import { v9 as Todoist } from 'todoist';

export class TasksService {
    private todoist: any;

    constructor(token: string) {
        this.todoist = Todoist(token);
    }

    async sync() {
        await this.todoist.sync();
    }

    async addTasks(tasks: { name: string, project_id?: string, due?: string, description?: string }[]) {
        
        const promises = tasks.map(async task => {
            const newItem = await this.todoist.items.add({
                content: task.name,
                project_id: task.project_id,
                due: { date: task.due },
                description: task.description
            });
            
            return newItem;
        });
        return Promise.all(promises);
    }

    async updateTasks(tasks: { task_id: string, project_id?: string, content?: string, due?: string, status?: string, description?: string }[]) {
        const promises = tasks.map(async task => {
            let previousProjectId: string | undefined;

            if (task.project_id) {
                previousProjectId = task.project_id;
                await this.todoist.items.move({ id: task.task_id, project_id: task.project_id });
            }

            const updateData: any = {
                id: task.task_id,
                content: task.content || undefined,
                due: task.due ? { date: task.due } : undefined,
                project_id: task.project_id || undefined,
                checked: task.status === 'DONE',
                description: task.description || undefined
            };

            if (task.status === 'DONE') {
                await this.todoist.items.close({ id: task.task_id });
            }

            await this.todoist.items.update(updateData);
            
            const updatedTask = this.todoist.items.get().find(item => item.id === task.task_id);
            
            if (previousProjectId) {
                updatedTask.previous_project = previousProjectId;
            }

            return updatedTask;
        });
        return Promise.all(promises);
    }

    async deleteTasks(taskIds: string[]) {
        
        const promises = taskIds.map(async id => {
            await this.todoist.items.delete({ id });
            
            return id; // Return the ID of the deleted task
        });
        return Promise.all(promises);
    }

    async listProjects() {
        return this.todoist.projects.get();
    }

    async getProjectData(projectId: string) {
        await this.todoist.sync();
        return this.todoist.projects.get();
    }

    async syncData() {
        await this.todoist.sync();
        return {
            projects: this.todoist.projects.get(),
            tasks: this.todoist.items.get()
        };
    }

    async listTasksFromProjects(projectIds: string[], statuses?: string[], startDate?: string, endDate?: string) {
        const { projects, tasks } = await this.syncData();

        const relevantProjects = projects.filter(project => projectIds.includes(project.id));
        const relevantTasks = tasks.filter(task => projectIds.includes(task.project_id));

        // Apply filters
        return relevantTasks.filter((task: any) => {
            // Status check
            if (statuses && statuses.length > 0) {
                const taskStatus = task.checked ? 'DONE' : 'ACTIVE';
                if (!statuses.includes(taskStatus)) return false;
            }
            
            // Date filtering
            if (startDate || endDate) {
                const taskDate = task.due?.date ? new Date(task.due.date + 'T00:00:00Z') : null;
                if (taskDate) {
                    if (startDate && taskDate < new Date(startDate)) return false;
                    if (endDate && taskDate > new Date(endDate)) return false;
                }
            }
            
            return true;
        });
    }

    async getTaskDetails(taskId: string) {
        
        return this.todoist.items.get().find(task => task.id === taskId);
    }
}
