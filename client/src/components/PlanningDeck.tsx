import { cn } from "@/lib/utils";

interface PlanningDeckProps {
  cardValues: string[];
  selectedCard: string | null;
  onCardSelect: (value: string) => void;
}

const PlanningDeck = ({ 
  cardValues, 
  selectedCard, 
  onCardSelect 
}: PlanningDeckProps) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium mb-3 text-neutral-600">Your Estimation</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 sm:gap-3">
        {cardValues.map((value) => (
          <div 
            key={value} 
            className="card cursor-pointer transition-transform hover:-translate-y-2"
            onClick={() => onCardSelect(value)}
          >
            <div 
              className={cn(
                "card-inner h-20 sm:h-24 md:h-28 w-full bg-white rounded-lg shadow-md overflow-hidden border-2",
                selectedCard === value ? "border-primary" : "border-transparent hover:border-primary"
              )}
            >
              <div className="card-front flex items-center justify-center h-full">
                <span className="text-2xl font-bold text-primary">{value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanningDeck;
