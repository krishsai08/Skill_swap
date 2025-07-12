-- Create messages table for chat functionality
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_request_id UUID NOT NULL REFERENCES public.skill_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view messages from their conversations" 
ON public.messages 
FOR SELECT 
USING (
  sender_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.skill_requests sr 
    WHERE sr.id = skill_request_id 
    AND (sr.requester_id = auth.uid() OR sr.provider_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.skill_requests sr 
    WHERE sr.id = skill_request_id 
    AND (sr.requester_id = auth.uid() OR sr.provider_id = auth.uid())
  )
);

-- Fix user_roles RLS policy to avoid circular dependency
DROP POLICY IF EXISTS "User roles are viewable by admins" ON public.user_roles;
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Add successful_swaps counter to profiles
ALTER TABLE public.profiles 
ADD COLUMN successful_swaps INTEGER NOT NULL DEFAULT 0;

-- Add average_rating to profiles
ALTER TABLE public.profiles 
ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.0;

-- Create function to update profile stats when a rating is added
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the rated user's average rating and successful swaps count
  UPDATE public.profiles 
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0.0) 
      FROM public.ratings 
      WHERE rated_id = NEW.rated_id
    ),
    successful_swaps = (
      SELECT COUNT(DISTINCT request_id) 
      FROM public.ratings 
      WHERE rated_id = NEW.rated_id
    )
  WHERE user_id = NEW.rated_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update profile stats
CREATE TRIGGER update_profile_stats_trigger
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats();

-- Create index for better performance
CREATE INDEX idx_messages_skill_request_id ON public.messages(skill_request_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_ratings_rated_id ON public.ratings(rated_id);