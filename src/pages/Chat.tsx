import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Send, 
  Star,
  MapPin,
  CheckCircle
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface SkillRequest {
  id: string;
  requester_id: string;
  provider_id: string;
  status: string;
  offered_skill: { title: string } | null;
  wanted_skill: { title: string } | null;
  partner_profile: {
    full_name: string;
    avatar_url?: string;
    location?: string;
  } | null;
}

const Chat = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [skillRequest, setSkillRequest] = useState<SkillRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !requestId) {
      navigate("/auth");
      return;
    }
    fetchChatData();
    subscribeToMessages();
  }, [user, requestId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatData = async () => {
    if (!user || !requestId) return;

    try {
      // Fetch skill request details
      const { data: requestData, error: requestError } = await supabase
        .from('skill_requests')
        .select(`
          *,
          offered_skill:skills!offered_skill_id(title),
          wanted_skill:skills!wanted_skill_id(title)
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Determine partner ID
      const partnerId = requestData.requester_id === user.id 
        ? requestData.provider_id 
        : requestData.requester_id;

      // Fetch partner profile
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, location')
        .eq('user_id', partnerId)
        .single();

      setSkillRequest({
        ...requestData,
        partner_profile: partnerProfile
      });

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('skill_request_id', requestId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error fetching chat data:', error);
      toast({
        title: "Error",
        description: "Failed to load chat.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!requestId) return;

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `skill_request_id=eq.${requestId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !requestId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          skill_request_id: requestId,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteSwap = async () => {
    if (!skillRequest) return;

    try {
      const { error } = await supabase
        .from('skill_requests')
        .update({ status: 'completed' })
        .eq('id', skillRequest.id);

      if (error) throw error;

      toast({
        title: "Swap Completed!",
        description: "Time to rate your learning partner.",
      });
      
      navigate(`/rate/${skillRequest.id}`);
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
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!skillRequest) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Chat not found.</p>
          <Button className="mt-4" asChild>
            <Link to="/network">Back to Network</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isRequester = skillRequest.requester_id === user.id;

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/network">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Network
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  {skillRequest.partner_profile?.avatar_url ? (
                    <AvatarImage src={skillRequest.partner_profile.avatar_url} alt={skillRequest.partner_profile.full_name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {skillRequest.partner_profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h1 className="font-semibold">{skillRequest.partner_profile?.full_name}</h1>
                  {skillRequest.partner_profile?.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mr-1" />
                      {skillRequest.partner_profile.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-success/10 text-success-foreground border-success/20">
                {skillRequest.status}
              </Badge>
              {skillRequest.status === 'accepted' && (
                <Button size="sm" variant="success" onClick={handleCompleteSwap}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Complete Swap
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Skill Exchange Info */}
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Skill Exchange</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {isRequester ? "YOU TEACH" : "THEY TEACH"}
                </h4>
                <Badge variant="secondary" className="bg-success/10 text-success-foreground border-success/20">
                  {skillRequest.offered_skill?.title}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {isRequester ? "YOU LEARN" : "THEY LEARN"}
                </h4>
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                  {skillRequest.wanted_skill?.title}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-y-auto mb-4 p-4 bg-muted/30 rounded-lg">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_id === user.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card border shadow-sm'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex space-x-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;