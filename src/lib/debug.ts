/**
 * Rastreamento da experiência.
 *
 * Todo evento relevante do fluxo — troca de fase, clique de botão, carta
 * virada, item somado à sacola — passa por aqui e vira uma linha colorida no
 * console, com o tempo desde o carregamento da página. A ideia é conseguir
 * ler a jornada inteira de cima para baixo e ver exatamente onde ela parou.
 *
 * No console do navegador:
 *   atelierDebug.historico()  → tabela com tudo que aconteceu
 *   atelierDebug.off()        → silencia
 *   atelierDebug.on()         → religa (inclusive em produção)
 */

const STORAGE_KEY = 'atelier-noir:debug';
const HISTORY_LIMIT = 300;

const CHANNELS = {
  api: { label: 'API', color: '#5eead4' },
  fase: { label: 'FASE', color: '#a78bfa' },
  catalogo: { label: 'CATÁLOGO', color: '#5eead4' },
  produto: { label: 'PRODUTO', color: '#93c5fd' },
  jogo: { label: 'JOGO', color: '#bef264' },
  carrinho: { label: 'CARRINHO', color: '#fbbf24' },
  animacao: { label: 'ANIMAÇÃO', color: '#c4b5fd' },
  ui: { label: 'UI', color: '#e5e7eb' },
  alerta: { label: 'ALERTA', color: '#fb7185' },
} as const;

export type Channel = keyof typeof CHANNELS;

interface Entry {
  ms: number;
  canal: string;
  evento: string;
  dados?: unknown;
}

const history: Entry[] = [];
const startedAt = typeof performance !== 'undefined' ? performance.now() : 0;

const elapsed = () => Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - startedAt);

function isEnabled(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* sem localStorage: cai no padrão */
  }
  return import.meta.env.DEV;
}

function record(canal: Channel, evento: string, dados?: unknown): Entry {
  const entry: Entry = { ms: elapsed(), canal: CHANNELS[canal].label, evento, dados };
  history.push(entry);
  if (history.length > HISTORY_LIMIT) history.shift();
  return entry;
}

function format(canal: Channel, entry: Entry): [string, string, string] {
  const { label, color } = CHANNELS[canal];
  return [
    `%c${label}%c ${String(entry.ms).padStart(6)}ms  ${entry.evento}`,
    `background:${color};color:#08080c;font-weight:700;padding:2px 7px;border-radius:4px;font-size:10px`,
    'color:inherit;font-weight:400',
  ];
}

/** Um acontecimento normal do fluxo. */
export function log(canal: Channel, evento: string, dados?: unknown): void {
  const entry = record(canal, evento, dados);
  if (!isEnabled()) return;
  const args = format(canal, entry);
  if (dados === undefined) console.log(...args);
  else console.log(...args, dados);
}

/** Algo que impediu o fluxo de seguir. Sempre aparece, mesmo silenciado. */
export function logAlerta(canal: Channel, evento: string, dados?: unknown): void {
  const entry = record(canal, evento, dados);
  const args = format('alerta', { ...entry, evento: `${CHANNELS[canal].label} — ${evento}` });
  if (dados === undefined) console.warn(...args);
  else console.warn(...args, dados);
}

/** Abre um grupo recolhível — usado no percurso completo do "adicionar". */
export function logGrupo(canal: Channel, titulo: string): () => void {
  const entry = record(canal, `▼ ${titulo}`);
  if (!isEnabled()) return () => undefined;
  console.groupCollapsed(...format(canal, entry));
  return () => console.groupEnd();
}

declare global {
  interface Window {
    atelierDebug?: {
      on: () => void;
      off: () => void;
      historico: () => void;
      bruto: () => Entry[];
    };
  }
}

export function installDebugConsole(): void {
  window.atelierDebug = {
    on() {
      window.localStorage.setItem(STORAGE_KEY, '1');
      console.info('[atelier] rastreamento ligado.');
    },
    off() {
      window.localStorage.setItem(STORAGE_KEY, '0');
      console.info('[atelier] rastreamento silenciado. atelierDebug.on() para religar.');
    },
    historico() {
      console.table(history.map(({ ms, canal, evento, dados }) => ({ ms, canal, evento, dados })));
    },
    bruto: () => history.slice(),
  };

  if (isEnabled()) {
    console.info(
      '%cATELIER NOIR%c rastreamento ativo — atelierDebug.historico() mostra a trilha completa.',
      'background:#f4f2ee;color:#08080c;font-weight:700;padding:3px 8px;border-radius:4px',
      'color:inherit',
    );
  }
}
