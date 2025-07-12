import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Send,
  AlertCircle
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
  user_id: string;
}

interface Skill {
  id: string;
  title: string;
  description?: string;
  category: string;
}

const CreateRequest = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [userSkillsOffered, setUserSkillsOffered] = useState<Skill[]>([]);
  const [targetSkillsOffered, setTargetSkillsOffered] = useState<Skill[]>([]);
  const [selectedOfferedSkill, setSelectedOfferedSkill] = useState("");
  const [selectedWantedSkill, setSelectedWantedSkill] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!userId) {
      navigate("/browse");
      return;
    }
    fetchData();
  }, [user, userId, navigate]);

  const fetchData = async () => {
    if (!user || !userId) return;

    try {
      // Fetch target user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        toast({
          title: "Error",
          description: "Failed to load user profile.",
          variant: "destructive",
        });
        navigate("/browse");
        return;
      }

      setTargetUser(profileData);

      // Fetch current user's skills offered
      const { data: mySkillsData } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_offering', true)
        .eq('is_approved', true);

      // Fetch target user's skills offered (what they can teach)
      const { data: targetSkillsData } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', profileData.user_id)
        .eq('is_offering', true)
        .eq('is_approved', true);

      setUserSkillsOffered(mySkillsData || []);
      setTargetSkillsOffered(targetSkillsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedOfferedSkill || !selectedWantedSkill) {
      toast({
        title: "Missing Information",
        description: "Please select both skills for the swap.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !targetUser) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('skill_requests')
        .insert({
          requester_id: user.id,
          provider_id: targetUser.user_id,
          offered_skill_id: selectedOfferedSkill,
          wanted_skill_id: selectedWantedSkill,
          message: message.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Sent!",
        description: "Your skill swap request has been sent successfully.",
      });

      navigate("/requests");
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">User not found</h3>
          <p className="text-muted-foreground mb-4">The user you're trying to contact doesn't exist.</p>
          <Button variant="outline" asChild>
            <Link to="/browse">Back to Browse</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/browse">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Browse
                </Link>
              </Button>
              <h1 className="text-xl font-semibold">Send Skill Swap Request</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Target User Info */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  {targetUser.avatar_url ? (
                    <AvatarImage src={targetUser.avatar_url} alt={targetUser.full_name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">
                      {targetUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{targetUser.full_name}</CardTitle>
                  {targetUser.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {targetUser.location}
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="font-medium">0.0</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {targetUser.bio && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">ABOUT</h4>
                  <p className="text-sm">{targetUser.bio}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">SKILLS THEY CAN TEACH</h4>
                <div className="flex flex-wrap gap-2">
                  {targetSkillsOffered.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-xs bg-success/20 text-success hover:bg-success/30 border-success/30">
                      {skill.title}
                    </Badge>
                  ))}
                  {targetSkillsOffered.length === 0 && (
                    <p className="text-sm text-muted-foreground">No skills offered</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Form */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Create Skill Swap Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Select Skill to Offer */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  SKILL YOU WANT TO LEARN FROM THEM
                </label>
                <Select value={selectedOfferedSkill} onValueChange={setSelectedOfferedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a skill they can teach" />
                  </SelectTrigger>
                  <SelectContent>
                    {userSkillsOffered.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        <div>
                          <div className="font-medium">{skill.title}</div>
                          {skill.description && (
                            <div className="text-xs text-muted-foreground">{skill.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {userSkillsOffered.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You need to add skills you can offer in your profile first.
                  </p>
                )}
              </div>

              {/* Select Skill to Request */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  SKILL YOU CAN TEACH THEM
                  
                </label>
                <Select value={selectedWantedSkill} onValueChange={setSelectedWantedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a skill you can teach" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetSkillsOffered.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        <div>
                          <div className="font-medium">{skill.title}</div>
                          {skill.description && (
                            <div className="text-xs text-muted-foreground">{skill.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetSkillsOffered.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This user hasn't listed any skills they can teach.
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  MESSAGE (OPTIONAL)
                </label>
                <Textarea
                  placeholder="Tell them why you're interested in this swap..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <Button
                className="w-full"
                variant="gradient"
                onClick={handleSubmitRequest}
                disabled={submitting || !selectedOfferedSkill || !selectedWantedSkill || userSkillsOffered.length === 0 || targetSkillsOffered.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CreateRequest;