import {useState, useEffect} from 'react';
import {createClient}        from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPA_BASE_URL;
const supabaseApiKey = import.meta.env.VITE_SUPA_LAB_API_KEY;
const supabase = createClient(supabaseUrl, supabaseApiKey);

type SessionRec    = unknown;
type SetSessionFunc  = (session:SessionRec)=>void;

export const useSession = (): [SessionRec, SetSessionFunc] =>
{
  const [session, setSession] = useState<SessionRec>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);
  return [session, setSession];
}

export const signout = () => supabase.auth.signOut();

type AuthProviders = 'google' | 'facebook' | 'twitter' | 'linkedin';
export const providers:AuthProviders[] = [/*'google', 'facebook', 'twitter', 'linkedin'*/] ;
