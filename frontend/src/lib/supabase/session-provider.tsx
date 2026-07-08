'use client';



import * as React from 'react';

import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { isMockAuthEnabled } from '@/lib/api/config';

import { createClient } from '@/lib/supabase/client';

import { bootstrapSupabaseSession } from '@/lib/supabase/wait-for-user';



export interface SupabaseSessionContextValue {

  session: Session | null;

  user: User | null;

  /** True after cookie-backed session bootstrap completes. */

  isReady: boolean;

}



const SupabaseSessionContext = React.createContext<SupabaseSessionContextValue | null>(null);



const SESSION_READY_EVENTS = new Set<AuthChangeEvent>([

  'INITIAL_SESSION',

  'SIGNED_IN',

  'TOKEN_REFRESHED',

]);



/**

 * Hydrates the browser Supabase session before consumers call authenticated APIs.

 */

export function SupabaseSessionProvider({

  children,

}: {

  children: React.ReactNode;

}): React.ReactElement {

  const [session, setSession] = React.useState<Session | null>(null);

  const [isReady, setIsReady] = React.useState(isMockAuthEnabled());



  React.useEffect(() => {

    if (isMockAuthEnabled()) {

      setIsReady(true);

      return;

    }



    const supabase = createClient();

    let cancelled = false;



    const applySession = (nextSession: Session | null): void => {

      if (!cancelled) {

        setSession(nextSession);

      }

    };



    const markReady = (): void => {

      if (!cancelled) {

        setIsReady(true);

      }

    };



    const {

      data: { subscription },

    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {

      if (cancelled) {

        return;

      }



      if (nextSession) {

        applySession(nextSession);

        if (SESSION_READY_EVENTS.has(event)) {

          markReady();

        }

        return;

      }



      if (event === 'INITIAL_SESSION') {

        const {

          data: { session: cookieSession },

        } = await supabase.auth.getSession();

        applySession(cookieSession);

        markReady();

        return;

      }



      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {

        markReady();

      }

    });



    void (async () => {

      try {

        const bootstrappedSession = await bootstrapSupabaseSession();

        if (!cancelled && bootstrappedSession) {

          applySession(bootstrappedSession);

          markReady();

        }

      } catch (bootstrapError) {

        console.error('[SupabaseSessionProvider] session bootstrap failed:', bootstrapError);

        markReady();

      }

    })();



    return () => {

      cancelled = true;

      subscription.unsubscribe();

    };

  }, []);



  const value = React.useMemo(

    (): SupabaseSessionContextValue => ({

      session,

      user: session?.user ?? null,

      isReady,

    }),

    [session, isReady],

  );



  return (

    <SupabaseSessionContext.Provider value={value}>{children}</SupabaseSessionContext.Provider>

  );

}



export function useSupabaseSession(): SupabaseSessionContextValue {

  const context = React.useContext(SupabaseSessionContext);

  if (!context) {

    throw new Error('useSupabaseSession must be used within SupabaseSessionProvider');

  }

  return context;

}


