import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  MessageSquare, 
  Star, 
  ArrowRight, 
  CheckCircle,
  Zap,
  Globe,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin, userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    console.log('Index useEffect - user:', user?.id, 'userRole:', userRole, 'authLoading:', authLoading, 'isAdmin:', isAdmin);
    
    if (user && !authLoading && userRole) {
      console.log('User authenticated, role determined:', userRole);
      if (userRole === 'admin') {
        console.log('Redirecting admin user to /admin');
        navigate("/admin");
      } else if (userRole === 'user') {
        console.log('Redirecting regular user to /dashboard');
        navigate("/dashboard");
      } else {
        console.log('Unknown role:', userRole, 'defaulting to dashboard');
        navigate("/dashboard");
      }
    } else if (user && !authLoading && !userRole) {
      console.log('User authenticated but no role determined yet - waiting for role fetch');
    } else if (!user && !authLoading) {
      console.log('No user authenticated');
    }
  }, [user, userRole, authLoading, navigate, isAdmin]);

  // Temporary debug function
  const debugSetAdminRole = () => {
    if (user) {
      console.log('Debug: Setting admin role for user:', user.id);
      localStorage.setItem(`cached_role_${user.id}`, 'admin');
      localStorage.setItem(`admin_role_${user.id}`, 'admin');
      // Force a role update in the database
      supabase
        .from('user_roles')
        .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) {
            console.error('Error setting admin role:', error);
          } else {
            console.log('Admin role set in database');
          }
          window.location.reload();
        });
    }
  };

  // Debug function to clear role cache
  const debugClearRoleCache = () => {
    if (user) {
      console.log('Debug: Clearing role cache for user:', user.id);
      localStorage.removeItem(`cached_role_${user.id}`);
      localStorage.removeItem(`admin_role_${user.id}`);
      window.location.reload();
    }
  };

  // Debug function to check user metadata
  const debugCheckMetadata = () => {
    if (user) {
      console.log('Debug: User metadata:', user.user_metadata);
      console.log('Debug: User role from metadata:', user.user_metadata?.role);
      alert(`User metadata: ${JSON.stringify(user.user_metadata, null, 2)}`);
    }
  };

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    if (user && !authLoading && !userRole) {
      const timeout = setTimeout(() => {
        console.log('Role fetch timeout, defaulting to user');
        // Force redirect to dashboard if role fetch takes too long
        navigate("/dashboard");
      }, 8000); // 8 second timeout (increased from 3 seconds)

      return () => clearTimeout(timeout);
    }
  }, [user, authLoading, userRole, navigate]);

  // Only show loading spinner when actually loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg font-semibold">Loading your account...</div>
        </div>
      </div>
    );
  }

  // Show role determination message only when user is logged in but role is being fetched
  if (user && !authLoading && !userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg font-semibold">Determining your role...</div>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: <Users className="w-8 h-8" />,
      title: "Connect & Learn",
      description: "Connect with skilled individuals and exchange knowledge in a collaborative environment."
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "Discover Skills",
      description: "Browse through hundreds of skills offered by our community members worldwide."
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Easy Communication",
      description: "Send requests, accept offers, and communicate seamlessly with other users."
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Rating System",
      description: "Build trust through our comprehensive rating and feedback system."
    }
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "25K+", label: "Skills Exchanged" },
    { number: "150+", label: "Skill Categories" },
    { number: "4.8", label: "Average Rating" }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      skill: "Photography ↔ Web Design",
      content: "Found an amazing photographer who taught me advanced techniques in exchange for web design lessons. Perfect platform!",
      rating: 5
    },
    {
      name: "Mike Chen", 
      skill: "Python ↔ Guitar",
      content: "Never thought I could learn Python so easily! The skill swap approach made learning engaging and fun.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      skill: "Marketing ↔ Language",
      content: "Improved my Spanish while helping someone with digital marketing. Win-win situation for both of us!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                SkillSwap
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="gradient" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
              {/* Temporary debug buttons */}
              {user && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={debugSetAdminRole}
                    title="Debug: Set admin role"
                  >
                    Debug Admin
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={debugClearRoleCache}
                    title="Debug: Clear role cache"
                  >
                    Clear Cache
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={debugCheckMetadata}
                    title="Debug: Check user metadata"
                  >
                    Check Metadata
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Exchange Skills,
              <span className="bg-gradient-primary bg-clip-text text-transparent block">
                Expand Horizons
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Join thousands of learners and experts who swap skills in our collaborative platform. 
              Teach what you know, learn what you want.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="hero" className="text-lg px-8 py-4" asChild>
                <Link to="/auth">
                  Start Swapping Skills
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-4" asChild>
                <Link to="/browse">
                  Browse Skills
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.number}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose SkillSwap?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform makes skill exchange simple, secure, and rewarding for everyone involved.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-card text-center hover:shadow-glow transition-all duration-300">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Start swapping skills in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 text-primary-foreground text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Create Your Profile</h3>
              <p className="text-muted-foreground">
                List the skills you can teach and what you'd like to learn. Set your availability and preferences.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 text-primary-foreground text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Find & Connect</h3>
              <p className="text-muted-foreground">
                Browse skills, find the perfect match, and send swap requests to other users in the community.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 text-primary-foreground text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Learn & Teach</h3>
              <p className="text-muted-foreground">
                Exchange knowledge, complete sessions, and rate your experience to help others in the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Success Stories
            </h2>
            <p className="text-xl text-muted-foreground">
              Hear from our community members about their skill swap experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="shadow-card">
                <CardHeader>
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit">
                    {testimonial.skill}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Start Your Skill Journey?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Join our community today and discover the joy of collaborative learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4" asChild>
              <Link to="/auth">
                <CheckCircle className="w-5 h-5 mr-2" />
                Create Free Account
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  SkillSwap
                </span>
              </div>
              <p className="text-muted-foreground">
                The premier platform for skill exchange and collaborative learning.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/browse" className="hover:text-primary transition-colors">Browse Skills</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">Sign Up</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">Sign In</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Community</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Community Guidelines</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Success Stories</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © 2024 SkillSwap. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                <Shield className="w-3 h-3 mr-1" />
                Secure Platform
              </Badge>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Globe className="w-3 h-3 mr-1" />
                Global Community
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
