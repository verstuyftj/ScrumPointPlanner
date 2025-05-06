import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  MessageType, 
  messageSchema, 
  insertSessionSchema, 
  insertParticipantSchema, 
  insertVoteSchema,
  type WebSocketMessage,
  type Participant,
  votingSystemSchema
} from "@shared/schema";
import { nanoid } from "nanoid";

interface ClientConnection {
  socket: WebSocket;
  participant?: Participant;
  sessionId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create a WebSocket server on the same HTTP server as Express
  // with a dedicated path to avoid conflicts with Vite's WebSocket
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/planning-poker-ws",
    perMessageDeflate: false // Disable compression to avoid issues
  });
  
  console.log("WebSocket server initialized at path /api/planning-poker-ws");
  
  // Store client connections
  const clients = new Map<WebSocket, ClientConnection>();
  
  // API ROUTES
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get all sessions
  app.get("/api/sessions", async (_req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json({ sessions });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Get session by ID
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json({ session });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Get session participants
  app.get("/api/sessions/:id/participants", async (req, res) => {
    try {
      const participants = await storage.getSessionParticipants(req.params.id);
      res.json({ participants });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Get session votes
  app.get("/api/sessions/:id/votes", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (!session.revealed) {
        return res.status(403).json({ message: "Votes have not been revealed yet" });
      }
      
      const votes = await storage.getSessionVotes(req.params.id);
      res.json({ votes });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch votes" });
    }
  });

  // Create a new session
  app.post("/api/sessions", async (req, res) => {
    try {
      const data = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(data);
      res.status(201).json({ session });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // WEBSOCKET HANDLING
  wss.on("connection", (socket, req) => {
    console.log("New WebSocket connection established from:", req.socket.remoteAddress);
    
    // Add new client connection
    clients.set(socket, { socket });
    
    // Send a welcome message to confirm connection
    // Small delay to ensure socket is fully ready
    setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          const welcomeMessage = {
            type: MessageType.SESSION_UPDATE,
            payload: {
              message: "Connection established successfully"
            }
          };
          
          socket.send(JSON.stringify(welcomeMessage));
          console.log("Welcome message sent successfully");
        } catch (err) {
          console.error("Error sending welcome message:", err);
        }
      } else {
        console.warn("Socket not open when trying to send welcome message, state:", socket.readyState);
      }
    }, 100);
    
    // Handle messages
    socket.on("message", async (data) => {
      try {
        const messageStr = data.toString();
        console.log("Received message:", messageStr);
        
        // Detailed logging for debugging
        try {
          const parsedMsg = JSON.parse(messageStr);
          console.log("Parsed message type:", parsedMsg.type);
          console.log("Parsed message payload:", JSON.stringify(parsedMsg.payload));
        } catch (e) {
          console.error("Error parsing received message for logging:", e);
        }
        
        // Check for ping messages
        if (messageStr.includes('"type":"ping"')) {
          socket.send(JSON.stringify({ type: "pong" }));
          return;
        }
        
        // Parse and validate message
        const message = messageSchema.parse(JSON.parse(messageStr));
        const client = clients.get(socket);
        
        if (!client) {
          return sendError(socket, "Client not found");
        }
        
        switch (message.type) {
          case MessageType.JOIN_SESSION:
            await handleJoinSession(socket, client, message);
            break;
            
          case MessageType.LEAVE_SESSION:
            await handleLeaveSession(socket, client);
            break;
            
          case MessageType.CAST_VOTE:
            await handleCastVote(socket, client, message);
            break;
            
          case MessageType.REVEAL_VOTES:
            await handleRevealVotes(socket, client);
            break;
            
          case MessageType.RESET_VOTING:
            await handleResetVoting(socket, client);
            break;
            
          case MessageType.SET_STORY:
            await handleSetStory(socket, client, message);
            break;
            
          case MessageType.ADD_STORY:
            await handleAddStory(socket, client, message);
            break;
            
          case MessageType.GET_STORIES:
            await handleGetStories(socket, client);
            break;
            
          case MessageType.SET_CURRENT_STORY:
            await handleSetCurrentStory(socket, client, message);
            break;
            
          case MessageType.UPDATE_STORY:
            await handleUpdateStory(socket, client, message);
            break;
            
          default:
            sendError(socket, "Unsupported message type");
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
        
        // More detailed error information
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          console.error("Validation error:", validationError.message);
          sendError(socket, `Validation error: ${validationError.message}`);
        } else if (error instanceof Error) {
          console.error("Error name:", error.name, "Error message:", error.message);
          sendError(socket, `Error: ${error.message}`);
        } else {
          sendError(socket, "Invalid message format");
        }
      }
    });
    
    // Handle disconnection
    socket.on("close", async () => {
      const client = clients.get(socket);
      if (client && client.participant && client.sessionId) {
        // Update participant as disconnected
        await storage.updateParticipant(client.participant.id, { connected: false });
        
        // Notify other clients in session
        broadcastToSession(client.sessionId, {
          type: MessageType.PARTICIPANT_LEFT,
          payload: {
            participantId: client.participant.id,
          }
        }, socket);
      }
      
      // Remove client from connections
      clients.delete(socket);
    });
  });

  // JOIN SESSION HANDLER
  async function handleJoinSession(socket: WebSocket, client: ClientConnection, message: WebSocketMessage) {
    console.log("Processing join session request:", JSON.stringify(message.payload));
    
    try {
      const { sessionId, name, isAdmin, votingSystem, sessionName } = message.payload;
      
      // Validate required fields
      if (!name) {
        return sendError(socket, "Participant name is required");
      }
      
      // Create new session if needed (admin & no existing session)
      if (isAdmin && sessionName && votingSystem) {
        console.log("Creating new session:", sessionName, "with voting system:", votingSystem);
        
        try {
          // Validate voting system
          votingSystemSchema.parse(votingSystem);
          
          const newSessionId = sessionId || nanoid(6).toUpperCase();
          console.log("Generated session ID:", newSessionId);
          
          // Check if session exists
          const existingSession = await storage.getSession(newSessionId);
          if (existingSession) {
            return sendError(socket, "Session already exists");
          }
          
          // Create new session
          await storage.createSession({
            id: newSessionId,
            name: sessionName,
            createdBy: name,
            votingSystem,
            currentStory: ""
          });
          
          // Create admin participant
          const participant = await storage.addParticipant({
            sessionId: newSessionId,
            name,
            isAdmin: true
          });
          
          // Update client data
          client.participant = participant;
          client.sessionId = newSessionId;
          
          // Send success response
          sendMessage(socket, {
            type: MessageType.SESSION_UPDATE,
            payload: {
              sessionId: newSessionId,
              participant,
              session: await storage.getSession(newSessionId),
              participants: await storage.getSessionParticipants(newSessionId),
              votes: []
            }
          });
        
          return;
        } catch (error) {
          return sendError(socket, "Invalid session data");
        }
      }
      
      // Join existing session
      try {
        // Validate session ID
        if (!sessionId) {
          return sendError(socket, "Session ID is required");
        }
        
        // Check if session exists
        const session = await storage.getSession(sessionId);
        if (!session) {
          return sendError(socket, "Session not found");
        }
        
        // Check for name conflict
        const existingParticipant = await storage.getParticipantByName(sessionId, name);
        if (existingParticipant) {
          if (existingParticipant.connected) {
            return sendError(socket, "A participant with this name already exists in the session");
          } else {
            // Re-connect existing participant
            await storage.updateParticipant(existingParticipant.id, { connected: true });
            client.participant = { ...existingParticipant, connected: true };
          }
        } else {
          // Create new participant
          const participant = await storage.addParticipant({
            sessionId,
            name,
            isAdmin: false
          });
          client.participant = participant;
        }
        
        client.sessionId = sessionId;
        
        // Get existing votes
        const votes = session.revealed ? await storage.getSessionVotes(sessionId) : [];
        
        // Notify other clients
        broadcastToSession(sessionId, {
          type: MessageType.PARTICIPANT_JOINED,
          payload: {
            participant: client.participant,
          }
        }, socket);
        
        // Send session data to client
        sendMessage(socket, {
          type: MessageType.SESSION_UPDATE,
          payload: {
            sessionId,
            participant: client.participant,
            session,
            participants: await storage.getSessionParticipants(sessionId),
            votes
          }
        });
      } catch (error) {
        sendError(socket, "Failed to join session");
      }
    } catch (error) {
      sendError(socket, "Error processing message");
    }
  }

  // LEAVE SESSION HANDLER
  async function handleLeaveSession(socket: WebSocket, client: ClientConnection) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      // Update participant as disconnected
      await storage.updateParticipant(client.participant.id, { connected: false });
      
      // Notify other clients
      broadcastToSession(client.sessionId, {
        type: MessageType.PARTICIPANT_LEFT,
        payload: {
          participantId: client.participant.id,
        }
      }, socket);
      
      // Clear client data
      client.participant = undefined;
      client.sessionId = undefined;
      
      sendMessage(socket, {
        type: MessageType.LEAVE_SESSION,
        payload: { success: true }
      });
    } catch (error) {
      sendError(socket, "Failed to leave session");
    }
  }

  // CAST VOTE HANDLER
  async function handleCastVote(socket: WebSocket, client: ClientConnection, message: WebSocketMessage) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      const { value } = message.payload;
      
      if (!value) {
        return sendError(socket, "Vote value is required");
      }
      
      // Cast vote
      const vote = await storage.castVote({
        sessionId: client.sessionId,
        participantId: client.participant.id,
        value,
        storyId: null
      });
      
      // Notify all clients about the vote update with the full vote information
      broadcastToSession(client.sessionId, {
        type: MessageType.VOTE_UPDATED,
        payload: {
          vote,
          participantId: client.participant.id,
          hasVoted: true
        }
      });
      
      // Check if all participants have voted
      const participants = await storage.getSessionParticipants(client.sessionId);
      const activeParticipants = participants.filter(p => p.connected);
      const votes = await storage.getSessionVotes(client.sessionId);
      
      if (votes.length === activeParticipants.length) {
        // Notify all clients that all votes are in
        broadcastToSession(client.sessionId, {
          type: MessageType.SESSION_UPDATE,
          payload: {
            allVotesIn: true
          }
        });
      }
    } catch (error) {
      sendError(socket, "Failed to cast vote");
    }
  }

  // REVEAL VOTES HANDLER
  async function handleRevealVotes(socket: WebSocket, client: ClientConnection) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      // Update session as revealed
      const session = await storage.updateSession(client.sessionId, { revealed: true });
      
      if (!session) {
        return sendError(socket, "Session not found");
      }
      
      // Get all votes
      const votes = await storage.getSessionVotes(client.sessionId);
      
      // Notify all clients
      broadcastToSession(client.sessionId, {
        type: MessageType.VOTES_REVEALED,
        payload: {
          votes,
          session
        }
      });
    } catch (error) {
      sendError(socket, "Failed to reveal votes");
    }
  }

  // RESET VOTING HANDLER
  async function handleResetVoting(socket: WebSocket, client: ClientConnection) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      // Get current session to find current story
      const session = await storage.getSession(client.sessionId);
      if (!session) {
        return sendError(socket, "Session not found");
      }

      // If there's a current story, mark it as completed
      if (session.currentStory) {
        const storyMatch = session.currentStory.match(/(.*?)\s*\((.*?)\)/);
        if (storyMatch) {
          const storyTitle = storyMatch[1];
          const stories = await storage.getSessionStories(client.sessionId);
          const currentStory = stories.find(s => s.title === storyTitle && !s.isCompleted);
          
          if (currentStory) {
            await storage.updateStory(currentStory.id, { isCompleted: true });
          }
        }
      }
      
      // Reset all votes for session
      await storage.resetVotes(client.sessionId);
      
      // Update session as not revealed and clear current story
      const updatedSession = await storage.updateSession(client.sessionId, { 
        revealed: false,
        currentStory: null
      });
      
      if (!updatedSession) {
        return sendError(socket, "Failed to update session");
      }
      
      // Get updated stories list
      const updatedStories = await storage.getSessionStories(client.sessionId);
      
      // Notify all clients
      broadcastToSession(client.sessionId, {
        type: MessageType.VOTING_RESET,
        payload: {
          session: updatedSession,
          stories: updatedStories
        }
      });
    } catch (error) {
      sendError(socket, "Failed to reset voting");
    }
  }
  
  // ADD STORY HANDLER
  async function handleAddStory(socket: WebSocket, client: ClientConnection, message: WebSocketMessage) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      const { title, link } = message.payload;
      
      if (!client.participant.isAdmin) {
        return sendError(socket, "Only administrators can add stories");
      }
      
      if (!title || !link) {
        return sendError(socket, "Title and link are required");
      }
      
      // Add the story
      const story = await storage.addStory({
        sessionId: client.sessionId,
        title,
        link,
        isCompleted: false
      });
      
      // Notify all clients
      broadcastToSession(client.sessionId, {
        type: MessageType.STORY_ADDED,
        payload: {
          story
        }
      });
      
    } catch (error) {
      sendError(socket, "Failed to add story");
    }
  }
  
  // GET STORIES HANDLER
  async function handleGetStories(socket: WebSocket, client: ClientConnection) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      // Get all stories for session
      const stories = await storage.getSessionStories(client.sessionId);
      
      // Send to requesting client
      sendMessage(socket, {
        type: MessageType.STORIES_UPDATED,
        payload: {
          stories
        }
      });
      
    } catch (error) {
      sendError(socket, "Failed to get stories");
    }
  }
  
  // SET CURRENT STORY HANDLER
  async function handleSetCurrentStory(socket: WebSocket, client: ClientConnection, message: WebSocketMessage) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      const { storyId } = message.payload;
      
      if (!client.participant.isAdmin) {
        return sendError(socket, "Only administrators can set the current story");
      }
      
      // Get the story
      const story = await storage.getStory(storyId);
      if (!story || story.sessionId !== client.sessionId) {
        return sendError(socket, "Story not found");
      }
      
      // Update session with current story
      const session = await storage.updateSession(client.sessionId, { 
        currentStory: `${story.title} (${story.link})`,
        revealed: false 
      });
      
      if (!session) {
        return sendError(socket, "Session not found");
      }
      
      // Reset all votes for session
      await storage.resetVotes(client.sessionId);
      
      // Notify all clients
      broadcastToSession(client.sessionId, {
        type: MessageType.STORY_UPDATED,
        payload: {
          session,
          currentStory: story
        }
      });
      
    } catch (error) {
      sendError(socket, "Failed to set current story");
    }
  }

  // SET STORY HANDLER
  async function handleSetStory(socket: WebSocket, client: ClientConnection, message: WebSocketMessage) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      const { story, storyId, update } = message.payload;
      
      if (!client.participant.isAdmin) {
        return sendError(socket, "Only administrators can change the story");
      }

      if (update && storyId) {
        console.log("Updating story:", { storyId, story });
        // This is a story update operation
        const existingStory = await storage.getStory(storyId);
        if (!existingStory || existingStory.sessionId !== client.sessionId) {
          return sendError(socket, "Story not found");
        }

        // Parse title and link from story string
        const match = story.match(/(.*?)\s*\((.*?)\)/);
        if (!match) {
          return sendError(socket, "Invalid story format");
        }

        const [_, title, link] = match;
        console.log("Parsed story data:", { title, link });

        // Update the story in the database
        const updatedStory = await storage.updateStory(storyId, {
          title: title.trim(),
          link: link.trim()
        });

        if (!updatedStory) {
          return sendError(socket, "Failed to update story");
        }

        console.log("Story updated successfully:", updatedStory);

        // Get all stories to broadcast the update
        const stories = await storage.getSessionStories(client.sessionId);

        // If this was the current story in the session, update that too
        const session = await storage.getSession(client.sessionId);
        if (session && session.currentStory) {
          const currentStoryMatch = session.currentStory.match(/(.*?)\s*\((.*?)\)/);
          if (currentStoryMatch) {
            const [_, currentTitle] = currentStoryMatch;
            if (currentTitle === existingStory.title) {
              // This is the current story, update it
              await storage.updateSession(client.sessionId, {
                currentStory: `${updatedStory.title} (${updatedStory.link})`
              });
            }
          }
        }

        // Notify all clients about the story update
        broadcastToSession(client.sessionId, {
          type: MessageType.STORIES_UPDATED,
          payload: {
            stories,
            message: `Story "${updatedStory.title}" has been updated`
          }
        });

        return;
      }
      
      // Regular set story operation
      const session = await storage.updateSession(client.sessionId, { 
        currentStory: story,
        revealed: false 
      });
      
      if (!session) {
        return sendError(socket, "Session not found");
      }
      
      // Reset all votes for session
      await storage.resetVotes(client.sessionId);
      
      // Notify all clients
      broadcastToSession(client.sessionId, {
        type: MessageType.STORY_UPDATED,
        payload: {
          session
        }
      });
    } catch (error) {
      console.error("Error in handleSetStory:", error);
      sendError(socket, "Failed to set story");
    }
  }

  // UPDATE STORY HANDLER
  async function handleUpdateStory(socket: WebSocket, client: ClientConnection, message: WebSocketMessage) {
    if (!client.participant || !client.sessionId) {
      return sendError(socket, "Not in a session");
    }
    
    try {
      const { storyId, title, link } = message.payload;
      console.log("Updating story:", { storyId, title, link });
      
      if (!client.participant.isAdmin) {
        return sendError(socket, "Only administrators can update stories");
      }
      
      if (!title || !link) {
        return sendError(socket, "Title and link are required");
      }
      
      // Get the story first
      const existingStory = await storage.getStory(storyId);
      if (!existingStory || existingStory.sessionId !== client.sessionId) {
        return sendError(socket, "Story not found");
      }
      
      // Update the story
      const updatedStory = await storage.updateStory(storyId, {
        title: title.trim(),
        link: link.trim()
      });
      
      if (!updatedStory) {
        return sendError(socket, "Failed to update story");
      }

      console.log("Story updated successfully:", updatedStory);
      
      // Get all stories to broadcast the update
      const stories = await storage.getSessionStories(client.sessionId);
      
      // If this was the current story in the session, update that too
      const session = await storage.getSession(client.sessionId);
      if (session && session.currentStory) {
        const currentStoryMatch = session.currentStory.match(/(.*?)\s*\((.*?)\)/);
        if (currentStoryMatch) {
          const [_, currentTitle] = currentStoryMatch;
          if (currentTitle === existingStory.title) {
            // This is the current story, update it
            const updatedSession = await storage.updateSession(client.sessionId, {
              currentStory: `${updatedStory.title} (${updatedStory.link})`
            });
            
            if (updatedSession) {
              // Notify about session update
              broadcastToSession(client.sessionId, {
                type: MessageType.SESSION_UPDATE,
                payload: {
                  session: updatedSession
                }
              });
            }
          }
        }
      }

      // Notify all clients about story update
      broadcastToSession(client.sessionId, {
        type: MessageType.STORIES_UPDATED,
        payload: {
          stories,
          message: `Story "${updatedStory.title}" has been updated`
        }
      });
      
    } catch (error) {
      console.error("Error updating story:", error);
      sendError(socket, "Failed to update story");
    }
  }

  // HELPER FUNCTIONS
  function sendMessage(socket: WebSocket, message: WebSocketMessage) {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        const messageStr = JSON.stringify(message);
        console.log("Sending message:", messageStr.substring(0, 100) + (messageStr.length > 100 ? '...' : ''));
        socket.send(messageStr);
      } else {
        console.log("Cannot send message, socket not open. ReadyState:", socket.readyState);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  function sendError(socket: WebSocket, errorMessage: string) {
    sendMessage(socket, {
      type: MessageType.ERROR,
      payload: { message: errorMessage }
    });
  }

  function broadcastToSession(sessionId: string, message: WebSocketMessage, exclude?: WebSocket) {
    try {
      const messageStr = JSON.stringify(message);
      console.log(`Broadcasting to session ${sessionId}:`, messageStr.substring(0, 100) + (messageStr.length > 100 ? '...' : ''));
      
      let sendCount = 0;
      clients.forEach((client, socket) => {
        if (client.sessionId === sessionId && socket !== exclude) {
          if (socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(messageStr);
              sendCount++;
            } catch (err) {
              console.error("Error sending broadcast to client:", err);
            }
          } else {
            console.log(`Client socket not ready for session ${sessionId}, readyState:`, socket.readyState);
          }
        }
      });
      
      console.log(`Broadcast complete: sent to ${sendCount} clients in session ${sessionId}`);
    } catch (error) {
      console.error("Error in broadcast:", error);
    }
  }

  return httpServer;
}
