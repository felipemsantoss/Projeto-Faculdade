import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useToast } from '../shared/ui';
import { AtelierApi, apiCode, apiMessage } from '../services/api';
import { log, logAlerta } from '../lib/debug';
import type { OrderSummary, Product, SessionState } from '../types';

type Status = 'loading' | 'ready' | 'error';

interface SessionApi {
  /** Estado do carregamento inicial (catálogo + sessão). */
  status: Status;
  bootError: string | null;
  reload: () => void;

  products: Product[];

  unlocked: string[];
  isUnlocked: (productId: string) => boolean;

  lines: SessionState['lines'];
  count: number;
  subtotal: number;
  orders: OrderSummary[];

  /** Verdadeiro enquanto alguma chamada de mutação está em voo. */
  busy: boolean;
  /** Muda a cada item adicionado — dispara a reação visual do ícone. */
  pulse: number;

  isOpen: boolean;
  open: () => void;
  close: () => void;

  unlockProduct: (productId: string, moves: number, seconds: number) => Promise<boolean>;
  addToCart: (productId: string) => Promise<boolean>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  checkout: () => Promise<OrderSummary | null>;
}

const SessionContext = createContext<SessionApi | null>(null);

const EMPTY: SessionState = {
  sessionId: '',
  unlocked: [],
  lines: [],
  subtotal: 0,
  count: 0,
  orders: [],
};

/**
 * Todo o estado de negócio vem da API: catálogo, peças desbloqueadas e
 * carrinho. O navegador guarda apenas o identificador da sessão. Cada mutação
 * responde com o retrato inteiro da sessão, então não existe cálculo local de
 * subtotal nem palpite sobre o que está liberado.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { push } = useToast();

  const [status, setStatus] = useState<Status>('loading');
  const [bootError, setBootError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [session, setSession] = useState<SessionState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setStatus('loading');
    setBootError(null);
    log('api', 'carregando catálogo e sessão…');

    Promise.all([AtelierApi.products(), AtelierApi.session()])
      .then(([catalogo, sessao]) => {
        if (cancelled) return;
        setProducts(catalogo);
        setSession(sessao);
        setStatus('ready');
        log('api', 'aplicação pronta', {
          pecas: catalogo.length,
          desbloqueadas: sessao.unlocked,
          itensNoCarrinho: sessao.count,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = apiMessage(error);
        logAlerta('api', 'falha ao iniciar', message);
        setBootError(message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  /** Envelope comum das mutações: liga o "busy", trata erro e vira toast. */
  const mutate = useCallback(
    async <T,>(what: string, run: () => Promise<T>, apply: (result: T) => void): Promise<T | null> => {
      setBusy(true);
      try {
        const result = await run();
        apply(result);
        return result;
      } catch (error) {
        const message = apiMessage(error);
        logAlerta('api', `${what} falhou`, { codigo: apiCode(error), message });
        push(message, 'warn');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [push],
  );

  const unlockProduct = useCallback(
    async (productId: string, moves: number, seconds: number) => {
      const result = await mutate(
        'desbloqueio',
        () => AtelierApi.unlock(productId, moves, seconds),
        setSession,
      );
      return result !== null;
    },
    [mutate],
  );

  const addToCart = useCallback(
    async (productId: string) => {
      const result = await mutate('adicionar ao carrinho', () => AtelierApi.addToCart(productId), (next) => {
        setSession(next);
        setPulse((value) => value + 1);
      });
      return result !== null;
    },
    [mutate],
  );

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      await mutate('alterar quantidade', () => AtelierApi.setQuantity(productId, quantity), setSession);
    },
    [mutate],
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      await mutate('remover item', () => AtelierApi.removeFromCart(productId), setSession);
    },
    [mutate],
  );

  const checkout = useCallback(async () => {
    const result = await mutate('checkout', () => AtelierApi.checkout(), ({ session: next }) => setSession(next));
    return result?.order ?? null;
  }, [mutate]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<SessionApi>(
    () => ({
      status,
      bootError,
      reload,
      products,
      unlocked: session.unlocked,
      isUnlocked: (productId: string) => session.unlocked.includes(productId),
      lines: session.lines,
      count: session.count,
      subtotal: session.subtotal,
      orders: session.orders,
      busy,
      pulse,
      isOpen,
      open,
      close,
      unlockProduct,
      addToCart,
      setQuantity,
      removeFromCart,
      checkout,
    }),
    [
      status,
      bootError,
      reload,
      products,
      session,
      busy,
      pulse,
      isOpen,
      open,
      close,
      unlockProduct,
      addToCart,
      setQuantity,
      removeFromCart,
      checkout,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return context;
}
