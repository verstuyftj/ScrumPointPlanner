import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { type Story } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, CheckCircle, Edit } from "lucide-react";

interface StoryManagerProps {
  isAdmin: boolean;
  sessionId: string;
  stories: Story[];
  onAddStory: (title: string, link: string) => void;
  onSelectStory: (storyId: number) => void;
  onUpdateStory: (storyId: number, title: string, link: string) => void;
}

const StoryManager: React.FC<StoryManagerProps> = ({
  isAdmin,
  stories,
  onAddStory,
  onSelectStory,
  onUpdateStory
}) => {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  const { votedStories, unvotedStories } = useMemo(() => {
    const voted = stories.filter(story => story.isCompleted);
    const unvoted = stories.filter(story => !story.isCompleted);
    return { votedStories: voted, unvotedStories: unvoted };
  }, [stories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && link.trim()) {
      if (editingStory) {
        onUpdateStory(editingStory.id, title.trim(), link.trim());
        setEditingStory(null);
      } else {
        onAddStory(title.trim(), link.trim());
      }
      setTitle("");
      setLink("");
    }
  };

  const handleStoryClick = (story: Story) => {
    onSelectStory(story.id);
  };

  const handleEditClick = (e: React.MouseEvent, story: Story) => {
    e.stopPropagation();
    setEditingStory(story);
    setTitle(story.title);
    setLink(story.link);
  };

  const handleCancelEdit = () => {
    setEditingStory(null);
    setTitle("");
    setLink("");
  };

  const openStoryLink = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const StoryList = ({ stories, title }: { stories: Story[], title: string }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-neutral-500 mb-2">{title}</h3>
      {stories.length === 0 ? (
        <div className="text-center py-2 text-sm text-muted-foreground">
          No stories
        </div>
      ) : (
        stories.map((story) => (
          <div 
            key={story.id}
            className={`flex items-center justify-between p-3 ${isAdmin ? 'hover:bg-accent cursor-pointer' : ''} rounded-md transition-colors`}
            onClick={isAdmin ? () => handleStoryClick(story) : undefined}
          >
            <div className="flex-1 mr-2 font-medium flex items-center gap-2">
              {story.isCompleted && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {story.title}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => handleEditClick(e, story)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => openStoryLink(e, story.link)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

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
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingStory ? 'Update Story' : 'Add Story'}
              </Button>
              {editingStory && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
        
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-6">
            <StoryList stories={unvotedStories} title="Stories to Vote" />
            {votedStories.length > 0 && (
              <>
                <Separator />
                <StoryList stories={votedStories} title="Completed Stories" />
              </>
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