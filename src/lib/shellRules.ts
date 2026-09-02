/**
 * Regras do jogo dos três copos — compartilhadas pelo servidor e pelo modo
 * demonstração do navegador, para que existam em um lugar só.
 *
 * O plano de cada rodada nasce aqui: onde a bolinha entra, quais trocas
 * acontecem e em que ritmo. O cliente recebe esse plano para conseguir
 * *animar* o embaralhamento, mas quem calcula onde a bolinha parou é sempre
 * o servidor — a escolha do jogador é conferida contra a simulação daqui.
 */

export const COPOS = 3;
export const TOTAL_RODADAS = 3;

/** Um par de posições que trocam de lugar. */
export type Troca = [number, number];

export interface PlanoDaRodada {
  round: number;
  totalRounds: number;
  /** Posição em que a bolinha entra, antes de qualquer troca. */
  startIndex: number;
  trocas: Troca[];
  /** Duração de cada troca, em milissegundos. */
  swapMs: number;
}

/**
 * A dificuldade sobe em duas frentes: mais trocas e menos tempo por troca.
 * A primeira rodada é confortável de acompanhar de propósito — é ela que
 * ensina o jogo sem precisar de texto.
 */
export function dificuldade(round: number) {
  const trocas = 3 + round * 2; // 5, 7, 9…
  // O piso de 190 ms existe para o embaralhamento não virar um borrão: abaixo
  // disso a troca deixa de ser acompanhável e o jogo passa a ser sorte.
  const swapMs = Math.max(190, 520 - (round - 1) * 135); // 520, 385, 250…
  return { trocas, swapMs };
}

const paresPossiveis: Troca[] = [
  [0, 1],
  [1, 2],
  [0, 2],
];

/**
 * Sorteia as trocas evitando repetir o mesmo par duas vezes seguidas: duas
 * trocas idênticas em sequência se anulam e o embaralhamento fica pobre.
 */
function sortearTrocas(quantidade: number): Troca[] {
  const trocas: Troca[] = [];
  let anterior = -1;

  for (let i = 0; i < quantidade; i += 1) {
    let escolha = Math.floor(Math.random() * paresPossiveis.length);
    if (escolha === anterior) escolha = (escolha + 1 + Math.floor(Math.random() * 2)) % paresPossiveis.length;
    anterior = escolha;
    trocas.push([...paresPossiveis[escolha]] as Troca);
  }

  return trocas;
}

/** Aplica as trocas a uma posição e devolve onde ela foi parar. */
export function seguirBolinha(startIndex: number, trocas: Troca[]): number {
  return trocas.reduce((posicao, [a, b]) => {
    if (posicao === a) return b;
    if (posicao === b) return a;
    return posicao;
  }, startIndex);
}

export function planejarRodada(round: number): PlanoDaRodada & { finalIndex: number } {
  const { trocas: quantidade, swapMs } = dificuldade(round);
  const startIndex = Math.floor(Math.random() * COPOS);
  const trocas = sortearTrocas(quantidade);

  return {
    round,
    totalRounds: TOTAL_RODADAS,
    startIndex,
    trocas,
    swapMs,
    finalIndex: seguirBolinha(startIndex, trocas),
  };
}
