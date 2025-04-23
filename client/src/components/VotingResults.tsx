import { useMemo } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Participant, type Vote } from "@/pages/Home";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface VotingResultsProps {
  votes: Vote[];
  participants: Participant[];
  votingSystem: string;
  isAdmin: boolean;
  onResetVoting: () => void;
}

const VotingResults = ({ 
  votes, 
  participants, 
  votingSystem,
  isAdmin,
  onResetVoting 
}: VotingResultsProps) => {
  // Get participant name by ID
  const getParticipantName = (id: number) => {
    const participant = participants.find(p => p.id === id);
    return participant ? participant.name : "Unknown";
  };
  
  // Get participant initials
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Get avatar color based on name
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
  
  // Calculate chart data
  const chartData = useMemo(() => {
    const voteCountMap: Record<string, number> = {};
    
    votes.forEach(vote => {
      voteCountMap[vote.value] = (voteCountMap[vote.value] || 0) + 1;
    });
    
    return Object.entries(voteCountMap).map(([value, count]) => ({
      value,
      count,
      label: `${count} vote${count !== 1 ? 's' : ''}`
    })).sort((a, b) => {
      // Sort numeric values properly
      if (a.value === '?' || b.value === '?') {
        return a.value === '?' ? 1 : -1;
      }
      
      if (votingSystem === 'tshirt') {
        const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        return sizes.indexOf(a.value) - sizes.indexOf(b.value);
      }
      
      return parseFloat(a.value) - parseFloat(b.value);
    });
  }, [votes, votingSystem]);
  
  // Calculate statistics
  const statistics = useMemo(() => {
    const numericVotes = votes
      .filter(vote => vote.value !== '?' && !isNaN(parseFloat(vote.value)))
      .map(vote => parseFloat(vote.value));
    
    if (numericVotes.length === 0) {
      return {
        average: 'N/A',
        median: 'N/A',
        consensus: 'None'
      };
    }
    
    // Calculate average
    const sum = numericVotes.reduce((acc, val) => acc + val, 0);
    const average = (sum / numericVotes.length).toFixed(1);
    
    // Calculate median
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? ((sorted[middle - 1] + sorted[middle]) / 2).toString()
      : sorted[middle].toString();
    
    // Calculate consensus level
    const uniqueValues = new Set(votes.map(v => v.value)).size;
    const consensusRatio = votes.length > 0 ? uniqueValues / votes.length : 1;
    
    let consensus;
    if (consensusRatio <= 0.2) {
      consensus = 'Strong';
    } else if (consensusRatio <= 0.4) {
      consensus = 'Moderate';
    } else {
      consensus = 'Weak';
    }
    
    return {
      average,
      median,
      consensus
    };
  }, [votes]);
  
  return (
    <Card className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h2 className="text-2xl font-semibold text-neutral-700">Voting Results</h2>
        {isAdmin && (
          <div className="flex space-x-2 mt-3 md:mt-0">
            <Button 
              className="bg-primary hover:bg-primary/90 text-white" 
              onClick={onResetVoting}
            >
              <Play className="mr-2 h-4 w-4" /> Next Story
            </Button>
          </div>
        )}
      </div>

      {/* Results Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3 text-neutral-600">Vote Distribution</h3>
        <div className="h-64 bg-neutral-100 rounded-lg border border-neutral-200 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="value" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="label" position="top" style={{ fontSize: '12px' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-100 p-4 rounded-lg border border-neutral-200">
          <h4 className="text-sm font-medium text-neutral-500 mb-1">Average</h4>
          <p className="text-2xl font-semibold text-neutral-700">{statistics.average}</p>
        </div>
        <div className="bg-neutral-100 p-4 rounded-lg border border-neutral-200">
          <h4 className="text-sm font-medium text-neutral-500 mb-1">Median</h4>
          <p className="text-2xl font-semibold text-neutral-700">{statistics.median}</p>
        </div>
        <div className="bg-neutral-100 p-4 rounded-lg border border-neutral-200">
          <h4 className="text-sm font-medium text-neutral-500 mb-1">Consensus</h4>
          <p className="text-2xl font-semibold text-primary">{statistics.consensus}</p>
        </div>
      </div>

      {/* Individual Votes */}
      <div>
        <h3 className="text-lg font-medium mb-3 text-neutral-600">Individual Estimates</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {votes.map((vote) => {
            const name = getParticipantName(vote.participantId);
            const initials = getInitials(name);
            const avatarColor = getAvatarColor(name);
            
            return (
              <div 
                key={vote.participantId} 
                className="bg-neutral-100 p-3 rounded-lg border border-neutral-200 flex flex-col items-center"
              >
                <div className={`h-10 w-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-medium mb-2`}>
                  {initials}
                </div>
                <p className="font-medium text-neutral-700">{name}</p>
                <div className="mt-2 h-12 w-12 bg-white rounded-md shadow flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{vote.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default VotingResults;
