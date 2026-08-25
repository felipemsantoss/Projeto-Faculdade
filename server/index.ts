import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { PRODUCTS, getProductById } from '../src/data/products';
import { getSession, saveSession, type CartRow, type Session } from './db';

const PORT = Number(process.env.API_PORT ?? 3333);
const MAX_QUANTITY = 9;
/** Um jogo perfeito resolve 8 pares em 8 jogadas — menos que isso é impossível. */
const MIN_MOVES_TO_UNLOCK = 8;

const app = express();
app.use(cors());
app.use(express.json());

/** Log de acesso: toda requisição aparece no terminal da API. */
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString().slice(11, 19)}  ${req.method.padEnd(6)} ${req.originalUrl}`);
  next();
});

/**
 * Identificação da sessão. O cliente manda `x-session-id`; se não mandar,
 * o servidor emite um e devolve no cabeçalho da resposta.
 */
function sessionFrom(req: Request, res: Response): Session {
  const header = req.header('x-session-id');
  const id = header && header.length >= 8 ? header : randomUUID();
  res.setHeader('x-session-id', id);
  return getSession(id);
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Monta a resposta pública da sessão: linhas do carrinho já com o produto. */
function serialize(session: Session) {
  const lines = session.cart
    .map((row) => {
      const product = getProductById(row.productId);
      return product ? { product, quantity: row.quantity } : null;
    })
    .filter((line): line is { product: (typeof PRODUCTS)[number]; quantity: number } => line !== null);

  const subtotal = lines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const count = lines.reduce((total, line) => total + line.quantity, 0);

  return {
    sessionId: session.id,
    unlocked: session.unlocked,
    lines,
    subtotal,
    count,
    orders: session.orders,
  };
}

function requireProduct(productId: unknown) {
  if (typeof productId !== 'string' || productId.length === 0) {
    throw new ApiError(400, 'INVALID_PRODUCT_ID', 'productId é obrigatório.');
  }
  const product = getProductById(productId);
  if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', `Peça "${productId}" não existe no catálogo.`);
  return product;
}

function normalizeQuantity(value: unknown, fallback = 1): number {
  const quantity = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) {
    throw new ApiError(400, 'INVALID_QUANTITY', 'quantity precisa ser um número inteiro.');
  }
  if (quantity < 0 || quantity > MAX_QUANTITY) {
    throw new ApiError(400, 'INVALID_QUANTITY', `quantity precisa estar entre 0 e ${MAX_QUANTITY}.`);
  }
  return quantity;
}

// ---------------------------------------------------------------- rotas

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()), products: PRODUCTS.length });
});

app.get('/api/products', (_req, res) => {
  res.json(PRODUCTS);
});

app.get('/api/session', (req, res) => {
  res.json(serialize(sessionFrom(req, res)));
});

/**
 * Recomeço da vitrine: toda peça volta a ficar lacrada.
 *
 * O front chama isto ao carregar a página — recarregar significa jogar de
 * novo. O carrinho e o histórico de pedidos continuam intactos: só o direito
 * de comprar é que expira.
 */
app.post('/api/session/relock', (req, res) => {
  const session = sessionFrom(req, res);
  const antes = session.unlocked.length;
  session.unlocked = [];
  saveSession(session);

  if (antes > 0) console.log(`  ↳ vitrine relacrada (${antes} peça(s) voltaram a ficar bloqueadas)`);
  res.json(serialize(session));
});

/**
 * Registro do minigame vencido. É aqui que a peça deixa de estar lacrada —
 * e o servidor confere o resultado antes de aceitar.
 */
app.post('/api/session/unlock', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.body?.productId);
  const moves = Number(req.body?.moves ?? 0);
  const seconds = Number(req.body?.seconds ?? 0);

  if (!Number.isFinite(moves) || moves < MIN_MOVES_TO_UNLOCK) {
    throw new ApiError(
      422,
      'INVALID_RESULT',
      `Resultado inválido: ${moves} jogadas é menos que o mínimo possível (${MIN_MOVES_TO_UNLOCK}).`,
    );
  }

  if (!session.unlocked.includes(product.id)) {
    session.unlocked.push(product.id);
    saveSession(session);
  }

  console.log(`  ↳ peça "${product.id}" desbloqueada (${moves} jogadas, ${seconds}s)`);
  res.status(201).json(serialize(session));
});

/**
 * Adicionar ao carrinho. A regra do produto é validada no servidor: peça
 * lacrada é recusada com 409, mesmo que a interface deixe o botão passar.
 */
app.post('/api/cart', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.body?.productId);
  const quantity = normalizeQuantity(req.body?.quantity, 1);

  if (!session.unlocked.includes(product.id)) {
    throw new ApiError(
      409,
      'PRODUCT_LOCKED',
      `A peça "${product.name}" ainda está lacrada. Vença o desafio de memória para liberá-la.`,
    );
  }

  const existing = session.cart.find((row) => row.productId === product.id);
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY);
  else session.cart.push({ productId: product.id, quantity: Math.min(quantity, MAX_QUANTITY) });

  saveSession(session);
  res.status(201).json(serialize(session));
});

app.patch('/api/cart/:productId', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.params.productId);
  const quantity = normalizeQuantity(req.body?.quantity);

  if (quantity === 0) {
    session.cart = session.cart.filter((row) => row.productId !== product.id);
  } else {
    const existing = session.cart.find((row) => row.productId === product.id);
    if (!existing) throw new ApiError(404, 'NOT_IN_CART', 'Essa peça não está no carrinho.');
    existing.quantity = quantity;
  }

  saveSession(session);
  res.json(serialize(session));
});

app.delete('/api/cart/:productId', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.params.productId);
  session.cart = session.cart.filter((row) => row.productId !== product.id);
  saveSession(session);
  res.json(serialize(session));
});

app.post('/api/orders', (req, res) => {
  const session = sessionFrom(req, res);
  if (session.cart.length === 0) throw new ApiError(422, 'EMPTY_CART', 'O carrinho está vazio.');

  const items: CartRow[] = session.cart.map((row) => ({ ...row }));
  const total = items.reduce((sum, row) => sum + (getProductById(row.productId)?.price ?? 0) * row.quantity, 0);

  const order = { id: `AN-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), items, total };
  session.orders.unshift(order);
  session.cart = [];
  saveSession(session);

  console.log(`  ↳ pedido ${order.id} fechado (total ${total})`);
  res.status(201).json({ order, session: serialize(session) });
});

// ---------------------------------------------------------------- erros

app.use((_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Rota inexistente.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }
  console.error('[api] erro inesperado:', error);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Falha inesperada no servidor.' });
});

app.listen(PORT, () => {
  console.log(`\n  ATELIER NOIR — API REST em http://localhost:${PORT}/api`);
  console.log(`  Saúde: http://localhost:${PORT}/api/health\n`);
});
