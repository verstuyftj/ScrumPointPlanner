import { 
  sessions,
  participants, 
  votes, 
  stories,
  type Session, 
  type InsertSession, 
  type Participant,
  type InsertParticipant,
  type Vote,
  type InsertVote,
  type User,
  type InsertUser,
  type Story,
  type InsertStory,
  users
} from "@shared/schema";
import { db } from './db';
import { eq, and } from 'drizzle-orm';

// Storage interface for CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getSessions(): Promise<Session[]>;
  updateSession(id: string, sessionData: Partial<Session>): Promise<Session | undefined>;
  
  // Participant operations
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipant(id: number): Promise<Participant | undefined>;
  getParticipantByName(sessionId: string, name: string): Promise<Participant | undefined>;
  getSessionParticipants(sessionId: string): Promise<Participant[]>;
  updateParticipant(id: number, participantData: Partial<Participant>): Promise<Participant | undefined>;
  removeParticipant(id: number): Promise<boolean>;
  
  // Story operations
  addStory(story: InsertStory): Promise<Story>;
  getStory(id: number): Promise<Story | undefined>;
  getSessionStories(sessionId: string): Promise<Story[]>;
  updateStory(id: number, storyData: Partial<Story>): Promise<Story | undefined>;
  
  // Vote operations
  castVote(vote: InsertVote): Promise<Vote>;
  getVote(participantId: number, sessionId: string): Promise<Vote | undefined>;
  getSessionVotes(sessionId: string): Promise<Vote[]>;
  resetVotes(sessionId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Session operations
  async createSession(sessionData: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values({
      ...sessionData,
      votingSystem: sessionData.votingSystem || 'fibonacci',
      currentStory: sessionData.currentStory || null,
      active: true,
      revealed: false,
    }).returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async getSessions(): Promise<Session[]> {
    return await db.select().from(sessions);
  }

  async updateSession(id: string, sessionData: Partial<Session>): Promise<Session | undefined> {
    const [session] = await db.update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }

  // Participant operations
  async addParticipant(participant: InsertParticipant): Promise<Participant> {
    const [newParticipant] = await db.insert(participants)
      .values(participant)
      .returning();
    return newParticipant;
  }

  async getParticipant(id: number): Promise<Participant | undefined> {
    const [participant] = await db.select()
      .from(participants)
      .where(eq(participants.id, id));
    return participant;
  }

  async getParticipantByName(sessionId: string, name: string): Promise<Participant | undefined> {
    const [participant] = await db.select()
      .from(participants)
      .where(
        and(
          eq(participants.sessionId, sessionId),
          eq(participants.name, name)
        )
      );
    return participant;
  }

  async getSessionParticipants(sessionId: string): Promise<Participant[]> {
    return await db.select()
      .from(participants)
      .where(eq(participants.sessionId, sessionId));
  }

  async updateParticipant(id: number, participantData: Partial<Participant>): Promise<Participant | undefined> {
    const [participant] = await db.update(participants)
      .set(participantData)
      .where(eq(participants.id, id))
      .returning();
    return participant;
  }

  async removeParticipant(id: number): Promise<boolean> {
    const [participant] = await db.delete(participants)
      .where(eq(participants.id, id))
      .returning();
    return !!participant;
  }
  
  // Story operations
  async addStory(story: InsertStory): Promise<Story> {
    const [newStory] = await db.insert(stories)
      .values(story)
      .returning();
    return newStory;
  }

  async getStory(id: number): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story;
  }

  async getSessionStories(sessionId: string): Promise<Story[]> {
    return await db.select()
      .from(stories)
      .where(eq(stories.sessionId, sessionId));
  }

  async updateStory(id: number, storyData: Partial<Story>): Promise<Story | undefined> {
    const [story] = await db.update(stories)
      .set(storyData)
      .where(eq(stories.id, id))
      .returning();
    return story;
  }

  // Vote operations
  async castVote(vote: InsertVote): Promise<Vote> {
    const [newVote] = await db.insert(votes)
      .values(vote)
      .returning();
    return newVote;
  }

  async getVote(participantId: number, sessionId: string): Promise<Vote | undefined> {
    const [vote] = await db.select()
      .from(votes)
      .where(
        and(
          eq(votes.participantId, participantId),
          eq(votes.sessionId, sessionId)
        )
      );
    return vote;
  }

  async getSessionVotes(sessionId: string): Promise<Vote[]> {
    return await db.select()
      .from(votes)
      .where(eq(votes.sessionId, sessionId));
  }

  async resetVotes(sessionId: string): Promise<boolean> {
    await db.delete(votes)
      .where(eq(votes.sessionId, sessionId));
    return true;
  }
}

export const storage = new MemStorage();
