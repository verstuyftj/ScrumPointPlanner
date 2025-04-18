import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Session schema
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(),
  votingSystem: text("voting_system").notNull().default("fibonacci"),
  currentStory: text("current_story"),
  active: boolean("active").notNull().default(true),
  revealed: boolean("revealed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).pick({
  id: true,
  name: true,
  createdBy: true,
  votingSystem: true,
  currentStory: true,
});

// Story schema
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  link: text("link").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isCompleted: boolean("is_completed").notNull().default(false),
});

export const insertStorySchema = createInsertSchema(stories).pick({
  sessionId: true,
  title: true,
  link: true,
  isCompleted: true,
});

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Participant schema
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  connected: boolean("connected").notNull().default(true),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  sessionId: true,
  name: true,
  isAdmin: true,
});

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

// Vote schema
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  value: text("value").notNull(),
  storyId: text("story_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  sessionId: true,
  participantId: true,
  value: true,
  storyId: true,
});

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

// WebSocket message types
export enum MessageType {
  JOIN_SESSION = "join_session",
  LEAVE_SESSION = "leave_session",
  PARTICIPANT_JOINED = "participant_joined",
  PARTICIPANT_LEFT = "participant_left",
  CAST_VOTE = "cast_vote",
  VOTE_UPDATED = "vote_updated",
  REVEAL_VOTES = "reveal_votes",
  VOTES_REVEALED = "votes_revealed",
  RESET_VOTING = "reset_voting",
  VOTING_RESET = "voting_reset",
  SET_STORY = "set_story",
  STORY_UPDATED = "story_updated",
  ADD_STORY = "add_story",
  STORY_ADDED = "story_added",
  GET_STORIES = "get_stories",
  STORIES_UPDATED = "stories_updated",
  SET_CURRENT_STORY = "set_current_story",
  SESSION_UPDATE = "session_update",
  ERROR = "error"
}

// WebSocket message schema
export const messageSchema = z.object({
  type: z.nativeEnum(MessageType),
  payload: z.any(),
});

export type WebSocketMessage = z.infer<typeof messageSchema>;

// Voting system types
export const votingSystemSchema = z.enum(["fibonacci", "tshirt", "standard"]);
export type VotingSystem = z.infer<typeof votingSystemSchema>;
