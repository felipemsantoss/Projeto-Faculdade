export type ArtworkVariant = 'monolith' | 'bloom' | 'solstice' | 'orbit' | 'aperture' | 'halo';

export interface Product {
  id: string;
  /** Índice editorial exibido na interface, ex.: "01". */
  index: string;
  name: string;
  category: string;
  price: number;
  /** Frase curta, usada em destaque na revelação do produto. */
  tagline: string;
  description: string;
  material: string;
  edition: string;
  /** Cor de acento do produto — dirige o tema da experiência inteira. */
  accent: string;
  /** Tom profundo usado nos fundos gerados. */
  accentDeep: string;
  artwork: ArtworkVariant;
}

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface OrderSummary {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
}

/**
 * Retrato completo da sessão, do jeito que a API devolve. Toda mutação de
 * carrinho ou desbloqueio responde com este objeto — o cliente nunca calcula
 * subtotal nem decide o que está liberado.
 */
export interface SessionState {
  sessionId: string;
  unlocked: string[];
  lines: CartLine[];
  subtotal: number;
  count: number;
  orders: OrderSummary[];
}

/**
 * Uma rodada do jogo dos três copos, como a API devolve.
 *
 * O plano de trocas vem junto porque é ele que o cliente precisa para animar
 * o embaralhamento. Onde a bolinha parou, não — isso fica no servidor até a
 * escolha ser feita.
 */
export interface ChallengeState {
  productId: string;
  /** Quantos copos há na mesa. */
  cups: number;
  round: number;
  totalRounds: number;
  /** Posição em que a bolinha entrou, antes das trocas. */
  startIndex: number;
  /** Cada par são duas posições que trocam de lugar. */
  trocas: Array<[number, number]>;
  /** Duração de cada troca, em milissegundos. */
  swapMs: number;
  status: 'playing' | 'won' | 'lost';
}

export interface PickResult {
  correct: boolean;
  /** Onde a bolinha realmente estava — revelado só depois da escolha. */
  ballIndex: number;
  /** A rodada seguinte, ou a mesma já encerrada. */
  challenge: ChallengeState;
}

/** Fases da experiência — o clique no produto vai direto ao desafio. */
export type Phase = 'catalog' | 'game' | 'unlocked';
