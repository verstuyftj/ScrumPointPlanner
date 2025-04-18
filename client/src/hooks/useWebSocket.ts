import { useState, useEffect, useCallback, useRef } from "react";
import { MessageType, type WebSocketMessage } from "@shared/schema";

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };
    
    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
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
    
    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, [onMessage]);
  
  // Reconnect if connection closes
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Send a heartbeat to keep the connection alive
        socketRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
    };
  }, []);
  
  // Function to send messages
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }, []);
  
  return { isConnected, sendMessage };
};
