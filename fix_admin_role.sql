-- Fix the handle_new_user function to properly handle admin roles
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