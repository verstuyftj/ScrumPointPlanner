import { useState, useEffect, useCallback, useRef } from "react";
// @ts-ignore - This is a Replit-specific path alias that works at runtime
import { MessageType, type WebSocketMessage } from "@shared/schema";

// Create a singleton WebSocket instance to be shared across the app
let globalSocket: WebSocket | null = null;
let globalConnectionPromise: Promise<WebSocket> | null = null;
const messageQueue: WebSocketMessage[] = [];
const messageHandlers: Array<(message: WebSocketMessage) => void> = [];

// Function to create a WebSocket connection
const createWebSocketConnection = (): Promise<WebSocket> => {
  if (globalConnectionPromise) return globalConnectionPromise;
  
  globalConnectionPromise = new Promise((resolve, reject) => {
    try {
      // Choose the WebSocket protocol (secure or not) based on the page protocol
      const isSecure = window.location.protocol === 'https:';
      const wsProtocol = isSecure ? 'wss://' : 'ws://';
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      
      // Connect to the WebSocket server
      const wsUrl = `${wsProtocol}${hostname}${port}/api/planning-poker-ws`;
      console.log("Creating global WebSocket connection to:", wsUrl);
      
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log("Global WebSocket connected successfully");
        globalSocket = socket;
        processMessageQueue();
        resolve(socket);
      };
      
      socket.onclose = (event) => {
        console.log("Global WebSocket closed, code:", event.code, "reason:", event.reason);
        globalSocket = null;
        globalConnectionPromise = null;
        
        // No need to automatically reconnect here - we'll reconnect when needed
      };
      
      socket.onerror = (error) => {
        console.error("Global WebSocket error:", error);
        reject(error);
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Received global WebSocket message:", message);
          
          // Dispatch to all handlers
          messageHandlers.forEach(handler => {
            try {
              handler(message);
            } catch (err) {
              console.error("Error in message handler:", err);
            }
          });
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      globalConnectionPromise = null;
      reject(error);
    }
  });
  
  return globalConnectionPromise;
};

// Function to process the message queue
const processMessageQueue = () => {
  if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) return;
  
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    if (message) {
      try {
        const messageStr = JSON.stringify(message);
        console.log("Sending queued message:", messageStr);
        globalSocket.send(messageStr);
      } catch (err) {
        console.error("Error sending queued message:", err);
        // Put back in queue
        messageQueue.unshift(message);
        break;
      }
    }
  }
};

// Function to send a message
const sendWebSocketMessage = async (message: WebSocketMessage): Promise<void> => {
  messageQueue.push(message);
  console.log(`Message added to global queue. Queue size: ${messageQueue.length}`);
  
  // If we have a connection, process the queue
  if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
    processMessageQueue();
    return;
  }
  
  // Otherwise, create a connection first
  try {
    await createWebSocketConnection();
    processMessageQueue();
  } catch (error) {
    console.error("Failed to send message due to connection error:", error);
  }
};

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void) => {
  const [isConnected, setIsConnected] = useState(!!globalSocket && globalSocket.readyState === WebSocket.OPEN);
  const handlerRef = useRef<(message: WebSocketMessage) => void>(onMessage);
  
  // Update the handler reference when onMessage changes
  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);
  
  // Register/unregister message handler
  useEffect(() => {
    // Add handler to the global handlers list
    messageHandlers.push(handlerRef.current);
    
    // Check connection status periodically
    const checkConnectionInterval = setInterval(() => {
      const connected = !!globalSocket && globalSocket.readyState === WebSocket.OPEN;
      setIsConnected(connected);
    }, 1000);
    
    // Initialize connection if not already connected
    if (!globalSocket || globalSocket.readyState !== WebSocket.OPEN) {
      createWebSocketConnection()
        .then(() => setIsConnected(true))
        .catch(() => setIsConnected(false));
    }
    
    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (globalSocket && globalSocket.readyState === WebSocket.OPEN) {
        try {
          globalSocket.send(JSON.stringify({ type: "ping" }));
        } catch (err) {
          console.error("Error sending ping:", err);
        }
      }
    }, 30000);
    
    // Cleanup on unmount
    return () => {
      // Remove the handler
      const index = messageHandlers.indexOf(handlerRef.current);
      if (index !== -1) {
        messageHandlers.splice(index, 1);
      }
      
      clearInterval(checkConnectionInterval);
      clearInterval(pingInterval);
      
      // Don't close the socket here - it's shared
    };
  }, []);
  
  // Wrap the sendWebSocketMessage function to make it bound to this component
  const sendMessage = useCallback((message: WebSocketMessage) => {
    console.log('Sending WebSocket message:', message);
    return sendWebSocketMessage(message);
  }, []);
  
  return { isConnected, sendMessage };
};