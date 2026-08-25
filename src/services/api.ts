import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { log, logAlerta } from '../lib/debug';
import type { OrderSummary, Product, SessionState } from '../types';

const SESSION_KEY = 'atelier-noir:session';

/**
 * Identificador da sessão. É a única coisa que o navegador guarda — carrinho e
 * peças desbloqueadas vivem no servidor. Vai em `x-session-id` a cada chamada.
 */
export function getSessionId(): string {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return 'sessao-volatil-' + Math.random().toString(36).slice(2);
  }
}

/**
 * Em desenvolvimento o Vite encaminha /api para a API (veja vite.config.ts),
 * então o front chama a própria origem e não há CORS no navegador.
 * VITE_API_URL sobrescreve isso para apontar a um servidor remoto.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

interface Timed extends InternalAxiosRequestConfig {
  startedAt?: number;
}

api.interceptors.request.use((config: Timed) => {
  config.headers.set('x-session-id', getSessionId());
  config.startedAt = performance.now();
  log('api', `→ ${config.method?.toUpperCase()} ${config.url}`, config.data ?? undefined);
  return config;
});

api.interceptors.response.use(
  (response) => {
    const started = (response.config as Timed).startedAt;
    const ms = started ? Math.round(performance.now() - started) : undefined;
    log('api', `← ${response.status} ${response.config.url}${ms !== undefined ? ` (${ms}ms)` : ''}`, response.data);
    return response;
  },
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const status = error.response?.status ?? 'sem resposta';
    logAlerta('api', `× ${status} ${error.config?.url}`, error.response?.data ?? error.message);
    return Promise.reject(error);
  },
);

const API_FORA_DO_AR =
  'Não foi possível falar com a API. Ela está rodando? Use "npm run dev" para subir front e back juntos.';

/** Traduz qualquer falha em uma frase que dá para mostrar na tela. */
export function apiMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Falha inesperada.';

  // Erro da nossa API: ela sempre responde { code, message }.
  const fromServer = (error.response?.data as { message?: string } | undefined)?.message;
  if (fromServer) return fromServer;

  if (error.code === 'ECONNABORTED') return 'A API demorou demais para responder.';
  if (error.code === 'ERR_NETWORK' || !error.response) return API_FORA_DO_AR;

  // Sem corpo no formato da API e 5xx: quase sempre é o proxy do Vite
  // respondendo por um servidor que não está de pé.
  if (error.response.status >= 500) return `${API_FORA_DO_AR} (resposta ${error.response.status})`;

  return `${error.response.status} — ${error.message}`;
}

/** Código de erro devolvido pela API, quando houver (ex.: PRODUCT_LOCKED). */
export function apiCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { code?: string } | undefined)?.code ?? null;
  }
  return null;
}

// ------------------------------------------------------------------ rotas

export const AtelierApi = {
  products: () => api.get<Product[]>('/products').then((r) => r.data),

  session: () => api.get<SessionState>('/session').then((r) => r.data),

  /** Registra o minigame vencido. O servidor confere o resultado. */
  unlock: (productId: string, moves: number, seconds: number) =>
    api.post<SessionState>('/session/unlock', { productId, moves, seconds }).then((r) => r.data),

  /** Devolve 409 PRODUCT_LOCKED se a peça não passou pelo minigame. */
  addToCart: (productId: string, quantity = 1) =>
    api.post<SessionState>('/cart', { productId, quantity }).then((r) => r.data),

  setQuantity: (productId: string, quantity: number) =>
    api.patch<SessionState>(`/cart/${productId}`, { quantity }).then((r) => r.data),

  removeFromCart: (productId: string) => api.delete<SessionState>(`/cart/${productId}`).then((r) => r.data),

  checkout: () =>
    api.post<{ order: OrderSummary; session: SessionState }>('/orders').then((r) => r.data),
};
