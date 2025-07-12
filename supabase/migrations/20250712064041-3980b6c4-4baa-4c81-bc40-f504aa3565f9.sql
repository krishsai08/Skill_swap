-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for skill categories
CREATE TYPE public.skill_category AS ENUM ('technology', 'language', 'music', 'art', 'cooking', 'sports', 'business', 'other');

-- Create enum for availability
CREATE TYPE public.availability_type AS ENUM ('weekdays', 'weekends', 'evenings', 'mornings', 'flexible');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  availability availability_type[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create skills table
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category skill_category NOT NULL,
  is_offering BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skill_requests table
CREATE TABLE public.skill_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  wanted_skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  message TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.skill_requests(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, rater_id)
);

-- Create admin_messages table
CREATE TABLE public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1),
    'user'::app_role
  );
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (is_public = true OR auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "User roles are viewable by admins" 
ON public.user_roles FOR SELECT 
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles" 
ON public.user_roles FOR ALL 
USING (public.is_admin(auth.uid()));

-- RLS Policies for skills
CREATE POLICY "Approved skills are viewable by everyone" 
ON public.skills FOR SELECT 
USING (is_approved = true OR auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own skills" 
ON public.skills FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills" 
ON public.skills FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete their own skills" 
ON public.skills FOR DELETE 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- RLS Policies for skill_requests
CREATE POLICY "Users can view their own requests" 
ON public.skill_requests FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = provider_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create requests" 
ON public.skill_requests FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own requests" 
ON public.skill_requests FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = provider_id OR public.is_admin(auth.uid()));

-- RLS Policies for ratings
CREATE POLICY "Users can view ratings for their requests" 
ON public.ratings FOR SELECT 
USING (auth.uid() = rater_id OR auth.uid() = rated_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create ratings for completed requests" 
ON public.ratings FOR INSERT 
WITH CHECK (auth.uid() = rater_id);

-- RLS Policies for admin_messages
CREATE POLICY "Admin messages are viewable by everyone" 
ON public.admin_messages FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage messages" 
ON public.admin_messages FOR ALL 
USING (public.is_admin(auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User')
  );
  
  -- Check if user signed up as admin
  IF NEW.raw_user_meta_data ->> 'role' = 'admin' THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;
  
  -- Assign role based on signup selection
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skill_requests_updated_at
  BEFORE UPDATE ON public.skill_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();