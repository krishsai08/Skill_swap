import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Star, 
  MessageSquare, 
  CheckCircle, 
  Users,
  MapPin,
  Calendar
} from "lucide-react";

interface Connection {
  id: string;
  requester_id: string;
  provider_id: string;
  offered_skill_id: string;
  wanted_skill_id: string;
  message?: string;
  status: string;
  created_at: string;
  partner_profile?: {
    full_name: string;
    avatar_url?: string;
    location?: string;
  } | null;
  offered_skill?: {
    title: string;
  } | null;
  wanted_skill?: {
    title: string;
  } | null;
}

const Networks = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchConnections();
  }, [user, navigate]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      // Fetch accepted skill requests where user is either requester or provider
      const { data: connectionsData, error } = await supabase
        .from('skill_requests')
        .select('*')
        .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching connections:', error);
        return;
      }

      // Enrich the data with partner profiles and skill information
      const enrichedConnections = await enrichConnectionsWithData(connectionsData || []);
      setConnections(enrichedConnections);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichConnectionsWithData = async (connections: any[]) => {
    if (!connections || connections.length === 0) return [];

    const enrichedConnections = [];

    for (const connection of connections) {
      let enrichedConnection = { ...connection };

      // Determine partner ID (the other person in the connection)
      const partnerId = connection.requester_id === user?.id 
        ? connection.provider_id 
        : connection.requester_id;

      // Get partner profile
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, location')
        .eq('user_id', partnerId)
        .single();
      enrichedConnection.partner_profile = partnerProfile;

      // Get offered skill
      const { data: offeredSkill } = await supabase
        .from('skills')
        .select('title')
        .eq('id', connection.offered_skill_id)
        .single();
      enrichedConnection.offered_skill = offeredSkill;

      // Get wanted skill
      const { data: wantedSkill } = await supabase
        .from('skills')
        .select('title')
        .eq('id', connection.wanted_skill_id)
        .single();
      enrichedConnection.wanted_skill = wantedSkill;

      enrichedConnections.push(enrichedConnection);
    }

    return enrichedConnections;
  };

  const handleCompleteSwap = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'completed' })
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: "Swap Completed!",
        description: "Don't forget to rate your learning partner.",
      });
      
      fetchConnections(); // Refresh data
    } catch (error) {
      console.error('Error completing swap:', error);
      toast({
        title: "Error",
        description: "Failed to complete swap.",
        variant: "destructive",
      });
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <h1 className="text-xl font-semibold">My Learning Network</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {connections.length} connections
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {connections.length > 0 ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Active Learning Connections</h2>
              <p className="text-muted-foreground">
                These are people you're actively learning with or teaching
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map((connection) => {
                const isRequester = connection.requester_id === user.id;
                return (
                  <Card key={connection.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            {connection.partner_profile?.avatar_url ? (
                              <AvatarImage src={connection.partner_profile.avatar_url} alt={connection.partner_profile.full_name} />
                            ) : (
                              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                                {connection.partner_profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{connection.partner_profile?.full_name || 'Unknown User'}</CardTitle>
                            {connection.partner_profile?.location && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3 mr-1" />
                                {connection.partner_profile.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-sm">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          <span className="font-medium">0.0</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">SKILL EXCHANGE</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {isRequester ? "You teach:" : "They teach:"}
                            </span>
                            <Badge variant="secondary" className="bg-success/10 text-success-foreground border-success/20">
                              {connection.offered_skill?.title}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {isRequester ? "You learn:" : "They learn:"}
                            </span>
                            <Badge variant="outline" className="border-primary/20 text-primary">
                              {connection.wanted_skill?.title}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {connection.message && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">MESSAGE</h4>
                          <p className="text-sm bg-muted/50 rounded-lg p-2">{connection.message}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          Connected {new Date(connection.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          asChild
                        >
                          <Link to={`/chat/${connection.id}`}>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Message
                          </Link>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="success"
                          className="flex-1"
                          onClick={() => handleCompleteSwap(connection.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">No Learning Connections Yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start connecting with other learners! Browse skills and send requests to build your learning network.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gradient" asChild>
                <Link to="/browse">
                  <Users className="w-4 h-4 mr-2" />
                  Browse Skills
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/requests">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Requests
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Networks;