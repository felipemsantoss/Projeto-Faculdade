import { MotionConfig } from 'framer-motion';
import { useCallback, useEffect, type ReactNode } from 'react';
import { CartDrawer, flyToCart } from './features/cart';
import { Carousel, Hero } from './features/catalog';
import { ShellGame } from './features/minigame';
import { UnlockReveal } from './features/unlock';
import { Boot, TopBar } from './shared/chrome';
import { ToastProvider } from './shared/ui';
import { ExperienceProvider, useExperience } from './state/ExperienceContext';
import { SessionProvider, useSession } from './state/SessionContext';
import { log, logAlerta, logGrupo } from './lib/debug';
import type { Phase, Product } from './types';
import './styles/global.css';

/**
 * A cena atual é montada na hora, sem esperar a anterior "sair".
 *
 * Antes isto era um <AnimatePresence mode="wait">, que só monta a próxima
 * tela depois que a animação de saída termina — e se a animação não terminar,
 * o app congela com a tela antiga apagada e o clique parece não fazer nada.
 * A entrada agora é uma animação de CSS (.phase em global.css): puro enfeite,
 * incapaz de segurar a troca de tela.
 */
function Scene({ phase, children }: { phase: Phase; children: ReactNode }) {
  useEffect(() => {
    log('fase', `cena montada: ${phase}`);
  }, [phase]);

  return (
    <div className={`phase${phase === 'catalog' ? '' : ' phase--center'}`}>{children}</div>
  );
}

function Experience() {
  const { phase, product, select, completeChallenge, beginChallenge } = useExperience();
  const { products, isUnlocked, addToCart, open, count } = useSession();

  const handleSelect = useCallback((next: Product) => select(next), [select]);

  /**
   * Percurso do "adicionar ao carrinho", em quatro passos rastreados.
   *
   * Quem decide se a peça pode ser comprada é a API: ela responde 409
   * PRODUCT_LOCKED se o minigame não foi vencido. A checagem local abaixo é
   * só cortesia com o usuário — evita uma ida ao servidor que já sabemos que
   * seria recusada, e leva a pessoa ao desafio em vez de mostrar um erro.
   *
   * A animação é enfeite: o commit roda nos dois desfechos da promessa, então
   * nenhuma falha de animação consegue engolir uma compra.
   */
  const handleAddToCart = useCallback(
    (origin: HTMLElement) => {
      const fecharGrupo = logGrupo('carrinho', 'adicionar ao carrinho — início');

      if (!product) {
        logAlerta('carrinho', 'abortado no passo 1: nenhum produto em foco');
        fecharGrupo();
        return;
      }
      log('carrinho', 'passo 1/4 — produto em foco', { id: product.id, nome: product.name, preco: product.price });

      if (!isUnlocked(product.id)) {
        logAlerta('carrinho', 'abortado no passo 2: peça lacrada — enviando ao minigame', { id: product.id });
        fecharGrupo();
        beginChallenge();
        return;
      }
      log('carrinho', 'passo 2/4 — peça liberada; a API dará a palavra final', { id: product.id });

      log('carrinho', 'passo 3/4 — disparando o voo decorativo', { origem: origin?.className });

      const commit = (via: string) => {
        log('carrinho', 'passo 4/4 — chamando POST /api/cart', { id: product.id, via, itensAntes: count });
        void addToCart(product.id).then((ok) => {
          if (ok) {
            window.setTimeout(() => {
              open();
              log('carrinho', 'gaveta do carrinho aberta');
            }, 300);
          }
          fecharGrupo();
        });
      };

      flyToCart(origin).then(
        (outcome) => commit(outcome),
        (erro) => {
          logAlerta('carrinho', 'o voo falhou — a compra segue mesmo assim', erro);
          commit('falha-na-animacao');
        },
      );
    },
    [addToCart, beginChallenge, count, isUnlocked, open, product],
  );

  return (
    <div className="app">
      <div className="app__aura" aria-hidden="true" />
      <div className="app__rules" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="app__grain" aria-hidden="true" />

      <a className="u-skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <TopBar />

      <main className="app__stage" id="conteudo">
        {/* A `key` remonta a cena a cada troca de fase e reinicia a animação
            de entrada do CSS. Sem produto em foco, o catálogo é o destino. */}
        <Scene key={product ? `${phase}-${product.id}` : phase} phase={product ? phase : 'catalog'}>
          {phase === 'game' && product ? (
            <ShellGame key={product.id} product={product} onComplete={completeChallenge} />
          ) : phase === 'unlocked' && product ? (
            <UnlockReveal product={product} onAddToCart={handleAddToCart} />
          ) : (
            <>
              <Hero />
              <Carousel products={products} onSelect={handleSelect} />
            </>
          )}
        </Scene>
      </main>

      <CartDrawer />
    </div>
  );
}

/** Só monta a experiência depois que catálogo e sessão chegaram da API. */
function Gate() {
  const { status, bootError, reload } = useSession();

  if (status !== 'ready') {
    return <Boot status={status} message={bootError} onRetry={reload} />;
  }

  return (
    <ExperienceProvider>
      <Experience />
    </ExperienceProvider>
  );
}

export default function App() {
  return (
    // reducedMotion="user" faz o framer-motion respeitar a preferência do
    // sistema em todas as cenas, do mesmo jeito que o CSS já respeita.
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
