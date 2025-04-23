import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { type Story } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";

interface StoryManagerProps {
  isAdmin: boolean;
  sessionId: string;
  stories: Story[];
  onAddStory: (title: string, link: string) => void;
  onSelectStory: (storyId: number) => void;
}

const StoryManager: React.FC<StoryManagerProps> = ({
  isAdmin,
  stories,
  onAddStory,
  onSelectStory
}) => {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && link.trim()) {
      onAddStory(title.trim(), link.trim());
      setTitle("");
      setLink("");
    }
  };

  const handleStoryClick = (story: Story) => {
    onSelectStory(story.id);
  };

  const openStoryLink = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User Stories</CardTitle>
        <CardDescription>
          {isAdmin 
            ? "Add and manage user stories for estimation"
            : "Stories added by the moderator"}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isAdmin && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-4">
            <div className="grid w-full gap-2">
              <Label htmlFor="title">Story Title</Label>
              <Input 
                id="title"
                placeholder="Enter a concise story title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required
              />
            </div>
            
            <div className="grid w-full gap-2">
              <Label htmlFor="link">Story Link</Label>
              <Input 
                id="link"
                placeholder="Enter URL to story details (JIRA, GitHub, etc.)" 
                value={link} 
                onChange={(e) => setLink(e.target.value)} 
                required
              />
            </div>
            
            <Button type="submit" className="w-full">
              Add Story
            </Button>
          </form>
        )}
        
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {stories.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No stories added yet.
              </div>
            ) : (
              stories.map((story) => (
                <div 
                  key={story.id}
                  className={`flex items-center justify-between p-3 ${isAdmin ? 'hover:bg-accent cursor-pointer' : ''} rounded-md transition-colors`}
                  onClick={isAdmin ? () => handleStoryClick(story) : undefined}
                >
                  <div className="flex-1 mr-2 font-medium">
                    {story.title}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => openStoryLink(e, story.link)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          {isAdmin 
            ? "Click on a story to select it for voting"
            : "Click on story links to view details"}
        </p>
      </CardFooter>
    </Card>
  );
};

export default StoryManager;