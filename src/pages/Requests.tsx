import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Clock, 
  Check, 
  X, 
  MessageSquare, 
  Star,
  Calendar,
  Trash2,
  UserCheck,
  AlertCircle
} from "lucide-react";

interface SkillRequest {
  id: string;
  requester_id: string;
  provider_id: string;
  offered_skill_id: string;
  wanted_skill_id: string;
  message?: string;
  status: string;
  created_at: string;
  requester_profile?: {
    full_name: string;
    avatar_url?: string;
  } | null;
  provider_profile?: {
    full_name: string;
    avatar_url?: string;
  } | null;
  offered_skill?: {
    title: string;
  } | null;
  wanted_skill?: {
    title: string;
  } | null;
}

const Requests = () => {
  const [incomingRequests, setIncomingRequests] = useState<SkillRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SkillRequest[]>([]);
  const [acceptedSwaps, setAcceptedSwaps] = useState<SkillRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRequests();
  }, [user, navigate]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // Fetch incoming requests (where current user is the provider)
      const { data: incomingData, error: incomingError } = await supabase
        .from('skill_requests')
        .select('*')
        .eq('provider_id', user.id)
        .eq('status', 'pending');

      // Fetch outgoing requests (where current user is the requester)
      const { data: outgoingData, error: outgoingError } = await supabase
        .from('skill_requests')
        .select('*')
        .eq('requester_id', user.id)
        .in('status', ['pending', 'accepted']);

      // Fetch accepted swaps
      const { data: acceptedData, error: acceptedError } = await supabase
        .from('skill_requests')
        .select('*')
        .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (incomingError) console.error('Incoming error:', incomingError);
      if (outgoingError) console.error('Outgoing error:', outgoingError);
      if (acceptedError) console.error('Accepted error:', acceptedError);

      // Enrich the data with profile and skill information
      const enrichedIncoming = await enrichRequestsWithProfiles(incomingData || [], 'requester');
      const enrichedOutgoing = await enrichRequestsWithProfiles(outgoingData || [], 'provider');
      const enrichedAccepted = await enrichRequestsWithProfiles(acceptedData || [], 'both');

      setIncomingRequests(enrichedIncoming);
      setOutgoingRequests(enrichedOutgoing);
      setAcceptedSwaps(enrichedAccepted);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichRequestsWithProfiles = async (requests: any[], profileType: 'requester' | 'provider' | 'both') => {
    if (!requests || requests.length === 0) return [];

    const enrichedRequests = [];

    for (const request of requests) {
      let enrichedRequest = { ...request };

      // Get requester profile if needed
      if (profileType === 'requester' || profileType === 'both') {
        const { data: requesterProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', request.requester_id)
          .single();
        enrichedRequest.requester_profile = requesterProfile;
      }

      // Get provider profile if needed
      if (profileType === 'provider' || profileType === 'both') {
        const { data: providerProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', request.provider_id)
          .single();
        enrichedRequest.provider_profile = providerProfile;
      }

      // Get offered skill
      const { data: offeredSkill } = await supabase
        .from('skills')
        .select('title')
        .eq('id', request.offered_skill_id)
        .single();
      enrichedRequest.offered_skill = offeredSkill;

      // Get wanted skill
      const { data: wantedSkill } = await supabase
        .from('skills')
        .select('title')
        .eq('id', request.wanted_skill_id)
        .single();
      enrichedRequest.wanted_skill = wantedSkill;

      enrichedRequests.push(enrichedRequest);
    }

    return enrichedRequests;
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Accepted!",
        description: "The skill swap has been accepted.",
      });
      
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error('Error accepting request:', error);
      toast({
        title: "Error",
        description: "Failed to accept request.",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "The request has been declined.",
      });
      
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Deleted",
        description: "Your outgoing request has been cancelled.",
      });
      
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteSwap = async (swapId: string) => {
    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'completed' })
        .eq('id', swapId);

      if (error) throw error;

      toast({
        title: "Swap Completed!",
        description: "Don't forget to rate your partner.",
      });
      
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error('Error completing swap:', error);
      toast({
        title: "Error",
        description: "Failed to complete swap.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-warning/20 text-warning"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "accepted":
        return <Badge variant="secondary" className="bg-success/10 text-success border-success/20"><Check className="w-3 h-3 mr-1" />Accepted</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20"><UserCheck className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading requests...</p>
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
              <h1 className="text-xl font-semibold">Skill Swap Requests</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="incoming" className="flex items-center space-x-2">
              <span>Incoming</span>
              {incomingRequests.length > 0 && (
                <Badge variant="destructive" className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                  {incomingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
            <TabsTrigger value="active">Active Swaps</TabsTrigger>
          </TabsList>

          {/* Incoming Requests */}
          <TabsContent value="incoming" className="space-y-4">
            {incomingRequests.length > 0 ? (
              incomingRequests.map((request) => (
                <Card key={request.id} className="shadow-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          {request.requester_profile?.avatar_url ? (
                            <AvatarImage src={request.requester_profile.avatar_url} />
                          ) : (
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                              {request.requester_profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.requester_profile?.full_name || 'Unknown User'}</CardTitle>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-500 mr-1" />
                              <span>0.0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">SKILL SWAP</h4>
                      <p className="font-medium">
                        {request.offered_skill?.title} for {request.wanted_skill?.title}
                      </p>
                    </div>
                    {request.message && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">MESSAGE</h4>
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Decline
                        </Button>
                        <Button 
                          size="sm" 
                          variant="success"
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No incoming requests</h3>
                <p className="text-muted-foreground">When someone wants to swap skills with you, their requests will appear here.</p>
              </div>
            )}
          </TabsContent>

          {/* Outgoing Requests */}
          <TabsContent value="outgoing" className="space-y-4">
            {outgoingRequests.length > 0 ? (
              outgoingRequests.map((request) => (
                <Card key={request.id} className="shadow-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          {request.provider_profile?.avatar_url ? (
                            <AvatarImage src={request.provider_profile.avatar_url} />
                          ) : (
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                              {request.provider_profile?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{request.provider_profile?.full_name || 'Unknown User'}</CardTitle>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-500 mr-1" />
                              <span>0.0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">SKILL SWAP</h4>
                      <p className="font-medium">
                        {request.offered_skill?.title} for {request.wanted_skill?.title}
                      </p>
                    </div>
                    {request.message && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">YOUR MESSAGE</h4>
                        <p className="text-sm">{request.message}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                      {request.status === "pending" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteRequest(request.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No outgoing requests</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't sent any skill swap requests yet.
                </p>
                <Button variant="gradient" asChild>
                  <Link to="/browse">Browse Skills</Link>
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Active Swaps */}
          <TabsContent value="active" className="space-y-4">
            {acceptedSwaps.length > 0 ? (
              acceptedSwaps.map((swap) => {
                const partner = swap.requester_id === user.id 
                  ? swap.provider_profile 
                  : swap.requester_profile;
                
                return (
                  <Card key={swap.id} className="shadow-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            {partner?.avatar_url ? (
                              <AvatarImage src={partner.avatar_url} />
                            ) : (
                              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                                {partner?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{partner?.full_name || 'Unknown User'}</CardTitle>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Star className="w-3 h-3 text-yellow-500 mr-1" />
                                <span>0.0</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(swap.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">SKILL SWAP</h4>
                        <p className="font-medium">
                          {swap.offered_skill?.title} for {swap.wanted_skill?.title}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          Started {new Date(swap.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                          <Button 
                            size="sm" 
                            variant="success"
                            onClick={() => handleCompleteSwap(swap.id)}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No active swaps</h3>
                <p className="text-muted-foreground mb-4">
                  When your requests are accepted, they'll appear here as active swaps.
                </p>
                <Button variant="gradient" asChild>
                  <Link to="/browse">Browse Skills</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Requests;