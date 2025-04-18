import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Clipboard, 
  Eye, 
  RefreshCw, 
  LogOut,
  Edit, 
  Save,
  X
} from "lucide-react";
import PlanningDeck from "./PlanningDeck";
import TeamStatus from "./TeamStatus";
import VotingResults from "./VotingResults";
import StoryManager from "./StoryManager";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  type Session, 
  type Participant, 
  type Vote, 
  type Story 
} from "@/pages/Home";
import { getCardValues } from "@/lib/cardSystems";
import { MessageType } from "@shared/schema";

interface ActiveSessionProps {
  session: Session;
  currentUser: Participant | null;
  participants: Participant[];
  currentVote: string | null;
  votes: Vote[];
  stories: Story[];
  allVotesIn: boolean;
  onSelectCard: (value: string) => void;
  onRevealCards: () => void;
  onResetVoting: () => void;
  onSetStory: (story: string) => void;
  onAddStory: (title: string, link: string) => void;
  onSelectStory: (storyId: number) => void;
  onLeaveSession: () => void;
}

const ActiveSession = ({ 
  session, 
  currentUser,
  participants, 
  currentVote, 
  votes,
  stories,
  allVotesIn,
  onSelectCard, 
  onRevealCards, 
  onResetVoting,
  onSetStory,
  onAddStory,
  onSelectStory,
  onLeaveSession
}: ActiveSessionProps) => {
  const { toast } = useToast();
  const [storyText, setStoryText] = useState(session.currentStory || "");
  const [editingStory, setEditingStory] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const handleCopySessionId = () => {
    navigator.clipboard.writeText(session.id);
    toast({
      title: "Copied!",
      description: "Session ID copied to clipboard",
    });
  };
  
  const handleSaveStory = () => {
    if (storyText.trim()) {
      onSetStory(storyText.trim());
      setEditingStory(false);
    }
  };
  
  const handleCancelEditStory = () => {
    setStoryText(session.currentStory || "");
    setEditingStory(false);
  };
  
  const cardValues = getCardValues(session.votingSystem);
  const activeParticipants = participants.filter(p => p.connected);
  
  return (
    <div className="mb-8">
      {/* Session Info */}
      <Card className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-neutral-700">{session.name}</h2>
            <div className="flex items-center mt-1">
              <p className="text-neutral-500">
                Session ID: <span className="font-medium">{session.id}</span>
              </p>
              <button 
                className="ml-2 text-primary hover:text-primary/90"
                title="Copy to clipboard"
                onClick={handleCopySessionId}
              >
                <Clipboard className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-3 md:mt-0">
            <Button
              variant="outline" 
              className="text-destructive hover:text-destructive"
              onClick={() => setDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" /> Leave
            </Button>
            
            <Button
              className="bg-status-success hover:bg-status-success/90 text-white"
              onClick={onRevealCards}
              disabled={!allVotesIn || session.revealed}
              style={{ display: (!allVotesIn || session.revealed) ? 'none' : 'flex' }}
            >
              <Eye className="mr-2 h-4 w-4" /> Reveal Cards
            </Button>
            
            <Button
              variant="outline"
              className="text-neutral-700"
              onClick={onResetVoting}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Story */}
      <Card className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium mb-2 text-neutral-600">Current Story</h3>
          
          {currentUser?.isAdmin && !editingStory && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setEditingStory(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          
          {currentUser?.isAdmin && editingStory && (
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveStory}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelEditStory}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {editingStory ? (
          <Textarea 
            className="p-3 bg-neutral-100 rounded-md border border-neutral-200"
            placeholder="Enter story description..."
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            rows={3}
          />
        ) : (
          <div className="p-3 bg-neutral-100 rounded-md border border-neutral-200">
            <p className="text-neutral-600">
              {session.currentStory || "No story set. The session admin can add a story."}
            </p>
          </div>
        )}
      </Card>

      {/* Planning Deck */}
      {!session.revealed && (
        <PlanningDeck 
          cardValues={cardValues} 
          selectedCard={currentVote} 
          onCardSelect={onSelectCard} 
        />
      )}

      {/* Team Members' Status */}
      <TeamStatus 
        participants={activeParticipants} 
        votes={votes} 
        revealed={session.revealed} 
      />

      {/* User Stories Manager */}
      <div className="mb-6">
        <StoryManager
          isAdmin={!!currentUser?.isAdmin}
          sessionId={session.id}
          stories={stories}
          onAddStory={onAddStory}
          onSelectStory={onSelectStory}
        />
      </div>

      {/* Results Component */}
      {session.revealed && votes.length > 0 && (
        <VotingResults 
          votes={votes} 
          participants={participants}
          votingSystem={session.votingSystem}
          onResetVoting={onResetVoting} 
        />
      )}
      
      {/* Leave Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this planning session? You can rejoin later with the same session ID.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onLeaveSession();
                setDialogOpen(false);
              }}
            >
              Leave Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveSession;
