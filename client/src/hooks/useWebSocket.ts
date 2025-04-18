import { useState, useEffect, useCallback, useRef } from "react";
import { MessageType, type WebSocketMessage } from "@shared/schema";

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    
    // Close existing socket if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Choose the WebSocket protocol (secure or not) based on the page protocol
    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = isSecure ? 'wss://' : 'ws://';
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Connect to the WebSocket server using the same host and port as the page
    // but with a specific path to avoid conflicts with Vite's WebSocket
    let wsUrl = `${wsProtocol}${hostname}${port}/api/planning-poker-ws`;
    
    console.log("Connecting to WebSocket at:", wsUrl);
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log("WebSocket connected successfully");
      setIsConnected(true);
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
    
    socket.onclose = (event) => {
      console.log("WebSocket disconnected, code:", event.code, "reason:", event.reason);
      setIsConnected(false);
      
      // Schedule reconnect
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          connectWebSocket();
          reconnectTimeoutRef.current = null;
        }, 3000);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);
        onMessage(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    socketRef.current = socket;
  }, [onMessage]);
  
  // Initialize connection
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectWebSocket]);
  
  // Keep-alive ping
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Send a heartbeat to keep the connection alive
        try {
          socketRef.current.send(JSON.stringify({ type: "ping" }));
        } catch (err) {
          console.error("Error sending ping:", err);
        }
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
    };
  }, []);
  
  // Function to send messages
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
      } catch (err) {
        console.error("Error sending message:", err);
        // Try to reconnect on error
        connectWebSocket();
      }
    } else {
      console.error("WebSocket is not connected, trying to reconnect...");
      connectWebSocket();
      
      // Queue the message to be sent after connection
      setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          try {
            socketRef.current.send(JSON.stringify(message));
          } catch (err) {
            console.error("Error sending queued message:", err);
          }
        }
      }, 1000);
    }
  }, [connectWebSocket]);
  
  return { isConnected, sendMessage };
};
