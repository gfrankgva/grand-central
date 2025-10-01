import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Workspaces table - higher level organization
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table - top level containers
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"), // Project goals and context
  isTemplate: boolean("is_template").default(false), // For cloning functionality
  templateSource: varchar("template_source"), // Original project ID if cloned
  createdAt: timestamp("created_at").defaultNow(),
});

// Discussions table - sub-topics within projects
export const discussions = pgTable("discussions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  context: jsonb("context").default([]), // for files/links
  currentPhase: text("current_phase").default("plasma"), // plasma, gas, liquid, solid
  breathCount: integer("breath_count").default(0), // Number of breathing cycles
  detectedPatterns: jsonb("detected_patterns").default([]), // Array of pattern strings
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table - from multiple LLMs + user
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  discussionId: varchar("discussion_id").notNull().references(() => discussions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user', 'claude', 'gpt4', 'deepseek', 'companion'
  llmProvider: text("llm_provider"), // null for user messages
  createdAt: timestamp("created_at").defaultNow(),
});

// Context items for projects (files/links) - shared across all discussions in project
export const contextItems = pgTable("context_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'file' or 'link'
  name: text("name").notNull(),
  content: text("content"), // file content or URL
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// LLM providers enum for validation
export const llmProviders = ["openai", "claude", "deepseek", "grok"] as const;
export type LLMProvider = typeof llmProviders[number];

// Message senders enum for validation
export const messageSenders = ["user", "claude", "gpt4", "deepseek", "grok", "companion"] as const;
export type MessageSender = typeof messageSenders[number];

// Context item types enum for validation
export const contextTypes = ["file", "link"] as const;
export type ContextType = typeof contextTypes[number];

// Agent modes enum for validation
export const agentModes = ["plasma", "gas", "liquid", "solid"] as const;
export type AgentMode = typeof agentModes[number];

// User settings table for API keys and preferences
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default("default"),
  apiKeys: jsonb("api_keys").default({}),
  preferences: jsonb("preferences").default({}),
  globalContext: jsonb("global_context").default([]),
  companionConfig: jsonb("companion_config").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Global context table for files/links/instructions across all projects
export const globalContext = pgTable("global_context", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'file', 'url', or 'instruction'
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Companion agent table for monitoring and suggestions
export const companionAgent = pgTable("companion_agent", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  observations: jsonb("observations").default([]),
  suggestions: jsonb("suggestions").default([]),
  patternMemory: jsonb("pattern_memory").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const metrics = pgTable("metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'response_time', 'task_completion', 'pattern_detection', 'system_health', 'llm_call'
  value: integer("value").notNull(), // numeric value of the metric
  metadata: jsonb("metadata"), // additional data like provider, model, etc
  timestamp: timestamp("timestamp").defaultNow(),
  discussionId: varchar("discussion_id").references(() => discussions.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
});

// Agents table - AI agents created by users or companion agent
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  currentMode: text("current_mode").notNull().default("plasma"), // plasma, gas, liquid, solid
  llmProvider: text("llm_provider").notNull().default("claude"), // openai, claude, deepseek
  systemPrompt: text("system_prompt"),
  createdBy: text("created_by").default("user"), // user, companion
  parentDiscussion: varchar("parent_discussion"), // discussionId if created by companion
  createdAt: timestamp("created_at").defaultNow(),
});

// Session tracking table
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").default("default"),
  activeProjectId: varchar("active_project_id"),
  activeDiscussionId: varchar("active_discussion_id"),
  lastActivity: timestamp("last_activity").defaultNow(),
});

// Pattern memory system
export const patternMemory = pgTable("pattern_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type").notNull(), // 'topic', 'style', 'frequency'
  patternData: jsonb("pattern_data").default({}),
  depth: jsonb("depth").default(0), // Increases with use
  lastAccessed: timestamp("last_accessed").defaultNow(),
});

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
});

export const insertDiscussionSchema = createInsertSchema(discussions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertContextItemSchema = createInsertSchema(contextItems).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertGlobalContextSchema = createInsertSchema(globalContext).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  lastActivity: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export const insertMetricSchema = createInsertSchema(metrics).omit({
  id: true,
});

// API Configuration types
export const apiConfigSchema = z.object({
  openai: z.object({
    key: z.string(),
    model: z.enum(["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]).default("gpt-4-turbo")
  }).optional(),
  anthropic: z.object({
    key: z.string(),
    model: z.enum(["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]).default("claude-3-sonnet")
  }).optional(),
  deepseek: z.object({
    key: z.string(),
    endpoint: z.string().default("https://api.deepseek.com")
  }).optional(),
  grok: z.object({
    key: z.string(),
    model: z.enum(["grok-4-latest"]).default("grok-4-latest")
  }).optional()
});

export const preferencesSchema = z.object({
  simultaneous: z.boolean().default(true),
  sequential: z.boolean().default(false),
  primaryLLM: z.enum(["openai", "anthropic", "deepseek", "grok"]).default("openai"),
  maxTokens: z.number().default(1000),
  temperature: z.number().min(0).max(2).default(0.7)
});

export const companionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  autoSuggest: z.boolean().default(false),
  monitoringLevel: z.enum(["all", "active", "none"]).default("active"),
  personality: z.string().default("You are a helpful AI assistant that monitors conversations and suggests improvements.")
});

// Types
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type Discussion = typeof discussions.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertContextItem = z.infer<typeof insertContextItemSchema>;
export type ContextItem = typeof contextItems.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertGlobalContext = z.infer<typeof insertGlobalContextSchema>;
export type GlobalContext = typeof globalContext.$inferSelect;

// Agent types
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Metrics types
export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metrics.$inferSelect;

export type ApiConfig = z.infer<typeof apiConfigSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type CompanionConfig = z.infer<typeof companionConfigSchema>;
