import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  MessageSquare, 
  Filter,
  ArrowLeft,
  Users,
  Calendar
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  availability?: string[];
  skillsOffered: Array<{ id: string; title: string; category: string; description?: string }>;
  skillsWanted: Array<{ id: string; title: string; category: string; description?: string }>;
}

const Browse = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    if (!user) return;

    try {
      // Fetch all public profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_public', true)
        .neq('user_id', user.id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Fetch skills for each profile
      const profilesWithSkills = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: skillsData } = await supabase
            .from('skills')
            .select('*')
            .eq('user_id', profile.user_id)
            .eq('is_approved', true);

          return {
            ...profile,
            skills: skillsData || []
          };
        })
      );

      // Transform the data
      const transformedUsers = profilesWithSkills.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        location: profile.location,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        is_public: profile.is_public,
        availability: profile.availability,
        skillsOffered: Array.isArray(profile.skills) 
          ? profile.skills
              .filter((skill: any) => skill.is_offering)
              .map((skill: any) => ({
                id: skill.id,
                title: skill.title,
                category: skill.category,
                description: skill.description
              }))
          : [],
        skillsWanted: Array.isArray(profile.skills)
          ? profile.skills
              .filter((skill: any) => !skill.is_offering)
              .map((skill: any) => ({
                id: skill.id,
                title: skill.title,
                category: skill.category,
                description: skill.description
              }))
          : []
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique categories for filter
  const allCategories = [...new Set(
    users.flatMap(user => [
      ...user.skillsOffered.map(skill => skill.category),
      ...user.skillsWanted.map(skill => skill.category)
    ])
  )];

  // Filter users based on search and category filter
  const filteredUsers = users.filter(u => {
    const matchesSearch = searchTerm === "" || 
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.skillsOffered.some(skill => skill.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      u.skillsWanted.some(skill => skill.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || 
      u.skillsOffered.some(skill => skill.category === selectedCategory) || 
      u.skillsWanted.some(skill => skill.category === selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  const handleSendRequest = (targetUser: UserProfile) => {
    navigate(`/request/${targetUser.id}`);
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
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
              <h1 className="text-xl font-semibold">Browse Skills</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {filteredUsers.length} users found
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((targetUser) => (
              <Card key={targetUser.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        {targetUser.avatar_url ? (
                          <AvatarImage src={targetUser.avatar_url} alt={targetUser.full_name} />
                        ) : (
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                            {targetUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{targetUser.full_name}</CardTitle>
                        {targetUser.location && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" />
                            {targetUser.location}
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
                  {/* Bio */}
                  {targetUser.bio && (
                    <p className="text-sm text-muted-foreground">{targetUser.bio}</p>
                  )}

                  {/* Skills Offered */}
                  {targetUser.skillsOffered.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">OFFERS</h4>
                      <div className="flex flex-wrap gap-1">
                         {targetUser.skillsOffered.slice(0, 3).map((skill) => (
                           <Badge key={skill.id} variant="secondary" className="text-xs bg-success/20 text-success hover:bg-success/30 border-success/30">
                             {skill.title}
                           </Badge>
                         ))}
                         {targetUser.skillsOffered.length > 3 && (
                           <Badge variant="secondary" className="text-xs bg-muted text-foreground">
                             +{targetUser.skillsOffered.length - 3} more
                           </Badge>
                         )}
                      </div>
                    </div>
                  )}

                  {/* Skills Wanted */}
                  {targetUser.skillsWanted.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">WANTS</h4>
                      <div className="flex flex-wrap gap-1">
                         {targetUser.skillsWanted.slice(0, 3).map((skill) => (
                           <Badge key={skill.id} variant="outline" className="text-xs border-primary/40 text-primary bg-primary/10 hover:bg-primary/20">
                             {skill.title}
                           </Badge>
                         ))}
                         {targetUser.skillsWanted.length > 3 && (
                           <Badge variant="outline" className="text-xs border-border text-foreground">
                             +{targetUser.skillsWanted.length - 3} more
                           </Badge>
                         )}
                      </div>
                    </div>
                  )}

                  {/* Availability */}
                  {targetUser.availability && targetUser.availability.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">AVAILABILITY</h4>
                      <div className="flex flex-wrap gap-1">
                        {targetUser.availability.slice(0, 2).map((time, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-accent">
                            <Calendar className="w-3 h-3 mr-1" />
                            {time}
                          </Badge>
                        ))}
                        {targetUser.availability.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{targetUser.availability.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    variant="gradient"
                    onClick={() => handleSendRequest(targetUser)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Request
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters to find more users.
            </p>
            <Button variant="outline" onClick={() => {setSearchTerm(""); setSelectedCategory("all");}}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;