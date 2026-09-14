import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { LearningState } from './types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigured = Boolean(url && publishableKey);
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, publishableKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  })
  : null;

export interface RemoteProgress {
  state: LearningState;
  updatedAt: string;
}

export async function readRemoteProgress(userId: string): Promise<RemoteProgress | null> {
  if (!supabase) throw new Error('Account service is not configured.');
  const { data, error } = await supabase.from('learning_records').select('state, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { state: data.state as LearningState, updatedAt: data.updated_at as string };
}

export async function writeRemoteProgress(userId: string, state: LearningState): Promise<string> {
  if (!supabase) throw new Error('Account service is not configured.');
  const { data, error } = await supabase.from('learning_records').upsert({ user_id: userId, state }, { onConflict: 'user_id' })
    .select('updated_at').single();
  if (error) throw error;
  return data.updated_at as string;
}
