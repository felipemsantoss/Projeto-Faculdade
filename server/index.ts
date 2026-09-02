import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { PRODUCTS, getProductById } from '../src/data/products';
import { getSession, saveSession, type CartRow, type ChallengeRow, type Session } from './db';
import { COPOS, TOTAL_RODADAS, planejarRodada } from '../src/lib/shellRules';

const PORT = Number(process.env.API_PORT ?? 3333);
const MAX_QUANTITY = 9;

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
 * Recomeço da vitrine: toda peça volta a ficar lacrada e os desafios em
 * andamento são descartados — na próxima partida a bolinha é sorteada de novo.
 *
 * O front chama isto ao carregar a página. O carrinho e o histórico de
 * pedidos continuam intactos: só o direito de comprar é que expira.
 */
app.post('/api/session/relock', (req, res) => {
  const session = sessionFrom(req, res);
  const antes = session.unlocked.length;
  session.unlocked = [];
  session.challenges = {};
  saveSession(session);

  if (antes > 0) console.log(`  ↳ vitrine relacrada (${antes} peça(s) voltaram a ficar bloqueadas)`);
  res.json(serialize(session));
});

// ---------------------------------------------- desafio dos três copos

function novoDesafio(session: Session, productId: string, round = 1): ChallengeRow {
  const plano = planejarRodada(round);
  const challenge: ChallengeRow = {
    status: 'playing',
    round: plano.round,
    startIndex: plano.startIndex,
    trocas: plano.trocas,
    swapMs: plano.swapMs,
    finalIndex: plano.finalIndex,
  };
  session.challenges[productId] = challenge;
  return challenge;
}

/**
 * Visão pública da rodada. O plano de trocas vai junto porque é ele que o
 * cliente precisa para *animar* o embaralhamento — mas `finalIndex` fica de
 * fora: quem confere a escolha é o servidor, com a própria simulação.
 */
function serializeChallenge(productId: string, challenge: ChallengeRow) {
  return {
    productId,
    cups: COPOS,
    round: challenge.round,
    totalRounds: TOTAL_RODADAS,
    startIndex: challenge.startIndex,
    trocas: challenge.trocas,
    swapMs: challenge.swapMs,
    status: challenge.status,
  };
}

/** Abre o desafio da peça (ou devolve a rodada que já estava em andamento). */
app.post('/api/challenge', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.body?.productId);

  const challenge = session.challenges[product.id] ?? novoDesafio(session, product.id);
  saveSession(session);
  res.json(serializeChallenge(product.id, challenge));
});

/** Recomeça da primeira rodada, com bolinha e trocas novas. */
app.post('/api/challenge/reset', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.body?.productId);

  delete session.challenges[product.id];
  const challenge = novoDesafio(session, product.id);
  saveSession(session);

  console.log(`  ↳ novo embaralhamento para "${product.id}"`);
  res.status(201).json(serializeChallenge(product.id, challenge));
});

/**
 * A escolha do jogador. Acertar a última rodada é o que libera a compra — o
 * desbloqueio nasce aqui, da posição que só o servidor calculou. O cliente
 * manda apenas o copo escolhido; não tem como afirmar que venceu.
 */
app.post('/api/challenge/pick', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.body?.productId);
  const challenge = session.challenges[product.id];

  if (!challenge) throw new ApiError(404, 'NO_CHALLENGE', 'Nenhum desafio aberto para esta peça.');
  if (challenge.status !== 'playing') {
    throw new ApiError(409, 'CHALLENGE_OVER', 'Esta rodada já terminou. Comece outra.');
  }

  const escolha = Number(req.body?.index);
  if (!Number.isInteger(escolha) || escolha < 0 || escolha >= COPOS) {
    throw new ApiError(400, 'INVALID_PICK', `Escolha um copo entre 0 e ${COPOS - 1}.`);
  }

  const acertou = escolha === challenge.finalIndex;
  const ballIndex = challenge.finalIndex;
  const rodadaVencida = challenge.round;

  if (!acertou) {
    challenge.status = 'lost';
    saveSession(session);
    console.log(`  ↳ "${product.id}" errou na rodada ${rodadaVencida} (bolinha em ${ballIndex})`);

    res.status(201).json({
      correct: false,
      ballIndex,
      challenge: serializeChallenge(product.id, challenge),
      session: serialize(session),
    });
    return;
  }

  // Acertou: ou avança de rodada, ou fecha o desafio e libera a peça.
  if (rodadaVencida >= TOTAL_RODADAS) {
    challenge.status = 'won';
    if (!session.unlocked.includes(product.id)) session.unlocked.push(product.id);
    saveSession(session);
    console.log(`  ↳ "${product.id}" desbloqueada após ${TOTAL_RODADAS} rodadas`);

    res.status(201).json({
      correct: true,
      ballIndex,
      challenge: serializeChallenge(product.id, challenge),
      session: serialize(session),
    });
    return;
  }

  const proxima = novoDesafio(session, product.id, rodadaVencida + 1);
  saveSession(session);
  console.log(`  ↳ "${product.id}" acertou a rodada ${rodadaVencida}; vai para a ${proxima.round}`);

  res.status(201).json({
    correct: true,
    ballIndex,
    challenge: serializeChallenge(product.id, proxima),
    session: serialize(session),
  });
});

app.post('/api/cart', (req, res) => {
  const session = sessionFrom(req, res);
  const product = requireProduct(req.body?.productId);
  const quantity = normalizeQuantity(req.body?.quantity, 1);

  if (!session.unlocked.includes(product.id)) {
    throw new ApiError(
      409,
      'PRODUCT_LOCKED',
      `A peça "${product.name}" ainda está lacrada. Siga a bolinha entre os copos para liberá-la.`,
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

/**
 * Em servidor próprio (`npm run dev`) abrimos a porta. Na Vercel este mesmo
 * app é importado por `api/index.ts` como função serverless, e quem escuta é
 * a plataforma — por isso o listen fica condicionado.
 */
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  ATELIER NOIR — API REST em http://localhost:${PORT}/api`);
    console.log(`  Saúde: http://localhost:${PORT}/api/health\n`);
  });
}

export default app;
