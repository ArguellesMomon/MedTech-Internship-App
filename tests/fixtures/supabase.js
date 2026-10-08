// Only Vite's UI test configuration aliases this module into the app.
import { fixtureClient } from './workspace.js';
export const supabase = fixtureClient;
export const hasSupabaseCredentials = true;
export const isSupabaseConfigured = true;
