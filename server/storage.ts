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
  private users: Map<number, User>;
  private sessionMap: Map<string, Session>;
  private participantMap: Map<number, Participant>;
  private voteMap: Map<number, Vote>;
  private storyMap: Map<number, Story>;
  
  private userIdCounter: number;
  private participantIdCounter: number;
  private voteIdCounter: number;
  private storyIdCounter: number;

  constructor() {
    this.users = new Map();
    this.sessionMap = new Map();
    this.participantMap = new Map();
    this.voteMap = new Map();
    this.storyMap = new Map();
    
    this.userIdCounter = 1;
    this.participantIdCounter = 1;
    this.voteIdCounter = 1;
    this.storyIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Session operations
  async createSession(sessionData: InsertSession): Promise<Session> {
    const now = new Date();
    const session: Session = { 
      ...sessionData, 
      active: true, 
      revealed: false,
      createdAt: now
    };
    
    this.sessionMap.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessionMap.get(id);
  }

  async getSessions(): Promise<Session[]> {
    return Array.from(this.sessionMap.values());
  }

  async updateSession(id: string, sessionData: Partial<Session>): Promise<Session | undefined> {
    const existingSession = this.sessionMap.get(id);
    if (!existingSession) return undefined;

    const updatedSession = { ...existingSession, ...sessionData };
    this.sessionMap.set(id, updatedSession);
    return updatedSession;
  }

  // Participant operations
  async addParticipant(participant: InsertParticipant): Promise<Participant> {
    const id = this.participantIdCounter++;
    const now = new Date();
    
    const newParticipant: Participant = { 
      ...participant, 
      id, 
      connected: true, 
      lastActivity: now 
    };
    
    this.participantMap.set(id, newParticipant);
    return newParticipant;
  }

  async getParticipant(id: number): Promise<Participant | undefined> {
    return this.participantMap.get(id);
  }

  async getParticipantByName(sessionId: string, name: string): Promise<Participant | undefined> {
    return Array.from(this.participantMap.values()).find(
      (p) => p.sessionId === sessionId && p.name === name
    );
  }

  async getSessionParticipants(sessionId: string): Promise<Participant[]> {
    return Array.from(this.participantMap.values()).filter(
      (p) => p.sessionId === sessionId
    );
  }

  async updateParticipant(id: number, participantData: Partial<Participant>): Promise<Participant | undefined> {
    const existingParticipant = this.participantMap.get(id);
    if (!existingParticipant) return undefined;

    const updatedParticipant = { ...existingParticipant, ...participantData };
    this.participantMap.set(id, updatedParticipant);
    return updatedParticipant;
  }

  async removeParticipant(id: number): Promise<boolean> {
    return this.participantMap.delete(id);
  }
  
  // Story operations
  async addStory(story: InsertStory): Promise<Story> {
    const id = this.storyIdCounter++;
    const now = new Date();
    
    const newStory: Story = { 
      ...story, 
      id, 
      createdAt: now
    };
    
    this.storyMap.set(id, newStory);
    return newStory;
  }

  async getStory(id: number): Promise<Story | undefined> {
    return this.storyMap.get(id);
  }

  async getSessionStories(sessionId: string): Promise<Story[]> {
    return Array.from(this.storyMap.values()).filter(
      (s) => s.sessionId === sessionId
    );
  }

  async updateStory(id: number, storyData: Partial<Story>): Promise<Story | undefined> {
    const existingStory = this.storyMap.get(id);
    if (!existingStory) return undefined;

    const updatedStory = { ...existingStory, ...storyData };
    this.storyMap.set(id, updatedStory);
    return updatedStory;
  }

  // Vote operations
  async castVote(vote: InsertVote): Promise<Vote> {
    // Check if a vote already exists for this participant/session
    const existingVote = await this.getVote(vote.participantId, vote.sessionId);
    
    if (existingVote) {
      // Update existing vote
      const updatedVote = { ...existingVote, value: vote.value };
      this.voteMap.set(existingVote.id, updatedVote);
      return updatedVote;
    } else {
      // Create new vote
      const id = this.voteIdCounter++;
      const now = new Date();
      
      const newVote: Vote = { 
        ...vote, 
        id, 
        createdAt: now 
      };
      
      this.voteMap.set(id, newVote);
      return newVote;
    }
  }

  async getVote(participantId: number, sessionId: string): Promise<Vote | undefined> {
    return Array.from(this.voteMap.values()).find(
      (v) => v.participantId === participantId && v.sessionId === sessionId
    );
  }

  async getSessionVotes(sessionId: string): Promise<Vote[]> {
    return Array.from(this.voteMap.values()).filter(
      (v) => v.sessionId === sessionId
    );
  }

  async resetVotes(sessionId: string): Promise<boolean> {
    // Remove all votes for the session
    const votes = Array.from(this.voteMap.values());
    votes.forEach(vote => {
      if (vote.sessionId === sessionId) {
        this.voteMap.delete(vote.id);
      }
    });
    
    return true;
  }
}

export const storage = new MemStorage();
