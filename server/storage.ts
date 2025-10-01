import { 
  type Workspace,
  type InsertWorkspace,
  type Project, 
  type InsertProject, 
  type Discussion, 
  type InsertDiscussion, 
  type Message, 
  type InsertMessage,
  type ContextItem,
  type InsertContextItem,
  type UserSettings,
  type InsertUserSettings,
  type GlobalContext,
  type InsertGlobalContext,
  type Agent,
  type InsertAgent,
  type Metric,
  type InsertMetric,
  workspaces,
  projects,
  discussions,
  messages,
  contextItems,
  userSettings,
  globalContext,
  companionAgent,
  agents,
  metrics
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Project and discussion management interface
export interface IStorage {
  // Workspace operations
  getWorkspace(id: string): Promise<Workspace | undefined>;
  getAllWorkspaces(): Promise<Workspace[]>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  deleteWorkspace(id: string): Promise<void>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getProjectsByWorkspace(workspaceId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project>;
  cloneProject(id: string, newName: string): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Discussion operations
  getDiscussion(id: string): Promise<Discussion | undefined>;
  getDiscussionsByProject(projectId: string): Promise<Discussion[]>;
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  updateDiscussion(id: string, updates: Partial<InsertDiscussion>): Promise<Discussion>;
  cloneDiscussion(id: string): Promise<Discussion>;
  deleteDiscussion(id: string): Promise<void>;
  
  // Message operations
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByDiscussion(discussionId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessagesByDiscussion(discussionId: string): Promise<void>;
  
  // Context operations (now project-level)
  getContextItem(id: string): Promise<ContextItem | undefined>;
  getContextItemsByProject(projectId: string): Promise<ContextItem[]>;
  createContextItem(item: InsertContextItem): Promise<ContextItem>;
  deleteContextItem(id: string): Promise<void>;
  
  // Settings operations
  getSettings(): Promise<UserSettings | undefined>;
  updateSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // Global context operations
  getGlobalContext(): Promise<GlobalContext[]>;
  createGlobalContext(item: InsertGlobalContext): Promise<GlobalContext>;
  deleteGlobalContext(id: string): Promise<void>;
  getGlobalContextByType(type: string): Promise<GlobalContext[]>;
  
  // Companion agent operations
  getCompanionData(): Promise<any | undefined>;
  updateCompanionData(data: { observations?: any[]; suggestions?: any[]; patternMemory?: any }): Promise<any>;
  addCompanionObservation(observation: any): Promise<void>;
  addCompanionSuggestion(suggestion: any): Promise<void>;
  
  // Agent methods
  getAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  deleteAgent(id: string): Promise<void>;
  
  // Metrics methods
  getMetrics(): Promise<Metric[]>;
  addMetric(metric: InsertMetric): Promise<Metric>;
}

export class DatabaseStorage implements IStorage {
  // Workspace operations
  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async getAllWorkspaces(): Promise<Workspace[]> {
    return await db.select().from(workspaces).orderBy(desc(workspaces.createdAt));
  }

  async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
    const [workspace] = await db
      .insert(workspaces)
      .values(insertWorkspace)
      .returning();
    return workspace;
  }

  async deleteWorkspace(id: string): Promise<void> {
    await db.delete(workspaces).where(eq(workspaces.id, id));
  }

  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async cloneProject(id: string, newName: string): Promise<Project> {
    // Get original project
    const originalProject = await this.getProject(id);
    if (!originalProject) {
      throw new Error('Project not found');
    }

    // Clone project with new name
    const [clonedProject] = await db
      .insert(projects)
      .values({
        workspaceId: originalProject.workspaceId,
        name: newName,
        description: originalProject.description,
        instructions: originalProject.instructions,
        isTemplate: false,
        templateSource: id
      })
      .returning();

    // Clone context items
    const contextItems = await this.getContextItemsByProject(id);
    for (const item of contextItems) {
      await this.createContextItem({
        projectId: clonedProject.id,
        type: item.type,
        name: item.name,
        content: item.content,
        metadata: item.metadata || {}
      });
    }

    return clonedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Discussion operations
  async getDiscussion(id: string): Promise<Discussion | undefined> {
    const [discussion] = await db.select().from(discussions).where(eq(discussions.id, id));
    return discussion || undefined;
  }

  async getDiscussionsByProject(projectId: string): Promise<Discussion[]> {
    return await db
      .select()
      .from(discussions)
      .where(eq(discussions.projectId, projectId))
      .orderBy(desc(discussions.createdAt));
  }

  async createDiscussion(insertDiscussion: InsertDiscussion): Promise<Discussion> {
    const [discussion] = await db
      .insert(discussions)
      .values(insertDiscussion)
      .returning();
    return discussion;
  }

  async updateDiscussion(id: string, updates: Partial<InsertDiscussion>): Promise<Discussion> {
    const [discussion] = await db
      .update(discussions)
      .set(updates)
      .where(eq(discussions.id, id))
      .returning();
    return discussion;
  }

  async cloneDiscussion(id: string): Promise<Discussion> {
    // Get original discussion
    const originalDiscussion = await this.getDiscussion(id);
    if (!originalDiscussion) {
      throw new Error('Discussion not found');
    }

    // Clone discussion with new name
    const [clonedDiscussion] = await db
      .insert(discussions)
      .values({
        projectId: originalDiscussion.projectId,
        name: `${originalDiscussion.name} (Copy)`,
        breathCount: 0,
        detectedPatterns: [],
        currentPhase: 'plasma'
      })
      .returning();

    // Clone messages from original discussion
    const messages = await this.getMessagesByDiscussion(id);
    for (const message of messages) {
      await this.createMessage({
        discussionId: clonedDiscussion.id,
        content: message.content,
        sender: message.sender,
        llmProvider: message.llmProvider
      });
    }

    return clonedDiscussion;
  }

  async deleteDiscussion(id: string): Promise<void> {
    await db.delete(discussions).where(eq(discussions.id, id));
  }

  // Message operations
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessagesByDiscussion(discussionId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.discussionId, discussionId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async deleteMessagesByDiscussion(discussionId: string): Promise<void> {
    await db.delete(messages).where(eq(messages.discussionId, discussionId));
  }

  // Context operations
  async getContextItem(id: string): Promise<ContextItem | undefined> {
    const [item] = await db.select().from(contextItems).where(eq(contextItems.id, id));
    return item || undefined;
  }

  async getContextItemsByProject(projectId: string): Promise<ContextItem[]> {
    return await db
      .select()
      .from(contextItems)
      .where(eq(contextItems.projectId, projectId))
      .orderBy(contextItems.createdAt);
  }

  async createContextItem(insertItem: InsertContextItem): Promise<ContextItem> {
    const [item] = await db
      .insert(contextItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async deleteContextItem(id: string): Promise<void> {
    await db.delete(contextItems).where(eq(contextItems.id, id));
  }

  // Settings operations
  async getSettings(): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.id, "default"));
    return settings || undefined;
  }

  async updateSettings(settingsUpdate: Partial<InsertUserSettings>): Promise<UserSettings> {
    // First try to get existing settings
    const existing = await this.getSettings();
    
    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(userSettings)
        .set({ ...settingsUpdate, updatedAt: new Date() })
        .where(eq(userSettings.id, "default"))
        .returning();
      return updated;
    } else {
      // Create new settings record
      const [created] = await db
        .insert(userSettings)
        .values({ 
          id: "default",
          ...settingsUpdate,
          updatedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  // Global context operations
  async getGlobalContext(): Promise<GlobalContext[]> {
    return await db.select().from(globalContext).orderBy(globalContext.createdAt);
  }

  async createGlobalContext(insertItem: InsertGlobalContext): Promise<GlobalContext> {
    const [item] = await db
      .insert(globalContext)
      .values(insertItem)
      .returning();
    return item;
  }

  async deleteGlobalContext(id: string): Promise<void> {
    await db.delete(globalContext).where(eq(globalContext.id, id));
  }

  async getGlobalContextByType(type: string): Promise<GlobalContext[]> {
    return await db
      .select()
      .from(globalContext)
      .where(eq(globalContext.type, type))
      .orderBy(globalContext.createdAt);
  }

  // Companion agent operations
  async getCompanionData(): Promise<any | undefined> {
    const [companion] = await db.select().from(companionAgent).limit(1);
    return companion || undefined;
  }

  async updateCompanionData(data: { observations?: any[]; suggestions?: any[]; patternMemory?: any }): Promise<any> {
    const existing = await this.getCompanionData();
    
    if (existing) {
      const [updated] = await db
        .update(companionAgent)
        .set(data)
        .where(eq(companionAgent.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(companionAgent)
        .values(data)
        .returning();
      return created;
    }
  }

  async addCompanionObservation(observation: any): Promise<void> {
    const companion = await this.getCompanionData();
    const observations = companion?.observations || [];
    observations.push(observation);
    await this.updateCompanionData({ observations });
  }

  async addCompanionSuggestion(suggestion: any): Promise<void> {
    const companion = await this.getCompanionData();
    const suggestions = companion?.suggestions || [];
    suggestions.push(suggestion);
    await this.updateCompanionData({ suggestions });
  }

  // Agent methods
  async getAgents(): Promise<Agent[]> {
    return await db.select().from(agents).orderBy(agents.createdAt);
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const [newAgent] = await db
      .insert(agents)
      .values(agent)
      .returning();
    return newAgent;
  }

  async deleteAgent(id: string): Promise<void> {
    await db.delete(agents).where(eq(agents.id, id));
  }

  // Metrics operations
  async getMetrics(): Promise<Metric[]> {
    return await db.select().from(metrics).orderBy(desc(metrics.timestamp));
  }

  async addMetric(insertMetric: InsertMetric): Promise<Metric> {
    const [metric] = await db
      .insert(metrics)
      .values(insertMetric)
      .returning();
    return metric;
  }

  async getDiscussions(): Promise<Discussion[]> {
    return await db.select().from(discussions).orderBy(desc(discussions.createdAt));
  }
}

export const storage = new DatabaseStorage();