import { type Participant, type Vote } from "@/pages/Home";
import { CheckCircle, Clock } from "lucide-react";
import { useEffect } from "react";

interface TeamStatusProps {
  participants: Participant[];
  votes: Vote[];
  revealed: boolean;
}

const TeamStatus = ({ participants, votes, revealed }: TeamStatusProps) => {
  useEffect(() => {
    console.log('Votes updated:', {
      votes,
      timestamp: new Date().toISOString(),
      votesLength: votes.length
    });
  }, [votes]);

  console.log('TeamStatus render:', {
    participantsCount: participants.length,
    votesCount: votes.length,
    revealed
  });

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
                  {participant.hasVoted ? (
                    "Vote cast"
                  ) : (
                    "No vote"
                  )}
                </div>
              ) : (
                <div className={`text-sm ${participant.hasVoted ? "text-status-success" : "text-neutral-400"}`}>
                  {participant.hasVoted ? (
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
