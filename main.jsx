import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se as variáveis de ambiente não estiverem configuradas, o cliente ainda é
// criado (evita crash), mas toda chamada vai falhar — o App.jsx trata esse
// caso caindo automaticamente para o armazenamento local (localStorage).
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey);
