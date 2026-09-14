import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './supabase';

interface Profile {
  nickname: string | null;
}
type AuthStatus = 'loading' | 'unconfigured' | 'signed-out' | 'signed-in';
interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  adminChecked: boolean;
  signUp: (email: string, password: string, nickname: string) => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

const accountUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}#/account`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(supabaseConfigured ? 'loading' : 'unconfigured');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(!supabaseConfigured);

  const loadPrivateAccountData = useCallback(async (nextSession: Session | null) => {
    if (!supabase || !nextSession) { setProfile(null); setIsAdmin(false); setAdminChecked(true); return; }
    const [{ data: profileData }, { data: adminData }] = await Promise.all([
      supabase.from('profiles').select('nickname').eq('id', nextSession.user.id).maybeSingle(),
      supabase.rpc('is_admin'),
    ]);
    setProfile(profileData ? { nickname: profileData.nickname as string | null } : null);
    setIsAdmin(adminData === true);
    setAdminChecked(true);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session) {
        const { data: verified, error } = await client.auth.getUser();
        if (error || !verified.user) await client.auth.signOut({ scope: 'local' });
        else data.session.user = verified.user;
      }
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? 'signed-in' : 'signed-out');
      setAdminChecked(!data.session);
      await loadPrivateAccountData(data.session);
    }).catch(() => { if (active) setStatus('signed-out'); });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? 'signed-in' : 'signed-out');
      setAdminChecked(!nextSession);
      queueMicrotask(() => { void loadPrivateAccountData(nextSession); });
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadPrivateAccountData]);

  async function signUp(email: string, password: string, nickname: string) {
    if (!supabase) throw new Error('Account service is not configured.');
    const { data, error } = await supabase.auth.signUp({ email, password, options: {
      emailRedirectTo: accountUrl(), data: nickname.trim() ? { nickname: nickname.trim() } : {},
    } });
    if (error) throw error;
    return data.session ? 'Your account is ready and you are signed in.' : 'Check your email to confirm your account, then sign in.';
  }
  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('Account service is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  async function sendPasswordReset(email: string) {
    if (!supabase) throw new Error('Account service is not configured.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: accountUrl() });
    if (error) throw error;
  }
  async function updatePassword(password: string) {
    if (!supabase) throw new Error('Account service is not configured.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }
  async function updateNickname(nickname: string) {
    if (!supabase || !session) throw new Error('Sign in first.');
    const value = nickname.trim() || null;
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, nickname: value }, { onConflict: 'id' });
    if (error) throw error;
    setProfile({ nickname: value });
  }
  return <AuthContext.Provider value={{ status, user: session?.user ?? null, profile, isAdmin, adminChecked,
    signUp, signIn, signOut, sendPasswordReset, updatePassword, updateNickname }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required.');
  return value;
}
