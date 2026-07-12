// Configuração do placar global (Supabase).
// Estes dois valores são PÚBLICOS e seguros de expor no front-end.
// Enquanto estiverem vazios, o jogo usa o placar local (localStorage).
//
// Para ativar o ranking GLOBAL:
//   1. Crie um projeto grátis em https://supabase.com
//   2. Rode o SQL de setup (ver README/instruções) no SQL Editor
//   3. Cole aqui a URL do projeto e a anon public key
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''

// Nome da tabela criada no Supabase.
export const SCORES_TABLE = 'scores'

export const hasGlobalLeaderboard = () =>
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY)
