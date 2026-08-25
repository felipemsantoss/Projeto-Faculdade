import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperience } from '../../state/ExperienceContext';
import { useSession } from '../../state/SessionContext';
import { log, logAlerta } from '../../lib/debug';
import { cx, pad2 } from '../../lib/format';
import type { ChallengeState, Product } from '../../types';
import { ActionButton } from '../../shared/ui';
import { Cup } from './Cup';
import './shellgame.css';

/** Ritmo da apresentação, antes do embaralhamento começar. */
const ESPERA_ANTES = 420;
const ENTRADA_DA_BOLINHA = 900;
const COBRIR = 480;
/** Quanto tempo o resultado fica na tela antes de seguir. */
const LEITURA_DO_ACERTO = 1500;
/** Pausa entre a vitória final e a revelação do produto. */
const WIN_DELAY_MS = 1600;

type Fase = 'preparando' | 'entrando' | 'cobrindo' | 'embaralhando' | 'escolha' | 'revelando';

interface ShellGameProps {
  product: Product;
  onComplete: () => void;
}

/** Aplica uma troca de posições ao mapa copo → posição. */
function trocar(posicoes: number[], [a, b]: [number, number]): number[] {
  return posicoes.map((posicao) => (posicao === a ? b : posicao === b ? a : posicao));
}

export function ShellGame({ product, onComplete }: ShellGameProps) {
  const { openChallenge, resetChallenge, submitPick, busy } = useSession();
  const { exit } = useExperience();

  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [fase, setFase] = useState<Fase>('preparando');
  /** posicoes[idDoCopo] = posição que ele ocupa na mesa. */
  const [posicoes, setPosicoes] = useState<number[]>([0, 1, 2]);
  /** Os dois copos que estão cruzando agora, para o arco do movimento. */
  const [passe, setPasse] = useState<{ frente: number; fundo: number } | null>(null);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [resultado, setResultado] = useState<{ correct: boolean; ballIndex: number } | null>(null);

  /** Espelho das posições para os timers lerem o valor mais recente. */
  const posicoesRef = useRef<number[]>([0, 1, 2]);
  const timers = useRef<number[]>([]);
  const enviando = useRef(false);

  const agendar = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const limparTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => limparTimers, [limparTimers]);

  const copos = challenge?.cups ?? 3;
  /**
   * A bolinha pertence a um COPO, não a uma posição: como no início cada copo
   * está na posição de mesmo número, o copo da bolinha é o `startIndex`. Daí
   * em diante ela viaja junto com ele, aconteça o que acontecer nas trocas —
   * é isso que torna o resultado justo, e não a animação.
   */
  const copoDaBolinha = challenge?.startIndex ?? 0;
  const posicaoDaBolinha = posicoes[copoDaBolinha] ?? 0;

  // ---------- carregar a rodada ----------

  useEffect(() => {
    let cancelado = false;
    void openChallenge(product.id).then((state) => {
      if (cancelado || !state) return;
      setChallenge(state);
      log('jogo', 'rodada aberta', {
        peca: product.id,
        rodada: `${state.round}/${state.totalRounds}`,
        trocas: state.trocas.length,
        ritmo: `${state.swapMs}ms`,
      });
    });
    return () => {
      cancelado = true;
    };
  }, [openChallenge, product.id]);

  // ---------- a coreografia de uma rodada ----------

  useEffect(() => {
    if (!challenge || challenge.status !== 'playing') return;

    limparTimers();
    const inicial = Array.from({ length: challenge.cups }, (_, i) => i);
    posicoesRef.current = inicial;
    setPosicoes(inicial);
    setPasse(null);
    setEscolhido(null);
    setResultado(null);
    setFase('preparando');

    agendar(() => setFase('entrando'), ESPERA_ANTES);
    agendar(() => setFase('cobrindo'), ESPERA_ANTES + ENTRADA_DA_BOLINHA);

    // Embaralhamento: cada troca é agendada com o ritmo da rodada, e o mapa
    // de posições é atualizado de verdade — o CSS só transporta os copos até
    // onde a lógica já os colocou.
    const inicio = ESPERA_ANTES + ENTRADA_DA_BOLINHA + COBRIR;
    agendar(() => {
      setFase('embaralhando');
      log('jogo', 'embaralhando', { trocas: challenge.trocas.length, ritmo: `${challenge.swapMs}ms` });
    }, inicio);

    challenge.trocas.forEach((troca, indice) => {
      agendar(() => {
        // O cálculo fica fora do updater de estado: um updater precisa ser
        // puro, e o React pode chamá-lo mais de uma vez em desenvolvimento.
        const atual = posicoesRef.current;
        const [a, b] = troca;
        const frente = atual.findIndex((posicao) => posicao === a);
        const fundo = atual.findIndex((posicao) => posicao === b);
        const proximo = trocar(atual, troca);

        posicoesRef.current = proximo;
        setPasse({ frente, fundo });
        setPosicoes(proximo);
      }, inicio + indice * challenge.swapMs);
    });

    agendar(
      () => {
        setPasse(null);
        setFase('escolha');
        log('jogo', 'copos pararam — vez do jogador');
      },
      inicio + challenge.trocas.length * challenge.swapMs + 120,
    );

    return limparTimers;
  }, [challenge, agendar, limparTimers]);

  // ---------- vitória final ----------

  useEffect(() => {
    if (challenge?.status !== 'won') return;
    log('jogo', 'desafio vencido — liberando a peça');
    const timer = window.setTimeout(onComplete, WIN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [challenge?.status, onComplete]);

  // ---------- escolha ----------

  const escolher = useCallback(
    async (posicao: number) => {
      if (fase !== 'escolha' || enviando.current || !challenge) return;

      enviando.current = true;
      setEscolhido(posicao);
      setFase('revelando');

      const retorno = await submitPick(product.id, posicao);
      enviando.current = false;

      if (!retorno) {
        // A API recusou; voltamos para a escolha em vez de travar a rodada.
        setEscolhido(null);
        setFase('escolha');
        return;
      }

      setResultado({ correct: retorno.correct, ballIndex: retorno.ballIndex });

      // Conferência de integridade: onde a animação deixou a bolinha tem de
      // ser exatamente onde o servidor diz que ela estava.
      if (retorno.ballIndex !== posicaoDaBolinha) {
        logAlerta('jogo', 'animação e servidor discordaram sobre a bolinha', {
          servidor: retorno.ballIndex,
          animacao: posicaoDaBolinha,
        });
      }

      log('jogo', retorno.correct ? 'acertou o copo' : 'errou o copo', {
        escolhido: posicao,
        bolinha: retorno.ballIndex,
      });

      if (retorno.correct && retorno.challenge.status === 'playing') {
        // Ganhou a rodada: a próxima já veio na resposta.
        agendar(() => setChallenge(retorno.challenge), LEITURA_DO_ACERTO);
      } else {
        setChallenge(retorno.challenge);
      }
    },
    [agendar, challenge, fase, posicaoDaBolinha, product.id, submitPick],
  );

  const recomecar = useCallback(async () => {
    const nova = await resetChallenge(product.id);
    if (!nova) return;
    log('jogo', 'recomeçando do zero', { peca: product.id });
    setChallenge(nova);
  }, [product.id, resetChallenge]);

  // ---------- textos de estado ----------

  const perdeu = challenge?.status === 'lost';
  const venceu = challenge?.status === 'won';

  const instrucao = venceu
    ? 'Peça liberada.'
    : perdeu
      ? 'A bolinha estava no outro copo.'
      : fase === 'entrando' || fase === 'preparando'
        ? 'Olhe bem: a bolinha vai entrar num copo.'
        : fase === 'cobrindo'
          ? 'Guarde a posição.'
          : fase === 'embaralhando'
            ? 'Acompanhe o copo.'
            : fase === 'escolha'
              ? 'Onde está a bolinha?'
              : resultado?.correct
                ? 'Acertou!'
                : 'Quase.';

  const podeEscolher = fase === 'escolha' && !busy;
  const rodada = challenge?.round ?? 1;
  const totalRodadas = challenge?.totalRounds ?? 3;

  return (
    <section className="shell" aria-labelledby="shell-title">
      <header className="shell__head">
        <p className="shell__eyebrow">
          <span className="shell__eyebrow-dot" aria-hidden="true" />
          Desafio — {product.name}
        </p>
        <h2 className="shell__title" id="shell-title">
          Siga a bolinha
        </h2>

        <div className="shell__rounds" aria-label={`Rodada ${rodada} de ${totalRodadas}`}>
          {Array.from({ length: totalRodadas }, (_, i) => (
            <span
              key={i}
              className={cx(
                'shell__round',
                i + 1 < rodada && 'is-done',
                i + 1 === rodada && !venceu && 'is-current',
                venceu && 'is-done',
              )}
            >
              {pad2(i + 1)}
            </span>
          ))}
        </div>
      </header>

      <div
        className={cx('shell__table', `is-${fase}`, venceu && 'is-won', perdeu && 'is-lost')}
        style={{ '--swap': `${challenge?.swapMs ?? 500}ms` } as React.CSSProperties}
      >
        {/* A bolinha vive na mesa e acompanha a posição do copo que a esconde. */}
        <span
          className={cx('shell__ball', (fase === 'entrando' || fase === 'revelando' || venceu) && 'is-visible')}
          style={
            {
              '--pos': resultado ? resultado.ballIndex : posicaoDaBolinha,
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          <span className="shell__ball-core" />
          <span className="shell__ball-glow" />
        </span>

        {Array.from({ length: copos }, (_, copoId) => {
          const posicao = posicoes[copoId] ?? copoId;
          const erguido =
            (fase === 'entrando' && copoId === copoDaBolinha) ||
            (fase === 'revelando' && (posicao === escolhido || posicao === resultado?.ballIndex)) ||
            (venceu && posicao === resultado?.ballIndex) ||
            (perdeu && (posicao === escolhido || posicao === resultado?.ballIndex));

          const acertou = Boolean(resultado?.correct) && posicao === resultado?.ballIndex;
          const errou = resultado && !resultado.correct && posicao === escolhido;
          const revelaCerto = resultado && !resultado.correct && posicao === resultado.ballIndex;

          return (
            <Cup
              key={copoId}
              posicao={posicao}
              erguido={erguido}
              passe={passe?.frente === copoId ? 'frente' : passe?.fundo === copoId ? 'fundo' : undefined}
              estado={acertou ? 'acerto' : errou ? 'erro' : revelaCerto ? 'alvo' : undefined}
              podeEscolher={podeEscolher}
              accent={product.accent}
              onEscolher={() => void escolher(posicao)}
            />
          );
        })}

        {/* Faíscas curtas na comemoração. Puro enfeite, some sozinho. */}
        {resultado?.correct && (
          <span
            className="shell__faiscas"
            style={{ '--pos': resultado.ballIndex } as React.CSSProperties}
            aria-hidden="true"
          >
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="shell__faisca" style={{ '--i': i } as React.CSSProperties} />
            ))}
          </span>
        )}
      </div>

      <p className={cx('shell__instrucao', venceu && 'is-win', perdeu && 'is-lost')} role="status" aria-live="polite">
        {instrucao}
      </p>

      <footer className="shell__foot">
        <ActionButton variant="quiet" onClick={() => void recomecar()} disabled={busy}>
          {perdeu ? 'Tentar de novo' : 'Recomeçar'}
        </ActionButton>
        <span className="shell__sep" aria-hidden="true" />
        <ActionButton variant="quiet" onClick={exit} disabled={busy}>
          Voltar à loja
        </ActionButton>
      </footer>
    </section>
  );
}
