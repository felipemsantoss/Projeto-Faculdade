import { PRODUCTS, getProductById } from '../data/products';
import { COPOS, TOTAL_RODADAS, planejarRodada } from '../lib/shellRules';
import { log } from '../lib/debug';
import type { ChallengeState, OrderSummary, PickResult, Product, SessionState } from '../types';

/**
 * Modo demonstração: a mesma API, respondida pelo próprio navegador.
 *
 * Existe para a versão publicada no GitHub Pages, que serve só arquivos
 * estáticos e portanto não roda o Express. O contrato é idêntico ao da API
 * real — mesmas funções, mesmos formatos, mesmos códigos de erro — e as
 * regras do jogo vêm de `lib/shellRules`, o mesmo módulo que o servidor usa.
 * Assim o jogo não tem duas implementações que possam divergir.
 *
 * A diferença honesta: aqui quem confere a escolha é o navegador. Numa
 * instalação com a API no ar, o servidor volta a ser a autoridade, e o
 * `finalIndex` nunca chega ao cliente antes da hora.
 */

const STORAGE_KEY = 'atelier-noir:demo';
const MAX_QUANTITY = 9;
/** A demonstração responde com uma pequena espera, como uma rede real. */
const LATENCIA_MS = 90;

interface DesafioLocal {
  status: 'playing' | 'won' | 'lost';
  round: number;
  startIndex: number;
  trocas: Array<[number, number]>;
  swapMs: number;
  finalIndex: number;
}

interface EstadoLocal {
  unlocked: string[];
  challenges: Record<string, DesafioLocal>;
  cart: Array<{ productId: string; quantity: number }>;
  orders: OrderSummary[];
}

const vazio = (): EstadoLocal => ({ unlocked: [], challenges: {}, cart: [], orders: [] });

function ler(): EstadoLocal {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    if (!bruto) return vazio();
    return { ...vazio(), ...(JSON.parse(bruto) as EstadoLocal) };
  } catch {
    return vazio();
  }
}

let estado: EstadoLocal = ler();

function gravar() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {
    /* sem armazenamento: a sessão atual continua válida */
  }
}

/** Mesma classe de erro da API: código e mensagem, para a UI tratar igual. */
class DemoError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Simula a viagem até um servidor, para a interface se comportar igual. */
const responder = <T>(valor: T): Promise<T> =>
  new Promise((resolve) => window.setTimeout(() => resolve(valor), LATENCIA_MS));

const exigirProduto = (productId: string): Product => {
  const product = getProductById(productId);
  if (!product) throw new DemoError('PRODUCT_NOT_FOUND', `Peça "${productId}" não existe no catálogo.`);
  return product;
};

function montarSessao(): SessionState {
  const lines = estado.cart
    .map(({ productId, quantity }) => {
      const product = getProductById(productId);
      return product ? { product, quantity } : null;
    })
    .filter((line): line is { product: Product; quantity: number } => line !== null);

  return {
    sessionId: 'demonstracao',
    unlocked: estado.unlocked,
    lines,
    subtotal: lines.reduce((total, l) => total + l.product.price * l.quantity, 0),
    count: lines.reduce((total, l) => total + l.quantity, 0),
    orders: estado.orders,
  };
}

function montarDesafio(productId: string, desafio: DesafioLocal): ChallengeState {
  return {
    productId,
    cups: COPOS,
    round: desafio.round,
    totalRounds: TOTAL_RODADAS,
    startIndex: desafio.startIndex,
    trocas: desafio.trocas,
    swapMs: desafio.swapMs,
    status: desafio.status,
  };
}

function novoDesafio(productId: string, round = 1): DesafioLocal {
  const plano = planejarRodada(round);
  const desafio: DesafioLocal = {
    status: 'playing',
    round: plano.round,
    startIndex: plano.startIndex,
    trocas: plano.trocas,
    swapMs: plano.swapMs,
    finalIndex: plano.finalIndex,
  };
  estado.challenges[productId] = desafio;
  return desafio;
}

export const DemoApi = {
  products: () => responder(PRODUCTS),

  session: () => responder(montarSessao()),

  /** Recarregar relacra tudo, exatamente como na API. */
  relock: () => {
    estado.unlocked = [];
    estado.challenges = {};
    gravar();
    log('api', 'modo demonstração: vitrine relacrada');
    return responder(montarSessao());
  },

  challenge: (productId: string) => {
    exigirProduto(productId);
    const desafio = estado.challenges[productId] ?? novoDesafio(productId);
    gravar();
    return responder(montarDesafio(productId, desafio));
  },

  resetChallenge: (productId: string) => {
    exigirProduto(productId);
    delete estado.challenges[productId];
    const desafio = novoDesafio(productId);
    gravar();
    return responder(montarDesafio(productId, desafio));
  },

  pick: (productId: string, index: number): Promise<PickResult & { session: SessionState }> => {
    const product = exigirProduto(productId);
    const desafio = estado.challenges[productId];

    if (!desafio) throw new DemoError('NO_CHALLENGE', 'Nenhum desafio aberto para esta peça.');
    if (desafio.status !== 'playing') {
      throw new DemoError('CHALLENGE_OVER', 'Esta rodada já terminou. Comece outra.');
    }
    if (!Number.isInteger(index) || index < 0 || index >= COPOS) {
      throw new DemoError('INVALID_PICK', `Escolha um copo entre 0 e ${COPOS - 1}.`);
    }

    const ballIndex = desafio.finalIndex;
    const acertou = index === ballIndex;

    if (!acertou) {
      desafio.status = 'lost';
      gravar();
      return responder({
        correct: false,
        ballIndex,
        challenge: montarDesafio(productId, desafio),
        session: montarSessao(),
      });
    }

    if (desafio.round >= TOTAL_RODADAS) {
      desafio.status = 'won';
      if (!estado.unlocked.includes(product.id)) estado.unlocked.push(product.id);
      gravar();
      return responder({
        correct: true,
        ballIndex,
        challenge: montarDesafio(productId, desafio),
        session: montarSessao(),
      });
    }

    const proxima = novoDesafio(productId, desafio.round + 1);
    gravar();
    return responder({
      correct: true,
      ballIndex,
      challenge: montarDesafio(productId, proxima),
      session: montarSessao(),
    });
  },

  addToCart: (productId: string, quantity = 1) => {
    const product = exigirProduto(productId);

    // A mesma regra da API: peça lacrada não entra na sacola.
    if (!estado.unlocked.includes(product.id)) {
      throw new DemoError(
        'PRODUCT_LOCKED',
        `A peça "${product.name}" ainda está lacrada. Siga a bolinha entre os copos para liberá-la.`,
      );
    }

    const existente = estado.cart.find((linha) => linha.productId === product.id);
    if (existente) existente.quantity = Math.min(existente.quantity + quantity, MAX_QUANTITY);
    else estado.cart.push({ productId: product.id, quantity: Math.min(quantity, MAX_QUANTITY) });

    gravar();
    return responder(montarSessao());
  },

  setQuantity: (productId: string, quantity: number) => {
    exigirProduto(productId);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
      throw new DemoError('INVALID_QUANTITY', `quantity precisa estar entre 0 e ${MAX_QUANTITY}.`);
    }

    if (quantity === 0) {
      estado.cart = estado.cart.filter((linha) => linha.productId !== productId);
    } else {
      const linha = estado.cart.find((item) => item.productId === productId);
      if (!linha) throw new DemoError('NOT_IN_CART', 'Essa peça não está no carrinho.');
      linha.quantity = quantity;
    }

    gravar();
    return responder(montarSessao());
  },

  removeFromCart: (productId: string) => {
    exigirProduto(productId);
    estado.cart = estado.cart.filter((linha) => linha.productId !== productId);
    gravar();
    return responder(montarSessao());
  },

  checkout: () => {
    if (estado.cart.length === 0) throw new DemoError('EMPTY_CART', 'O carrinho está vazio.');

    const items = estado.cart.map((linha) => ({ ...linha }));
    const total = items.reduce(
      (soma, linha) => soma + (getProductById(linha.productId)?.price ?? 0) * linha.quantity,
      0,
    );

    const order: OrderSummary = {
      id: `AN-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      items,
      total,
    };

    estado.orders.unshift(order);
    estado.cart = [];
    gravar();

    return responder({ order, session: montarSessao() });
  },
};
