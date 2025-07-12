import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, 
  MapPin, 
  Calendar, 
  Plus, 
  Search, 
  MessageSquare, 
  Star,
  Settings,
  LogOut,
  Users,
  ArrowRight,
  Edit
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  availability?: string[];
  average_rating?: number;
  successful_swaps?: number;
}

interface Skill {
  id: string;
  title: string;
  description?: string;
  category: string;
  is_offering: boolean;
}

interface SkillRequest {
  id: string;
  message?: string;
  status: string;
  created_at: string;
  requester_id: string;
  provider_id: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [pendingRequests, setPendingRequests] = useState<SkillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Fetch skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', user.id);

      if (skillsError) {
        console.error('Error fetching skills:', skillsError);
      } else {
        setSkills(skillsData || []);
      }

      // Fetch pending requests (simplified query)
      const { data: requestsData, error: requestsError } = await supabase
        .from('skill_requests')
        .select('*')
        .eq('provider_id', user.id)
        .eq('status', 'pending');

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
      } else if (requestsData) {
        // For each request, fetch the requester profile
        const requestsWithProfiles = await Promise.all(
          requestsData.map(async (request) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', request.requester_id)
              .single();
            
            return {
              ...request,
              profiles: profileData || { full_name: 'Unknown User' }
            };
          })
        );
        setPendingRequests(requestsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/");
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Accepted",
        description: "You've accepted the skill swap request.",
      });
      
      fetchUserData();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: "Error",
        description: "Failed to accept request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Declined",
        description: "You've declined the skill swap request.",
      });
      
      fetchUserData();
    } catch (error) {
      console.error('Error declining request:', error);
      toast({
        title: "Error",
        description: "Failed to decline request. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const skillsOffered = skills.filter(skill => skill.is_offering);
  const skillsWanted = skills.filter(skill => !skill.is_offering);

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                SkillSwap
              </Link>
              <Badge variant="secondary">Dashboard</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/browse">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Skills
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/requests">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Requests
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || user.email}! 👋
          </h1>
          <p className="text-muted-foreground">
            Ready to swap some skills today? Here's what's happening with your account.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Profile Overview</span>
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/profile/edit">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <Avatar className="w-20 h-20">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    ) : (
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                        {(profile?.full_name || user.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{profile?.full_name || user.email}</h3>
                    {profile?.location && (
                      <div className="flex items-center text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                      <div className="flex items-center space-x-4 mt-3">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          <span className="font-medium">{profile?.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {profile?.successful_swaps || 0} successful swaps
                        </div>
                      <Badge variant={profile?.is_public ? "secondary" : "outline"}>
                        {profile?.is_public ? "Public Profile" : "Private Profile"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>My Skills</CardTitle>
                <CardDescription>
                  Skills you offer and skills you're looking to learn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">SKILLS I OFFER</h4>
                  <div className="flex flex-wrap gap-2">
                    {skillsOffered.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="bg-success/20 text-success hover:bg-success/30 border-success/30">
                        {skill.title}
                      </Badge>
                    ))}
                    {skillsOffered.length === 0 && (
                      <p className="text-sm text-muted-foreground">No skills offered yet</p>
                    )}
                    <Button variant="outline" size="sm" className="h-7" asChild>
                      <Link to="/profile/edit">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Skill
                      </Link>
                    </Button>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">SKILLS I WANT</h4>
                  <div className="flex flex-wrap gap-2">
                    {skillsWanted.map((skill) => (
                      <Badge key={skill.id} variant="outline" className="border-primary/40 text-primary bg-primary/10 hover:bg-primary/20">
                        {skill.title}
                      </Badge>
                    ))}
                    {skillsWanted.length === 0 && (
                      <p className="text-sm text-muted-foreground">No skills wanted yet</p>
                    )}
                    <Button variant="outline" size="sm" className="h-7" asChild>
                      <Link to="/profile/edit">
                        <Plus className="w-3 h-3 mr-1" />
                        Add Skill
                      </Link>
                    </Button>
                  </div>
                </div>
                {profile?.availability && profile.availability.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">AVAILABILITY</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.availability.map((time, index) => (
                        <Badge key={index} variant="secondary" className="bg-accent">
                          <Calendar className="w-3 h-3 mr-1" />
                          {time}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="gradient" asChild>
                  <Link to="/browse">
                    <Search className="w-4 h-4 mr-2" />
                    Find Skills
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link to="/requests">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    View Requests
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link to="/network">
                    <Users className="w-4 h-4 mr-2" />
                    My Network
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pending Requests */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Pending Requests</span>
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {request.profiles?.full_name || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {request.status}
                          </Badge>
                        </div>
                        {request.message && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {request.message}
                          </p>
                        )}
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="flex-1"
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleDeclineRequest(request.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending requests
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Profile Views</span>
                    <span className="font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Skills Offered</span>
                    <span className="font-medium">{skillsOffered.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Skills Wanted</span>
                    <span className="font-medium">{skillsWanted.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-medium">N/A</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;