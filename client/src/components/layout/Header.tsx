import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  userName?: string;
}

const Header = ({ userName }: HeaderProps) => {
  // Get initials from user name
  const getInitials = (name?: string) => {
    if (!name) return "";
    
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-primary shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Layers className="text-white text-2xl" />
          <h1 className="text-xl font-semibold text-white">Scrum Poker</h1>
        </div>
        
        {userName && (
          <div className="flex items-center space-x-2">
            <span className="text-white hidden md:inline">{userName}</span>
            <Avatar className="h-8 w-8 bg-primary-light text-white">
              <AvatarFallback>{getInitials(userName)}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
