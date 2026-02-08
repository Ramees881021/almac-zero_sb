import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Master account ID - used for copying default data
const MASTER_ACCOUNT_ID = '8fcfb509-05cc-4635-879b-85b06ebb5951';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, companyName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to copy master account data to new user
  const copyMasterDataToUser = async (userId: string) => {
    try {
      // Get master account data
      const { data: masterEmissions } = await supabase
        .from('emissions_data')
        .select('*')
        .eq('user_id', MASTER_ACCOUNT_ID);

      const { data: masterClients } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', MASTER_ACCOUNT_ID);

      const { data: masterNetzero } = await supabase
        .from('netzero_targets')
        .select('*')
        .eq('user_id', MASTER_ACCOUNT_ID);

      const { data: masterBudgets } = await supabase
        .from('carbon_budgets')
        .select('*')
        .eq('user_id', MASTER_ACCOUNT_ID);

      const { data: masterCredentials } = await supabase
        .from('sustainability_credentials')
        .select('*')
        .eq('user_id', MASTER_ACCOUNT_ID);

      // Copy data to new user
      if (masterEmissions && masterEmissions.length > 0) {
        const userEmissions = masterEmissions.map(({ id, user_id, organization_id, ...rest }) => ({
          ...rest,
          user_id: userId,
        }));
        await supabase.from('emissions_data').insert(userEmissions);
      }

      if (masterClients && masterClients.length > 0) {
        const userClients = masterClients.map(({ id, user_id, organization_id, ...rest }) => ({
          ...rest,
          user_id: userId,
        }));
        await supabase.from('clients').insert(userClients);
      }

      if (masterNetzero && masterNetzero.length > 0) {
        const userNetzero = masterNetzero.map(({ id, user_id, organization_id, ...rest }) => ({
          ...rest,
          user_id: userId,
        }));
        await supabase.from('netzero_targets').insert(userNetzero);
      }

      if (masterBudgets && masterBudgets.length > 0) {
        const userBudgets = masterBudgets.map(({ id, user_id, organization_id, ...rest }) => ({
          ...rest,
          user_id: userId,
        }));
        await supabase.from('carbon_budgets').insert(userBudgets);
      }

      if (masterCredentials && masterCredentials.length > 0) {
        const userCredentials = masterCredentials.map(({ id, user_id, organization_id, ...rest }) => ({
          ...rest,
          user_id: userId,
        }));
        await supabase.from('sustainability_credentials').insert(userCredentials);
      }

      console.log('Master data copied to new user:', userId);
    } catch (err) {
      console.error('Error copying master data:', err);
    }
  };

  const signUp = async (email: string, password: string, companyName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      // Create profile and copy master data after signup
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: data.user.id,
          company_name: companyName,
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        // Add default user role
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: 'user',
        });

        // Copy master account data to new user
        await copyMasterDataToUser(data.user.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Use full page redirect for reliable session clearing
    window.location.href = '/';
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
