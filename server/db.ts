import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

export interface CartRow {
  productId: string;
  quantity: number;
}

export interface OrderRow {
  id: string;
  createdAt: string;
  items: CartRow[];
  total: number;
}

export type ChallengeStatus = 'playing' | 'won' | 'lost';

export interface ChallengeRow {
  status: ChallengeStatus;
  /** Rodada atual, de 1 até o total. */
  round: number;
  /** Posição em que a bolinha entrou nesta rodada. */
  startIndex: number;
  /** O plano de trocas que o cliente vai animar. */
  trocas: Array<[number, number]>;
  /** Duração de cada troca, em milissegundos. */
  swapMs: number;
  /** Onde a bolinha parou — a verdade do servidor, conferida na escolha. */
  finalIndex: number;
}

export interface Session {
  id: string;
  createdAt: string;
  /** Peças cujo desafio já foi vencido. */
  unlocked: string[];
  /** Um desafio dos três copos por produto. */
  challenges: Record<string, ChallengeRow>;
  cart: CartRow[];
  orders: OrderRow[];
}

interface Database {
  sessions: Record<string, Session>;
}

const empty: Database = { sessions: {} };

/**
 * Persistência em arquivo. Não é um banco de verdade, mas é estado de servidor
 * de verdade: sobrevive a reinícios e é a única fonte da verdade do carrinho.
 * Trocar isto por Postgres significa reescrever só este arquivo.
 */
function read(): Database {
  try {
    if (!existsSync(DB_FILE)) return structuredClone(empty);
    const parsed = JSON.parse(readFileSync(DB_FILE, 'utf8')) as Database;
    return parsed && typeof parsed === 'object' && parsed.sessions ? parsed : structuredClone(empty);
  } catch {
    return structuredClone(empty);
  }
}

let db: Database = read();

function persist(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('[db] falha ao gravar:', error);
  }
}

export function getSession(id: string): Session {
  const existing = db.sessions[id];
  if (existing) {
    // Sessões gravadas por versões anteriores não têm o campo de desafios.
    if (!existing.challenges) existing.challenges = {};
    return existing;
  }

  const created: Session = {
    id,
    createdAt: new Date().toISOString(),
    unlocked: [],
    challenges: {},
    cart: [],
    orders: [],
  };
  db.sessions[id] = created;
  persist();
  return created;
}

export function saveSession(session: Session): Session {
  db.sessions[session.id] = session;
  persist();
  return session;
}

export function resetAll(): void {
  db = structuredClone(empty);
  persist();
}
