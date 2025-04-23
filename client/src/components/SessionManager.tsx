import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form validation schemas
const createSessionSchema = z.object({
  sessionName: z.string().min(1, "Session name is required"),
  userName: z.string().min(1, "Your name is required"),
  votingSystem: z.enum(["fibonacci", "tshirt", "standard"]),
});

const joinSessionSchema = z.object({
  sessionId: z.string().length(6, "Session ID must be 6 characters").toUpperCase(),
  userName: z.string().min(1, "Your name is required"),
});

type CreateSessionFormData = z.infer<typeof createSessionSchema>;
type JoinSessionFormData = z.infer<typeof joinSessionSchema>;

interface SessionManagerProps {
  onCreateSession: (sessionName: string, userName: string, votingSystem: string) => void;
  onJoinSession: (sessionId: string, userName: string) => void;
}

const SessionManager = ({ onCreateSession, onJoinSession }: SessionManagerProps) => {
  // Create session form
  const createForm = useForm<CreateSessionFormData>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      sessionName: "",
      userName: "",
      votingSystem: "fibonacci",
    },
  });

  // Join session form
  const joinForm = useForm<JoinSessionFormData>({
    resolver: zodResolver(joinSessionSchema),
    defaultValues: {
      sessionId: "",
      userName: "",
    },
  });

  const handleCreateSession = (data: CreateSessionFormData) => {
    onCreateSession(data.sessionName, data.userName, data.votingSystem);
  };

  const handleJoinSession = (data: JoinSessionFormData) => {
    onJoinSession(data.sessionId, data.userName);
  };

  return (
    <div className="mb-8">
      <Card className="bg-white rounded-lg shadow-md">
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold mb-4 text-neutral-600">Start Planning</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Session */}
            <div className="bg-neutral-100 p-6 rounded-lg border border-neutral-200">
              <h3 className="text-lg font-medium mb-3 text-neutral-600">Create New Session</h3>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateSession)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="sessionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-500">Session Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Sprint Planning #42" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-500">Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="votingSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-500">Voting System</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a voting system" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fibonacci">Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, ?)</SelectItem>
                            <SelectItem value="tshirt">T-Shirt Sizes (XS, S, M, L, XL, XXL, ?)</SelectItem>
                            <SelectItem value="standard">Standard (0-10, ?)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white" 
                    disabled={createForm.formState.isSubmitting}
                  >
                    Create Session
                  </Button>
                </form>
              </Form>
            </div>
            
            {/* Join Session */}
            <div className="bg-neutral-100 p-6 rounded-lg border border-neutral-200">
              <h3 className="text-lg font-medium mb-3 text-neutral-600">Join Existing Session</h3>
              <Form {...joinForm}>
                <form onSubmit={joinForm.handleSubmit(handleJoinSession)} className="space-y-4">
                  <FormField
                    control={joinForm.control}
                    name="sessionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-500">Session ID</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. ABC123"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={joinForm.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-neutral-500">Your Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white mt-4" 
                    disabled={joinForm.formState.isSubmitting}
                  >
                    Join Session
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionManager;
