import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, 
  MapPin, 
  Plus, 
  X,
  Save,
  ArrowLeft,
  Upload,
  Camera
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
  is_public: boolean;
  availability?: Array<'weekdays' | 'weekends' | 'evenings' | 'mornings' | 'flexible'>;
}

interface Skill {
  id: string;
  title: string;
  description?: string;
  category: string;
  is_offering: boolean;
}

const SKILL_CATEGORIES = [
  'technology',
  'language', 
  'music',
  'art',
  'cooking',
  'sports',
  'business',
  'other'
];

const AVAILABILITY_OPTIONS = [
  'weekdays',
  'weekends', 
  'evenings',
  'mornings',
  'flexible'
];

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState({ title: '', description: '', category: '', is_offering: true });
  const [showAddSkill, setShowAddSkill] = useState(false);

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
      } else {
        // Create default profile if none exists
        const defaultProfile = {
          user_id: user.id,
          full_name: user.email?.split('@')[0] || 'New User',
          is_public: true
        };
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([defaultProfile])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
        } else {
          setProfile(newProfile);
        }
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
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: data.publicUrl });

      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addSkill = async () => {
    if (!user || !newSkill.title || !newSkill.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('skills')
        .insert({
          user_id: user.id,
          title: newSkill.title,
          description: newSkill.description,
          category: newSkill.category as 'technology' | 'language' | 'music' | 'art' | 'cooking' | 'sports' | 'business' | 'other',
          is_offering: newSkill.is_offering
        })
        .select()
        .single();

      if (error) throw error;

      setSkills(prev => [...prev, data]);
      setNewSkill({ title: '', description: '', category: '', is_offering: true });
      setShowAddSkill(false);
      
      toast({
        title: "Skill Added",
        description: "Your skill has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding skill:', error);
      toast({
        title: "Error",
        description: "Failed to add skill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeSkill = async (skillId: string) => {
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      setSkills(prev => prev.filter(skill => skill.id !== skillId));
      
      toast({
        title: "Skill Removed",
        description: "Your skill has been removed successfully.",
      });
    } catch (error) {
      console.error('Error removing skill:', error);
      toast({
        title: "Error",
        description: "Failed to remove skill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAvailabilityChange = (option: string, checked: boolean) => {
    if (!profile) return;
    
    const currentAvailability = profile.availability || [];
    const typedOption = option as 'weekdays' | 'weekends' | 'evenings' | 'mornings' | 'flexible';
    let newAvailability;
    
    if (checked) {
      newAvailability = [...currentAvailability, typedOption];
    } else {
      newAvailability = currentAvailability.filter(item => item !== typedOption);
    }
    
    updateProfile({ availability: newAvailability });
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
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
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold">Edit Profile</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Profile Picture & Basic Information */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Update your basic profile information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <Avatar className="w-24 h-24">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  ) : (
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                      {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Change Picture"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile?.full_name || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    onBlur={() => profile && updateProfile({ full_name: profile.full_name })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., San Francisco, CA"
                    value={profile?.location || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                    onBlur={() => profile && updateProfile({ location: profile.location })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell others about yourself and your interests..."
                  value={profile?.bio || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                  onBlur={() => profile && updateProfile({ bio: profile.bio })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={profile?.is_public || false}
                  onCheckedChange={(checked) => updateProfile({ is_public: checked })}
                />
                <Label htmlFor="isPublic">Make profile public</Label>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>
                When are you available for skill swaps?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={profile?.availability?.includes(option as any) || false}
                      onCheckedChange={(checked) => handleAvailabilityChange(option, checked as boolean)}
                    />
                    <Label htmlFor={option} className="capitalize">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>My Skills</CardTitle>
              <CardDescription>
                Manage the skills you offer and want to learn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Skills Offered */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">SKILLS I CAN TEACH</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skillsOffered.map((skill) => (
                    <Badge 
                      key={skill.id} 
                      variant="secondary" 
                      className="bg-success/10 text-success-foreground border-success/20 flex items-center gap-1"
                    >
                      {skill.title}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSkill(skill.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Skills Wanted */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">SKILLS I WANT TO LEARN</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {skillsWanted.map((skill) => (
                    <Badge 
                      key={skill.id} 
                      variant="outline" 
                      className="border-primary/20 text-primary flex items-center gap-1"
                    >
                      {skill.title}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSkill(skill.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Add New Skill */}
              {!showAddSkill ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddSkill(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Skill
                </Button>
              ) : (
                <Card className="p-4 border-dashed">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="skillTitle">Skill Title</Label>
                        <Input
                          id="skillTitle"
                          placeholder="e.g., React Development"
                          value={newSkill.title}
                          onChange={(e) => setNewSkill(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="skillCategory">Category</Label>
                        <Select 
                          value={newSkill.category} 
                          onValueChange={(value) => setNewSkill(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skillDescription">Description (Optional)</Label>
                      <Textarea
                        id="skillDescription"
                        placeholder="Describe your skill or what you want to learn..."
                        value={newSkill.description}
                        onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isOffering"
                        checked={newSkill.is_offering}
                        onCheckedChange={(checked) => setNewSkill(prev => ({ ...prev, is_offering: checked }))}
                      />
                      <Label htmlFor="isOffering">
                        {newSkill.is_offering ? "I can teach this skill" : "I want to learn this skill"}
                      </Label>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={addSkill} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        Add Skill
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowAddSkill(false);
                          setNewSkill({ title: '', description: '', category: '', is_offering: true });
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;