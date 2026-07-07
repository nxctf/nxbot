export interface Connection {
  id: string;
  name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_login_email: string | null;
  supabase_login_password: string | null;
  supabase_turnstile_site_key: string | null;
  supabase_access_token?: string | null;
  supabase_refresh_token?: string | null;
  created_at: string;
}
