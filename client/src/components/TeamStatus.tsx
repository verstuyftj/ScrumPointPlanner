import { type Participant, type Vote } from "@/pages/Home";
import { CheckCircle, Clock } from "lucide-react";

interface TeamStatusProps {
  participants: Participant[];
  votes: Vote[];
  revealed: boolean;
}

const TeamStatus = ({ participants, votes, revealed }: TeamStatusProps) => {
  // Get unique first letters for participant avatars
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Get random but consistent color for participant avatar
  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-primary", 
      "bg-accent", 
      "bg-secondary-light", 
      "bg-neutral-500", 
      "bg-status-info"
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };
  
  // Check if participant has voted
  const hasParticipantVoted = (participantId: number) => {
    return votes.some(vote => vote.participantId === participantId);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-lg font-medium mb-3 text-neutral-600">
        Team Members ({participants.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {participants.map(participant => (
          <div 
            key={participant.id} 
            className="flex items-center p-3 bg-neutral-100 rounded-md border border-neutral-200"
          >
            <div className={`flex-shrink-0 h-10 w-10 rounded-full ${getAvatarColor(participant.name)} flex items-center justify-center text-white font-medium`}>
              {getInitials(participant.name)}
            </div>
            <div className="ml-3">
              <p className="font-medium text-neutral-700">
                {participant.name}
                {participant.isAdmin && (
                  <span className="ml-1 text-xs bg-primary text-white px-1 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </p>
              {revealed ? (
                <div className="text-sm text-neutral-500">
                  {hasParticipantVoted(participant.id) ? (
                    "Vote cast"
                  ) : (
                    "No vote"
                  )}
                </div>
              ) : (
                <div className={`text-sm ${hasParticipantVoted(participant.id) ? "text-status-success" : "text-neutral-400"}`}>
                  {hasParticipantVoted(participant.id) ? (
                    <>
                      <CheckCircle className="inline-block mr-1 h-3 w-3" /> Voted
                    </>
                  ) : (
                    <>
                      <Clock className="inline-block mr-1 h-3 w-3" /> Thinking...
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamStatus;
