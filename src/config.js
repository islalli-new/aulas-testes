// Configuração do placar global (Supabase).
// Estes dois valores são PÚBLICOS e seguros de expor no front-end.
// (A chave abaixo é a "publishable" — feita pra rodar no navegador.
//  A segurança está nas policies de RLS do banco, não em esconder a chave.)
export const SUPABASE_URL = 'https://spyzasmvfutwsrmakbgs.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_B1UlKi9HOrYCGC_Oo_5FYA_9w7s9fh-'

// Nome da tabela criada no Supabase.
export const SCORES_TABLE = 'scores'

export const hasGlobalLeaderboard = () =>
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY)
