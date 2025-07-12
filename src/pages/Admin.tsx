import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  MessageSquare, 
  Download,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  ArrowLeft,
  TrendingUp,
  Activity,
  UserX,
  FileText,
  Star,
  BarChart3,
  EyeOff
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalSkills: number;
  activeSwaps: number;
  completedSwaps: number;
  pendingRequests: number;
  newUsersThisWeek: number;
  averageRating: number;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  location?: string;
  is_banned: boolean;
  successful_swaps: number;
  average_rating: number;
  created_at: string;
}

interface Skill {
  id: string;
  title: string;
  description?: string;
  category: string;
  is_approved: boolean;
  is_offering: boolean;
  created_at: string;
  user_id: string;
  user_profile?: {
    full_name: string;
  } | null;
}

interface SkillRequest {
  id: string;
  status: string;
  created_at: string;
  requester_id: string;
  provider_id: string;
  offered_skill_id: string;
  wanted_skill_id: string;
  requester_profile?: {
    full_name: string;
  } | null;
  provider_profile?: {
    full_name: string;
  } | null;
  offered_skill?: {
    title: string;
  } | null;
  wanted_skill?: {
    title: string;
  } | null;
}

interface AdminMessage {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, userRole, fixAdminRole, clearRoleCache } = useAuth();

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSkills: 0,
    activeSwaps: 0,
    completedSwaps: 0,
    pendingRequests: 0,
    newUsersThisWeek: 0,
    averageRating: 0
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillRequests, setSkillRequests] = useState<SkillRequest[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newMessageTitle, setNewMessageTitle] = useState("");
  const [newMessageContent, setNewMessageContent] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    fetchAdminData();
  }, [user, isAdmin, navigate, toast]);

  const fetchAdminData = async () => {
    try {
      // Fetch stats
      const [profilesData, skillsData, requestsData] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('skills').select('*'),
        supabase.from('skill_requests').select('*')
      ]);

      if (profilesData.data) {
        setProfiles(profilesData.data);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const newUsersThisWeek = profilesData.data.filter(p => 
          new Date(p.created_at) > weekAgo
        ).length;

        const avgRating = profilesData.data.reduce((acc, p) => acc + (p.average_rating || 0), 0) / profilesData.data.length;

        setStats(prev => ({
          ...prev,
          totalUsers: profilesData.data.length,
          newUsersThisWeek,
          averageRating: avgRating
        }));
      }

      // Add user profile data to skills
      if (skillsData.data) {
        const skillsWithProfiles = await Promise.all(
          skillsData.data.map(async (skill) => {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', skill.user_id)
              .single();
            return { ...skill, user_profile: userProfile };
          })
        );
        setSkills(skillsWithProfiles);
        setStats(prev => ({
          ...prev,
          totalSkills: skillsData.data.length
        }));
      }

      if (requestsData.data) {
        // Enrich skill requests with profile and skill data
        const enrichedRequests = await Promise.all(
          requestsData.data.map(async (request) => {
            const [requesterProfile, providerProfile, offeredSkill, wantedSkill] = await Promise.all([
              supabase.from('profiles').select('full_name').eq('user_id', request.requester_id).single(),
              supabase.from('profiles').select('full_name').eq('user_id', request.provider_id).single(),
              supabase.from('skills').select('title').eq('id', request.offered_skill_id).single(),
              supabase.from('skills').select('title').eq('id', request.wanted_skill_id).single()
            ]);
            
            return {
              ...request,
              requester_profile: requesterProfile.data,
              provider_profile: providerProfile.data,
              offered_skill: offeredSkill.data,
              wanted_skill: wantedSkill.data
            };
          })
        );
        setSkillRequests(enrichedRequests);
        const activeSwaps = enrichedRequests.filter(r => r.status === 'accepted').length;
        const completedSwaps = enrichedRequests.filter(r => r.status === 'completed').length;
        const pendingRequests = enrichedRequests.filter(r => r.status === 'pending').length;

        setStats(prev => ({
          ...prev,
          activeSwaps,
          completedSwaps,
          pendingRequests
        }));
      }

      // Fetch admin messages
      const { data: messagesData } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (messagesData) {
        setAdminMessages(messagesData);
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User Banned",
        description: `${userName} has been banned from the platform.`,
        variant: "destructive",
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user.",
        variant: "destructive",
      });
    }
  };

  const handleUnbanUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "User Unbanned",
        description: `${userName} has been unbanned.`,
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: "Error",
        description: "Failed to unban user.",
        variant: "destructive",
      });
    }
  };

  const handleApproveSkill = async (skillId: string, skillTitle: string) => {
    try {
      const { error } = await supabase
        .from('skills')
        .update({ is_approved: true })
        .eq('id', skillId);

      if (error) throw error;

      toast({
        title: "Skill Approved",
        description: `"${skillTitle}" has been approved.`,
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error approving skill:', error);
      toast({
        title: "Error",
        description: "Failed to approve skill.",
        variant: "destructive",
      });
    }
  };

  const handleRejectSkill = async (skillId: string, skillTitle: string) => {
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      toast({
        title: "Skill Rejected",
        description: `"${skillTitle}" has been rejected and removed.`,
        variant: "destructive",
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error rejecting skill:', error);
      toast({
        title: "Error",
        description: "Failed to reject skill.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageTitle.trim() || !newMessageContent.trim() || !user) {
      toast({
        title: "Error",
        description: "Please fill in all message fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          admin_id: user.id,
          title: newMessageTitle.trim(),
          message: newMessageContent.trim(),
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Platform-wide message has been sent to all users.",
      });

      setNewMessageTitle("");
      setNewMessageContent("");
      fetchAdminData();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  };

  const handleToggleMessage = async (messageId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_messages')
        .update({ is_active: !isActive })
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: isActive ? "Message Deactivated" : "Message Activated",
        description: `Message has been ${isActive ? 'hidden from' : 'shown to'} users.`,
      });

      fetchAdminData();
    } catch (error) {
      console.error('Error toggling message:', error);
      toast({
        title: "Error",
        description: "Failed to toggle message.",
        variant: "destructive",
      });
    }
  };

  const downloadReport = (type: string) => {
    const generateCSV = (data: any[], filename: string) => {
      if (data.length === 0) return;
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    };

    switch (type) {
      case 'users':
        generateCSV(profiles.map(p => ({
          name: p.full_name,
          location: p.location || 'N/A',
          successful_swaps: p.successful_swaps,
          average_rating: p.average_rating,
          is_banned: p.is_banned,
          created_at: p.created_at
        })), 'users-report');
        break;
      case 'skills':
        generateCSV(skills.map(s => ({
          title: s.title,
          category: s.category,
          is_offering: s.is_offering,
          is_approved: s.is_approved,
          created_at: s.created_at
        })), 'skills-report');
        break;
      case 'swaps':
        generateCSV(skillRequests.map(sr => ({
          status: sr.status,
          created_at: sr.created_at
        })), 'swaps-report');
        break;
    }

    toast({
      title: "Download Started",
      description: `${type} report has been downloaded.`,
    });
  };

  if (!user || !isAdmin || loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const unapprovedSkills = skills.filter(s => !s.is_approved);
  const bannedUsers = profiles.filter(p => p.is_banned);

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
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold">Admin Panel</h1>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Administrator
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.newUsersThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Swaps</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSwaps}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedSwaps} completed total
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Platform average
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="skills" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="skills" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Skills</span>
              {unapprovedSkills.length > 0 && (
                <Badge variant="destructive" className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                  {unapprovedSkills.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Users</span>
              {bannedUsers.length > 0 && (
                <Badge variant="destructive" className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                  {bannedUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="swaps" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Swaps</span>
              {stats.pendingRequests > 0 && (
                                        <Badge variant="destructive" className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                  {stats.pendingRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Skills Management */}
          <TabsContent value="skills" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Skill Moderation</span>
                </CardTitle>
                <CardDescription>
                  Review and approve skill descriptions. Reject inappropriate or spammy content to maintain platform quality.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unapprovedSkills.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        {unapprovedSkills.length} skill{unapprovedSkills.length !== 1 ? 's' : ''} pending approval
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Bulk approve all skills
                          unapprovedSkills.forEach(skill => handleApproveSkill(skill.id, skill.title));
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve All
                      </Button>
                    </div>
                    {unapprovedSkills.map((skill) => (
                      <div key={skill.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">{skill.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              By {skill.user_profile?.full_name} • {skill.category}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {new Date(skill.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={skill.is_offering ? "secondary" : "outline"}>
                            {skill.is_offering ? "Offering" : "Seeking"}
                          </Badge>
                        </div>
                        {skill.description && (
                          <div className="mb-4">
                            <p className="text-sm font-medium mb-1">Description:</p>
                            <p className="text-sm bg-muted p-3 rounded-md">{skill.description}</p>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRejectSkill(skill.id, skill.title)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleApproveSkill(skill.id, skill.title)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="font-medium text-lg">All skills approved</h3>
                    <p className="text-muted-foreground">No pending skill approvals</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>
                  Monitor users and manage violations. Ban users who violate platform policies to maintain community standards.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {profiles.length} total users • {bannedUsers.length} banned users
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Users
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Swaps</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.slice(0, 10).map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              {profile.avatar_url ? (
                                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                              ) : (
                                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                                  {profile.full_name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">{profile.full_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Joined: {new Date(profile.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{profile.location || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">{profile.successful_swaps || 0}</span>
                            <span className="text-xs text-muted-foreground">swaps</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-500 mr-1" />
                            {profile.average_rating?.toFixed(1) || '0.0'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={profile.is_banned ? "destructive" : "secondary"}>
                            {profile.is_banned ? "Banned" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {profile.is_banned ? (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleUnbanUser(profile.user_id, profile.full_name)}
                                title="Unban user"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleBanUser(profile.user_id, profile.full_name)}
                                title="Ban user"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Swaps Monitoring */}
          <TabsContent value="swaps" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Swap Activity Monitoring</span>
                </CardTitle>
                <CardDescription>
                  Monitor pending, accepted, or cancelled swaps. Track platform activity and resolve disputes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{skillRequests.filter(r => r.status === 'pending').length}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{skillRequests.filter(r => r.status === 'accepted').length}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{skillRequests.filter(r => r.status === 'completed').length}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{skillRequests.filter(r => r.status === 'cancelled').length}</div>
                    <div className="text-sm text-muted-foreground">Cancelled</div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participants</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skillRequests.slice(0, 10).map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{request.requester_profile?.full_name}</p>
                            <p className="text-muted-foreground">↔ {request.provider_profile?.full_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{request.offered_skill?.title}</p>
                            <p className="text-muted-foreground">for {request.wanted_skill?.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'completed' ? 'secondary' :
                            request.status === 'accepted' ? 'default' :
                            request.status === 'pending' ? 'outline' : 'destructive'
                          }>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Messages */}
          <TabsContent value="messages" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Platform Messages</span>
                </CardTitle>
                <CardDescription>
                  Send platform-wide messages (e.g., feature updates, downtime alerts) to all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Title</label>
                  <Input
                    placeholder="Enter message title (e.g., 'New Feature Available')"
                    value={newMessageTitle}
                    onChange={(e) => setNewMessageTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Content</label>
                  <Textarea
                    placeholder="Enter your platform-wide message here. This will be visible to all users..."
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <Button onClick={handleSendMessage} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Platform Message
                </Button>

                {/* Existing Messages */}
                <div className="mt-6">
                  <h4 className="font-medium mb-4">Recent Messages</h4>
                  <div className="space-y-3">
                    {adminMessages.map((message) => (
                      <div key={message.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-medium">{message.title}</h5>
                          <div className="flex items-center space-x-2">
                            <Badge variant={message.is_active ? "secondary" : "outline"}>
                              {message.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleMessage(message.id, message.is_active)}
                              title={message.is_active ? "Hide message" : "Show message"}
                            >
                              {message.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{message.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Sent: {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Download */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Download Reports</span>
                </CardTitle>
                <CardDescription>
                  Generate and download reports of user activity, feedback logs, and swap stats.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => downloadReport('users')}
                    variant="outline"
                    className="h-20 flex-col"
                  >
                    <Users className="w-6 h-6 mb-2" />
                    User Activity Report
                    <span className="text-xs text-muted-foreground mt-1">
                      User profiles, ratings, activity
                    </span>
                  </Button>
                  <Button
                    onClick={() => downloadReport('skills')}
                    variant="outline"
                    className="h-20 flex-col"
                  >
                    <FileText className="w-6 h-6 mb-2" />
                    Skills Report
                    <span className="text-xs text-muted-foreground mt-1">
                      All skills, categories, approvals
                    </span>
                  </Button>
                  <Button
                    onClick={() => downloadReport('swaps')}
                    variant="outline"
                    className="h-20 flex-col"
                  >
                    <BarChart3 className="w-6 h-6 mb-2" />
                    Swap Statistics
                    <span className="text-xs text-muted-foreground mt-1">
                      Swap activity, status, metrics
                    </span>
                  </Button>
                </div>
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Report Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• User Activity Report: Complete user profiles, ratings, and activity logs</li>
                    <li>• Skills Report: All skills with categories, approval status, and descriptions</li>
                    <li>• Swap Statistics: Detailed swap activity, status tracking, and performance metrics</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Debug Section */}
        <Card className="mt-6 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Debug Information</span>
            </CardTitle>
            <CardDescription>
              Debug information for admin role issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Current User Info</h4>
                <div className="text-sm space-y-1">
                  <p><strong>User ID:</strong> {user?.id}</p>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Role:</strong> {userRole || 'Not set'}</p>
                  <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Admin Role Actions</h4>
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      if (user) {
                        fixAdminRole(user.id).then(success => {
                          toast({
                            title: success ? "Success" : "Failed",
                            description: success ? "Admin role fixed successfully" : "Failed to fix admin role",
                            variant: success ? "default" : "destructive"
                          });
                        });
                      }
                    }}
                  >
                    Fix Admin Role
                  </Button>
                                     <Button 
                     size="sm" 
                     onClick={() => {
                       if (user) {
                         clearRoleCache(user.id);
                         toast({
                           title: "Success",
                           description: "Role cache cleared successfully",
                           variant: "default"
                         });
                       }
                     }}
                   >
                     Clear Role Cache
                   </Button>
                  <p className="text-xs text-muted-foreground">
                    Use this button if you're having issues with admin access
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
