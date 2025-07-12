import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  ArrowLeft, 
  Star,
  MapPin,
  MessageSquare
} from "lucide-react";

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

const Rate = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const [skillRequest, setSkillRequest] = useState<SkillRequest | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !requestId) {
      navigate("/auth");
      return;
    }
    fetchSkillRequest();
  }, [user, requestId, navigate]);

  const fetchSkillRequest = async () => {
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

      // Check if user is part of this request
      if (requestData.requester_id !== user.id && requestData.provider_id !== user.id) {
        throw new Error("Unauthorized");
      }

      // Check if user has already rated
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('request_id', requestId)
        .eq('rater_id', user.id)
        .single();

      if (existingRating) {
        toast({
          title: "Already Rated",
          description: "You have already rated this swap.",
        });
        navigate("/network");
        return;
      }

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
    } catch (error) {
      console.error('Error fetching skill request:', error);
      toast({
        title: "Error",
        description: "Failed to load rating page.",
        variant: "destructive",
      });
      navigate("/network");
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!skillRequest || !user || rating === 0) return;

    setSubmitting(true);

    try {
      const partnerId = skillRequest.requester_id === user.id 
        ? skillRequest.provider_id 
        : skillRequest.requester_id;

      const { error } = await supabase
        .from('ratings')
        .insert({
          request_id: skillRequest.id,
          rater_id: user.id,
          rated_id: partnerId,
          rating,
          feedback: feedback.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Rating Submitted!",
        description: "Thank you for rating your learning partner.",
      });

      navigate("/network");
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Error",
        description: "Failed to submit rating.",
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

  if (!skillRequest) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Rating page not found.</p>
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
              <h1 className="text-xl font-semibold">Rate Your Learning Partner</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-center">How was your skill swap experience?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Partner Info */}
            <div className="flex items-center justify-center space-x-4 p-4 bg-muted/30 rounded-lg">
              <Avatar className="w-16 h-16">
                {skillRequest.partner_profile?.avatar_url ? (
                  <AvatarImage src={skillRequest.partner_profile.avatar_url} alt={skillRequest.partner_profile.full_name} />
                ) : (
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                    {skillRequest.partner_profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{skillRequest.partner_profile?.full_name}</h3>
                {skillRequest.partner_profile?.location && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {skillRequest.partner_profile.location}
                  </div>
                )}
              </div>
            </div>

            {/* Skill Exchange Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {isRequester ? "YOU TAUGHT" : "THEY TAUGHT"}
                </h4>
                <Badge variant="secondary" className="bg-success/10 text-success-foreground border-success/20">
                  {skillRequest.offered_skill?.title}
                </Badge>
              </div>
              <div className="text-center">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {isRequester ? "YOU LEARNED" : "THEY LEARNED"}
                </h4>
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                  {skillRequest.wanted_skill?.title}
                </Badge>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="text-center">
              <h4 className="font-medium mb-4">Rate your experience (1-5 stars)</h4>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-colors hover:scale-110 transform transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div>
              <h4 className="font-medium mb-2">Feedback (optional)</h4>
              <Textarea
                placeholder="Share your thoughts about the skill swap experience..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center space-x-4">
              <Button variant="outline" asChild>
                <Link to="/network">Skip for Now</Link>
              </Button>
              <Button 
                onClick={submitRating}
                disabled={rating === 0 || submitting}
                className="min-w-[120px]"
              >
                {submitting ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rate;