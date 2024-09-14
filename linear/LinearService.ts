import { LinearClient, Issue, Project, IssueConnection, ProjectConnection, WorkflowState } from '@linear/sdk';
import { OpenAIService } from './OpenAIService';

interface ProjectAssignment {
  _thoughts: string;
  name: string;
  id: string;
}

export class LinearService {
  private client: LinearClient;
  private openAIService: OpenAIService;
  private validProjectIds: Set<string>;

  constructor(apiKey: string) {
    this.client = new LinearClient({ apiKey });
    this.openAIService = new OpenAIService();
    this.validProjectIds = new Set();
    this.initializeValidProjectIds();
  }

  private async initializeValidProjectIds() {
    const projects = await this.fetchProjects();
    projects.nodes.forEach(project => {
      this.validProjectIds.add(project.id);
    });
  }

  async processIssueWebhook(action: string, data: any): Promise<void> {
    const issueDetails = this.extractIssueDetails(data);

    switch (action) {
      case 'create':
        console.log(`New issue created:`, issueDetails);
        if (!issueDetails.project) {
          await this.assignProjectToIssue(issueDetails.id, issueDetails.title, issueDetails.description);
        }
        break;
      case 'update':
        console.log(`Issue updated:`, issueDetails);
        break;
      case 'remove':
        console.log(`Issue removed:`, { id: issueDetails.id, title: issueDetails.title });
        break;
      default:
        console.log(`Unhandled action: ${action}`, issueDetails);
    }
  }

  private async assignProjectToIssue(issueId: string, title: string, description: string) {
    try {
      const assignment = await this.openAIService.assignProjectToTask(title, description);
      const projectId = this.validProjectIds.has(assignment.id) ? assignment.id : "ad799a5f-259c-4ff1-9387-efb949a56508"; // Default to overment

      await this.updateIssue(issueId, { projectId });
      console.log(`Assigned issue ${issueId} to project ${assignment.name} (${projectId})`);
    } catch (error) {
      console.error(`Error assigning project to issue ${issueId}:`, error);
    }
  }

  private extractIssueDetails(data: any) {
    const {
      id,
      title,
      description,
      priority,
      status,
      assignee,
      team,
      project,
      createdAt,
      updatedAt
    } = data;

    return {
      id,
      title,
      description: description?.slice(0, 100) + (description?.length > 100 ? '...' : ''),
      priority,
      status: status?.name,
      assignee: assignee?.name,
      team: team?.name,
      project: project?.name,
      createdAt,
      updatedAt
    };
  }

  async fetchProjects(): Promise<ProjectConnection> {
    return this.client.projects();
  }

  async fetchProjectDetails(projectId: string): Promise<Project | null> {
    return this.client.project(projectId);
  }

  async fetchProjectStatuses(projectId: string): Promise<string[]> {
    const project = await this.fetchProjectDetails(projectId);
    if (!project) return [];

    const teams = await project.teams();
    if (!teams.nodes.length) return [];

    const team = teams.nodes[0];
    const states = await team.states();
    return states.nodes.map((state: WorkflowState) => state.name);
  }

  async fetchIssues(projectId?: string): Promise<IssueConnection> {
    const filter: { project?: { id: { eq: string } } } = {};
    if (projectId) {
      filter.project = { id: { eq: projectId } };
    }
    return this.client.issues({ filter });
  }

  async updateIssue(issueId: string, updateData: { projectId?: string } & Partial<Issue>): Promise<Issue | null> {
    try {
      const result = await this.client.updateIssue(issueId, updateData);
      if (result.success && result.issue) {
        console.log(`Issue updated successfully: ${issueId}`);
        return result.issue;
      } else {
        console.log(`Failed to update issue: ${issueId}`);
        return null;
      }
    } catch (error) {
      console.error(`Error updating issue ${issueId}:`, error);
      throw error;
    }
  }
}
