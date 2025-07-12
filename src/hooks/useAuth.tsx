import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  fixAdminRole: (userId: string) => Promise<boolean>;
  clearRoleCache: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to fetch user role with timeout
  const fetchUserRole = async (userId: string): Promise<string> => {
    return new Promise((resolve) => {
      console.log('Starting role fetch for user:', userId);
      
      const timeoutId = setTimeout(() => {
        console.log('Role fetch timeout after 8 seconds, defaulting to user');
        resolve('user');
      }, 8000); // Increased to 8 second timeout for role fetching

      const fetchRole = async () => {
        try {
          console.log('Attempting to fetch user role...');
          
          // First, check if there's an admin intent stored
          const adminIntent = localStorage.getItem(`admin_role_${userId}`);
          if (adminIntent === 'admin') {
            console.log('Found admin intent, checking if role was set...');
            
            // Try to get the actual role from database
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (roleData?.role === 'admin') {
              console.log('Admin role confirmed in database');
              localStorage.removeItem(`admin_role_${userId}`);
              clearTimeout(timeoutId);
              resolve('admin');
              return;
            } else if (roleError) {
              console.log('Error fetching role, trying to set admin role...');
              
              // Try to insert admin role
              const { error: insertError } = await supabase
                .from('user_roles')
                .insert([{ user_id: userId, role: 'admin' }]);
              
              if (!insertError) {
                console.log('Admin role set successfully');
                localStorage.removeItem(`admin_role_${userId}`);
                clearTimeout(timeoutId);
                resolve('admin');
                return;
              } else {
                console.log('Failed to set admin role:', insertError);
              }
            }
          }
          
          // Regular role fetching with retry logic
          let retryCount = 0;
          const maxRetries = 5; // Increased retries
          
          const attemptFetch = async (): Promise<string> => {
            try {
              console.log(`Attempting role fetch (attempt ${retryCount + 1}/${maxRetries})`);
              
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .maybeSingle();
              
              if (roleError) {
                console.log(`Role fetch error (attempt ${retryCount + 1}):`, roleError.message);
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`Retrying role fetch (${retryCount}/${maxRetries})...`);
                  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                  return await attemptFetch();
                }
                return 'user';
              } else if (roleData?.role) {
                console.log('User role fetched successfully:', roleData.role);
                return roleData.role;
              } else {
                console.log('No role found, defaulting to user');
                return 'user';
              }
            } catch (err) {
              console.log(`Exception in role fetch (attempt ${retryCount + 1}):`, err);
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying role fetch (${retryCount}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                return await attemptFetch();
              }
              return 'user';
            }
          };
          
          const role = await attemptFetch();
          clearTimeout(timeoutId);
          resolve(role);
        } catch (err) {
          console.log('Exception in role fetch, defaulting to user:', err);
          clearTimeout(timeoutId);
          resolve('user');
        }
      };

      fetchRole();
    });
  };

  useEffect(() => {
    // Safety timeout to ensure loading is set to false
    const safetyTimeout = setTimeout(() => {
      console.log('Safety timeout: setting loading to false');
      setLoading(false);
    }, 8000); // 8 second safety timeout

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('Session user found:', session.user.id);
          
          // Check if there's a cached role first
          const cachedRole = localStorage.getItem(`cached_role_${session.user.id}`);
          if (cachedRole) {
            console.log('Using cached role:', cachedRole);
            setUserRole(cachedRole);
            setLoading(false);
            clearTimeout(safetyTimeout);
            return;
          }
          
          // Check if this is a new user signup with admin role pending
          const adminIntent = localStorage.getItem(`admin_role_${session.user.id}`);
          
          if (adminIntent === 'admin') {
            console.log('Found admin intent, setting admin role...');
            // Try to update or insert admin role
            const { error: updateRoleError } = await supabase
              .from('user_roles')
              .upsert({ user_id: session.user.id, role: 'admin' }, { onConflict: 'user_id' });
            
            if (!updateRoleError) {
              console.log('Admin role set successfully');
              localStorage.removeItem(`admin_role_${session.user.id}`);
              localStorage.setItem(`cached_role_${session.user.id}`, 'admin');
              setUserRole('admin');
              setLoading(false);
              clearTimeout(safetyTimeout);
              return;
            } else {
              console.error('Error setting admin role:', updateRoleError);
              // Continue with regular role fetch
            }
          }
          
          // Also check if user metadata indicates admin role
          if (session.user.user_metadata?.role === 'admin') {
            console.log('User metadata indicates admin role, setting admin role...');
            const { error: updateRoleError } = await supabase
              .from('user_roles')
              .upsert({ user_id: session.user.id, role: 'admin' }, { onConflict: 'user_id' });
            
            if (!updateRoleError) {
              console.log('Admin role set from metadata successfully');
              localStorage.setItem(`cached_role_${session.user.id}`, 'admin');
              setUserRole('admin');
              setLoading(false);
              clearTimeout(safetyTimeout);
              return;
            } else {
              console.error('Error setting admin role from metadata:', updateRoleError);
            }
          }
          
          // Fetch user role with timeout
          console.log('Fetching user role...');
          const role = await fetchUserRole(session.user.id);
          console.log('Role fetched:', role);
          // Cache the role
          localStorage.setItem(`cached_role_${session.user.id}`, role);
          setUserRole(role);
        } else {
          console.log('No session, setting userRole to null');
          setUserRole(null);
        }
        
        console.log('Setting loading to false');
        setLoading(false);
        clearTimeout(safetyTimeout); // Clear the safety timeout since we're done
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      // If no session, we're done loading
      if (!session) {
        console.log('No initial session, setting loading to false');
        setLoading(false);
        clearTimeout(safetyTimeout); // Clear the safety timeout
      }
      // If there is a session, the onAuthStateChange will handle setting loading to false
    }).catch((error) => {
      console.error('Error getting initial session:', error);
      setLoading(false);
      clearTimeout(safetyTimeout); // Clear the safety timeout
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: string = 'user') => {
    const redirectUrl = `${window.location.origin}/`;
    
    console.log('Signing up user with role:', role);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    // Store the role for later use after email confirmation
    if (!error && data.user) {
      console.log('User created successfully:', data.user.id);
      
      if (role === 'admin') {
        console.log('Setting admin role for new user');
        // Store admin intent in localStorage temporarily
        localStorage.setItem(`admin_role_${data.user.id}`, 'admin');
        
        // Also try to set the role immediately in case the trigger doesn't work
        try {
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({ user_id: data.user.id, role: 'admin' }, { onConflict: 'user_id' });
          
          if (roleError) {
            console.error('Error setting admin role immediately:', roleError);
          } else {
            console.log('Admin role set immediately');
          }
        } catch (err) {
          console.error('Exception setting admin role:', err);
        }
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    // Clear role cache on sign out
    if (user) {
      localStorage.removeItem(`cached_role_${user.id}`);
      localStorage.removeItem(`admin_role_${user.id}`);
    }
    await supabase.auth.signOut();
  };

  // Function to clear role cache
  const clearRoleCache = (userId: string) => {
    localStorage.removeItem(`cached_role_${userId}`);
    localStorage.removeItem(`admin_role_${userId}`);
    console.log('Role cache cleared for user:', userId);
  };

  // Function to manually fix admin role for existing users
  const fixAdminRole = async (userId: string) => {
    try {
      console.log('Attempting to fix admin role for user:', userId);
      
      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingRole?.role === 'admin') {
        console.log('User already has admin role');
        localStorage.setItem(`cached_role_${userId}`, 'admin');
        setUserRole('admin');
        return true;
      }
      
      // Try to update or insert admin role
      const { error: updateError } = await supabase
        .from('user_roles')
        .upsert([{ user_id: userId, role: 'admin' }], { onConflict: 'user_id' });
      
      if (!updateError) {
        console.log('Admin role fixed successfully');
        localStorage.setItem(`cached_role_${userId}`, 'admin');
        setUserRole('admin');
        return true;
      } else {
        console.error('Failed to fix admin role:', updateError);
        return false;
      }
    } catch (err) {
      console.error('Exception fixing admin role:', err);
      return false;
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      isAdmin,
      loading,
      signUp,
      signIn,
      signOut,
      fixAdminRole,
      clearRoleCache
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};