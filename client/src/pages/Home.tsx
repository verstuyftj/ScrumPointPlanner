import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SessionManager from "@/components/SessionManager";
import ActiveSession from "@/components/ActiveSession";
import { useWebSocket } from "@/hooks/useWebSocket";
import { MessageType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export type Participant = {
  id: number;
  name: string;
  isAdmin: boolean;
  connected: boolean;
  sessionId: string;
};

export type Session = {
  id: string;
  name: string;
  createdBy: string;
  votingSystem: "fibonacci" | "tshirt" | "standard";
  currentStory: string | null;
  active: boolean;
  revealed: boolean;
};

export type Story = {
  id: number;
  sessionId: string;
  title: string;
  link: string;
  isCompleted: boolean;
  createdAt: Date;
};

export type Vote = {
  id: number;
  sessionId: string;
  participantId: number;
  value: string;
};

const Home = () => {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentVote, setCurrentVote] = useState<string | null>(null);
  const [allVotesIn, setAllVotesIn] = useState(false);
  const { toast } = useToast();
  
  const handleSocketMessage = (message: any) => {
    console.log("Socket message:", message);
    
    switch (message.type) {
      case MessageType.SESSION_UPDATE:
        if (message.payload.session) {
          setActiveSession(message.payload.session);
        }
        if (message.payload.participant) {
          setCurrentUser(message.payload.participant);
        }
        if (message.payload.participants) {
          setParticipants(message.payload.participants);
        }
        if (message.payload.votes) {
          setVotes(message.payload.votes);
        }
        if (message.payload.hasOwnProperty('allVotesIn')) {
          setAllVotesIn(message.payload.allVotesIn);
        }
        break;
        
      case MessageType.VOTE_UPDATED:
        if (message.payload.vote) {
          setCurrentVote(message.payload.vote.value);
        }
        if (message.payload.participantId) {
          setParticipants(prev => 
            prev.map(p => 
              p.id === message.payload.participantId 
                ? { ...p, hasVoted: true } 
                : p
            )
          );
        }
        break;
      
      case MessageType.PARTICIPANT_JOINED:
        if (message.payload.participant) {
          setParticipants(prev => [...prev, message.payload.participant]);
          toast({
            title: "Participant joined",
            description: `${message.payload.participant.name} has joined the session`,
          });
        }
        break;
        
      case MessageType.PARTICIPANT_LEFT:
        if (message.payload.participantId) {
          const participant = participants.find(p => p.id === message.payload.participantId);
          setParticipants(prev => 
            prev.map(p => 
              p.id === message.payload.participantId 
                ? { ...p, connected: false } 
                : p
            )
          );
          if (participant) {
            toast({
              title: "Participant left",
              description: `${participant.name} has left the session`,
            });
          }
        }
        break;
        
      case MessageType.VOTES_REVEALED:
        if (message.payload.votes) {
          setVotes(message.payload.votes);
        }
        if (message.payload.session) {
          setActiveSession(message.payload.session);
        }
        break;
        
      case MessageType.VOTING_RESET:
        setVotes([]);
        setCurrentVote(null);
        setAllVotesIn(false);
        if (message.payload.session) {
          setActiveSession(message.payload.session);
        }
        break;
        
      case MessageType.STORIES_UPDATED:
        if (message.payload.stories) {
          setStories(message.payload.stories);
        }
        break;
        
      case MessageType.STORY_ADDED:
        if (message.payload.story) {
          setStories(prev => [...prev, message.payload.story]);
          toast({
            title: "Story added",
            description: `"${message.payload.story.title}" has been added`,
          });
        }
        break;
        
      case MessageType.STORY_UPDATED:
        if (message.payload.session) {
          setActiveSession(message.payload.session);
          setVotes([]);
          setCurrentVote(null);
          setAllVotesIn(false);
          
          const storyDetails = message.payload.currentStory 
            ? `"${message.payload.currentStory.title}"`
            : "New story";
            
          toast({
            title: "Story selected",
            description: `${storyDetails} is now being estimated`,
          });
        }
        break;
        
      case MessageType.ERROR:
        toast({
          title: "Error",
          description: message.payload.message,
          variant: "destructive",
        });
        break;
    }
  };

  const { sendMessage } = useWebSocket(handleSocketMessage);

  const handleCreateSession = (sessionName: string, userName: string, votingSystem: string) => {
    console.log('Creating session with:', { sessionName, userName, votingSystem });
    
    // Display a toast to indicate we're trying to create a session
    toast({
      title: "Creating session...",
      description: `Attempting to create session "${sessionName}" as ${userName}`,
    });
    
    const message = {
      type: MessageType.JOIN_SESSION,
      payload: {
        sessionName,
        name: userName,
        isAdmin: true,
        votingSystem,
      },
    };
    
    console.log('Sending message:', message);
    sendMessage(message);
  };

  const handleJoinSession = (sessionId: string, userName: string) => {
    sendMessage({
      type: MessageType.JOIN_SESSION,
      payload: {
        sessionId,
        name: userName,
      },
    });
  };

  const handleSelectCard = (value: string) => {
    setCurrentVote(value);
    sendMessage({
      type: MessageType.CAST_VOTE,
      payload: {
        value,
      },
    });
  };

  const handleRevealCards = () => {
    sendMessage({
      type: MessageType.REVEAL_VOTES,
      payload: {},
    });
  };

  const handleResetVoting = () => {
    sendMessage({
      type: MessageType.RESET_VOTING,
      payload: {},
    });
  };

  const handleSetStory = (story: string) => {
    sendMessage({
      type: MessageType.SET_STORY,
      payload: {
        story,
      },
    });
  };
  
  const handleAddStory = (title: string, link: string) => {
    sendMessage({
      type: MessageType.ADD_STORY,
      payload: {
        title,
        link
      },
    });
  };
  
  const handleSelectStory = (storyId: number) => {
    sendMessage({
      type: MessageType.SET_CURRENT_STORY,
      payload: {
        storyId
      },
    });
  };
  
  // Load stories when session is joined
  useEffect(() => {
    if (activeSession) {
      sendMessage({
        type: MessageType.GET_STORIES,
        payload: {},
      });
    }
  }, [activeSession?.id]);

  const handleLeaveSession = () => {
    sendMessage({
      type: MessageType.LEAVE_SESSION,
      payload: {},
    });
    setActiveSession(null);
    setCurrentUser(null);
    setParticipants([]);
    setVotes([]);
    setStories([]);
    setCurrentVote(null);
    setAllVotesIn(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100">
      <Header userName={currentUser?.name} />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        {!activeSession ? (
          <SessionManager 
            onCreateSession={handleCreateSession} 
            onJoinSession={handleJoinSession} 
          />
        ) : (
          <ActiveSession 
            session={activeSession}
            currentUser={currentUser}
            participants={participants}
            currentVote={currentVote}
            votes={votes}
            stories={stories}
            allVotesIn={allVotesIn}
            onSelectCard={handleSelectCard}
            onRevealCards={handleRevealCards}
            onResetVoting={handleResetVoting}
            onSetStory={handleSetStory}
            onAddStory={handleAddStory}
            onSelectStory={handleSelectStory}
            onLeaveSession={handleLeaveSession}
          />
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
