// Define card values for different voting systems
export const getCardValues = (votingSystem: string): string[] => {
  switch (votingSystem) {
    case "fibonacci":
      return ["0", "1", "2", "3", "5", "8", "13", "21", "?"];
    case "tshirt":
      return ["XS", "S", "M", "L", "XL", "XXL", "?"];
    case "standard":
      return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?"];
    default:
      return ["0", "1", "2", "3", "5", "8", "13", "21", "?"];
  }
};

// Calculate numeric value for T-shirt sizes
export const getTShirtValue = (size: string): number => {
  switch (size) {
    case "XS": return 1;
    case "S": return 2;
    case "M": return 3;
    case "L": return 5;
    case "XL": return 8;
    case "XXL": return 13;
    default: return 0;
  }
};

// Calculate statistics for votes
export const calculateStatistics = (votes: string[], votingSystem: string) => {
  // Convert t-shirt sizes to numeric if needed
  const numericVotes = votes
    .filter(vote => vote !== "?")
    .map(vote => {
      if (votingSystem === "tshirt") {
        return getTShirtValue(vote);
      }
      return parseFloat(vote);
    })
    .filter(vote => !isNaN(vote));

  if (numericVotes.length === 0) {
    return {
      average: "N/A",
      median: "N/A",
      mode: "N/A"
    };
  }

  // Calculate average
  const sum = numericVotes.reduce((acc, val) => acc + val, 0);
  const average = (sum / numericVotes.length).toFixed(1);

  // Calculate median
  const sorted = [...numericVotes].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? ((sorted[middle - 1] + sorted[middle]) / 2).toFixed(1)
    : sorted[middle].toString();

  // Calculate mode (most common vote)
  const voteCounts: Record<number, number> = {};
  numericVotes.forEach(vote => {
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  });

  let mode: number | null = null;
  let maxCount = 0;
  
  Object.entries(voteCounts).forEach(([vote, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mode = parseFloat(vote);
    }
  });

  return {
    average,
    median,
    mode: mode !== null ? mode.toString() : "N/A"
  };
};
