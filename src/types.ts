export type GlyphName =
  | 'arc'
  | 'grid'
  | 'helix'
  | 'vector'
  | 'ring'
  | 'shard'
  | 'wave'
  | 'node'
  | 'cross'
  | 'lens'
  | 'stack'
  | 'pulse'
  | 'orbit'
  | 'prism';

export type ArtworkVariant = 'monolith' | 'bloom' | 'solstice' | 'orbit' | 'aperture' | 'halo';

export interface Product {
  id: string;
  /** Índice editorial exibido na interface, ex.: "01". */
  index: string;
  name: string;
  category: string;
  price: number;
  /** Frase curta, usada em destaque no palco do produto. */
  tagline: string;
  description: string;
  material: string;
  edition: string;
  /** Cor de acento do produto — dirige o tema da experiência inteira. */
  accent: string;
  /** Tom profundo usado nos fundos gerados. */
  accentDeep: string;
  artwork: ArtworkVariant;
  /** Os 8 símbolos que formam os pares do desafio deste produto. */
  glyphs: GlyphName[];
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

/** Fases da experiência — uma máquina de estados linear e previsível. */
export type Phase = 'catalog' | 'stage' | 'game' | 'unlocked';

export type CardState = 'hidden' | 'revealed' | 'matched';

export interface MemoryCard {
  /** Identificador único da carta (duas cartas por par). */
  id: string;
  /** Identificador do par — duas cartas com o mesmo pairId combinam. */
  pairId: number;
  glyph: GlyphName;
  state: CardState;
}
