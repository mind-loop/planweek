import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * True when the visitor is signed in (on this device) as someone listed in
 * `admin_emails`. Members never sign in, so for them this stays false.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const check = async () => {
      const { data: session } = await supabase!.auth.getSession();
      if (!session.session) return alive && setIsAdmin(false);
      const { data, error } = await supabase!.rpc('my_admin_role');
      if (alive) setIsAdmin(!error && !!data);
    };
    void check();
    const { data } = supabase.auth.onAuthStateChange(() => void check());
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
