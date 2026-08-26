# ATELIER NOIR

E-commerce experimental onde a compra é a recompensa: cada peça do catálogo
está lacrada pelo jogo dos três copos. O usuário escolhe um objeto, segue a
bolinha por três rodadas cada vez mais rápidas e só então o botão de compra
existe.

```
CATÁLOGO → clique no produto → SIGA A BOLINHA (3 rodadas) → PEÇA DESBLOQUEADA → carrinho
```

Front em React + TypeScript, back em Express + TypeScript. Todo o estado de
negócio — catálogo, peças desbloqueadas e carrinho — vive no servidor.

## Rodando

```bash
npm install
```

```bash
npm run dev
```

Isso sobe **os dois processos**: a API REST em `localhost:3333` e o front em
`localhost:5180`. O Vite encaminha `/api` para a API, então o navegador faz as
chamadas na própria origem — sem CORS, e todas visíveis na aba **Network**.

Se a API não estiver de pé, o front mostra uma tela dizendo exatamente isso,
com o comando para corrigir e um botão de tentar de novo.

| Script              | O que faz                               |
| ------------------- | --------------------------------------- |
| `npm run dev`       | API + front juntos                      |
| `npm run dev:api`   | só a API (tsx watch)                    |
| `npm run dev:web`   | só o front (Vite)                       |
| `npm run build`     | checagem de tipos dos dois lados + build |
| `npm run typecheck` | só a checagem de tipos                  |

## A API REST

Express + TypeScript, em `server/`. Estado persistido em `server/data/db.json`,
separado por sessão através do cabeçalho `x-session-id` — o navegador guarda
apenas esse identificador.

| Método | Rota                    | O que faz                            |
| ------ | ----------------------- | ------------------------------------ |
| GET    | `/api/health`           | diagnóstico rápido                   |
| GET    | `/api/products`         | catálogo                             |
| GET    | `/api/session`          | peças desbloqueadas + carrinho       |
| POST   | `/api/session/relock`   | relacra todas as peças (chamado ao carregar) |
| POST   | `/api/challenge`        | abre o desafio da peça               |
| POST   | `/api/challenge/reset`  | recomeça da primeira rodada          |
| POST   | `/api/challenge/pick`   | envia o copo escolhido; acertar avança |
| POST   | `/api/cart`             | adiciona ao carrinho                 |
| PATCH  | `/api/cart/:productId`  | altera a quantidade                  |
| DELETE | `/api/cart/:productId`  | remove o item                        |
| POST   | `/api/orders`           | fecha o pedido e esvazia o carrinho  |

Toda mutação responde com o retrato inteiro da sessão (`unlocked`, `lines`,
`subtotal`, `count`), então o cliente nunca calcula subtotal nem decide sozinho
o que está liberado.

### As regras moram no servidor

| Situação                                        | Resposta               |
| ----------------------------------------------- | ---------------------- |
| Adicionar peça que não venceu o desafio         | `409 PRODUCT_LOCKED`   |
| Copo fora do intervalo                          | `400 INVALID_PICK`     |
| Escolher depois da rodada encerrada             | `409 CHALLENGE_OVER`   |
| Quantidade fora de 0–9                          | `400 INVALID_QUANTITY` |
| Peça inexistente                                | `404 PRODUCT_NOT_FOUND`|
| Fechar pedido com carrinho vazio                | `422 EMPTY_CART`       |

Dá para conferir sem abrir o navegador:

```bash
curl -X POST http://localhost:3333/api/cart -H "content-type: application/json" -H "x-session-id: teste123" -d "{\"productId\":\"obsidian\"}"
```

## Onde fica cada coisa

As pastas seguem **a ordem da jornada**. Se você sabe em que etapa o problema
aparece, sabe em que pasta olhar.

```
server/                         ── A API REST ──
├── index.ts                    rotas, validações e regras de negócio
├── shell.ts                    ← as regras do jogo: sorteio, trocas, dificuldade
└── db.ts                       persistência em arquivo

src/
├── main.tsx                    Ponto de entrada; liga o rastreamento
├── App.tsx                     Máquina de fases + o percurso do "adicionar"
├── types.ts                    Contratos compartilhados (front e API)
│
├── services/
│   └── api.ts                  ← cliente axios e todas as rotas
│
├── features/                   ── AS QUATRO ETAPAS, NA ORDEM ──
│   ├── catalog/                01 · explorar e escolher (vai direto ao jogo)
│   │   ├── Hero.tsx
│   │   ├── Carousel.tsx        carrossel 3D: arraste, inércia, encaixe
│   │   └── index.ts
│   ├── minigame/               02 · o desafio que destrava a compra
│   │   ├── ShellGame.tsx      rodadas, embaralhamento e desfecho
│   │   ├── Cup.tsx            o copo, desenhado em SVG
│   │   ├── shellgame.css      mesa, cruzamentos, faíscas
│   │   └── index.ts
│   ├── unlock/                 03 · a recompensa
│   │   ├── UnlockReveal.tsx    ← o botão "Adicionar ao carrinho"
│   │   └── index.ts
│   └── cart/                   04 · sacola e pedido
│       ├── CartDrawer.tsx      gaveta, quantidades, subtotal, checkout
│       ├── flyToCart.ts        o voo decorativo até o ícone
│       └── index.ts
│
├── state/
│   ├── SessionContext.tsx      ← catálogo, desbloqueios e carrinho (da API)
│   └── ExperienceContext.tsx   fase atual e peça em foco (só interface)
│
├── shared/
│   ├── ui/                     ActionButton, Toast
│   ├── artwork/                ProductArtwork (SVG gerado por produto)
│   └── chrome/                 TopBar e Boot (tela de partida/erro)
│
├── hooks/                      Genéricos: mídia, foco, rolagem
├── lib/                        debug, cor, formatação, embaralhamento
├── data/                       products.ts — o catálogo
└── styles/                     tokens.css é o sistema visual inteiro
```

Cada pasta de `features/` tem um `index.ts`, então os imports em `App.tsx`
leem como a própria jornada:

```ts
import { Carousel, Hero } from './features/catalog';
import { ShellGame } from './features/minigame';
import { CartDrawer, flyToCart } from './features/cart';
```

## Rastreando o que acontece (console)

Todo evento do fluxo vira uma linha colorida no console, com o tempo desde o
carregamento. Abra o DevTools (F12) e interaja: a jornada se escreve sozinha.

Um clique em "Adicionar ao carrinho" produz isto:

```
UI        botão acionado
CARRINHO  ▼ adicionar ao carrinho — início
CARRINHO  passo 1/4 — produto em foco
CARRINHO  passo 2/4 — peça liberada; a API dará a palavra final
CARRINHO  passo 3/4 — disparando o voo decorativo
ANIMAÇÃO  voo até o carrinho iniciado
ANIMAÇÃO  voo concluído (animacao-concluida)
CARRINHO  passo 4/4 — chamando POST /api/cart
API       → POST /cart
API       ← 201 /cart (10ms)
CARRINHO  gaveta do carrinho aberta
```

Como ler: **se uma linha não aparece, o fluxo parou na anterior.**

| Se falta…             | O problema está…                                     |
| --------------------- | ---------------------------------------------------- |
| `UI botão acionado`   | antes do React — o clique nem chegou ao componente    |
| `passo 1/4`           | não há produto em foco no `ExperienceContext`         |
| `passo 2/4`           | a peça não venceu o desafio (sai um ALERTA)           |
| `API → POST /cart`    | o voo travou antes de chamar a API                    |
| `API ← 201`           | a API recusou ou não respondeu — o código diz qual    |

### Comandos no console

```js
atelierDebug.historico()   // tabela com a jornada inteira
atelierDebug.bruto()       // o mesmo, como array (bom para copiar)
atelierDebug.off()         // silencia
atelierDebug.on()          // religa, inclusive em produção
```

Canais: `API`, `FASE`, `CATÁLOGO`, `PRODUTO`, `JOGO`, `CARRINHO`, `ANIMAÇÃO`,
`UI` e `ALERTA`. Alertas usam `console.warn` e aparecem **mesmo silenciado**.

## Duas regras do projeto

**1. Nenhuma peça entra na sacola sem vencer o desafio.** Quem decide é a
API (`409 PRODUCT_LOCKED`). O front repete a checagem só por cortesia: evita
uma ida ao servidor que já sabemos que seria recusada e leva a pessoa ao
desafio em vez de mostrar um erro.

**2. Estado nunca depende de decoração.** Vale para as duas coisas que já
quebraram por causa disso:

- A **troca de tela** não usa `AnimatePresence mode="wait"`. Aquele modo só
  monta a próxima cena depois que a animação de saída termina — e quando ela
  não termina, o app congela com a tela antiga apagada e o clique parece não
  fazer nada. Hoje a cena entra na hora e a animação de entrada é CSS puro.
- O **voo até o carrinho** é enfeite: ele
corre contra um teto de 1100 ms e o commit roda nos dois desfechos da promessa.
A linha do tempo de animação do navegador congela em aba de fundo — se a compra
dependesse dela, o clique sumiria em silêncio. (Foi um bug real, por isso a
regra.)

## Como se navega o catálogo

| Onde | Gesto |
| ---- | ----- |
| Desktop | rolagem (roda/trackpad), setas na tela, teclado (←/→, Home/End) |
| Toque | deslizar o dedo |
| Abrir o produto | clicar no card central — vai direto ao jogo |

**Recarregar a página relacra tudo.** O desbloqueio vale só enquanto a página
está aberta: ao carregar, o front chama `POST /api/session/relock` e toda peça
volta ao estado lacrado. O carrinho e os pedidos **não** são afetados — só o
direito de comprar é que expira.

Com mouse **não há arraste**: a rolagem conduz. Isso não é preferência estética,
é a correção de um bug real — veja a regra 3 abaixo.

**3. Capturar o ponteiro sequestra o clique.** O carrossel chamava
`setPointerCapture` já no `pointerdown`. Pela especificação de Pointer Events,
com a captura ativa o evento `click` é entregue ao elemento que capturou — o
container — e o `onClick` do card **nunca dispara**. Clicar no produto não fazia
nada. Hoje a captura só acontece quando o dedo passa do limiar de arraste, e o
mouse nem entra nesse caminho.

Detalhe do diagnóstico: testes que chamam `elemento.click()` não passam por
captura nenhuma, então esse bug passa batido. Para o caminho de ponteiro é
preciso disparar `pointerdown`/`pointerup` de verdade.

## Detalhes técnicos

**Carrossel** — física escrita à mão em `requestAnimationFrame`, escrevendo
`transform` direto no DOM; o React não re-renderiza por quadro. Mola até o
índice alvo, arremesso projetado pela velocidade do gesto, resistência elástica
nas pontas. Em repouso o loop detecta que nada mudou e para de escrever.
Suporta arraste, roda, setas, `Home`/`End` e foco-centraliza.

**Jogo dos três copos** — três rodadas, cada uma mais difícil que a anterior:
5, 7 e 9 trocas, a 520, 385 e 250 ms por troca. Errar encerra a tentativa,
revela onde a bolinha estava e oferece recomeçar.

A parte que importa: **a bolinha pertence a um copo, não a uma posição**. O
servidor sorteia onde ela entra e o plano de trocas; o cliente recebe esse
plano para conseguir animar o embaralhamento, mas quem calcula onde ela parou
é o servidor, e é contra esse cálculo que a escolha é conferida. O `finalIndex`
não sai do servidor até a escolha ser feita, e o cliente não tem como afirmar
que venceu — o desbloqueio nasce em `POST /api/challenge/pick`.

O cliente ainda faz uma conferência própria: se a posição onde a animação
deixou a bolinha não bater com a que o servidor informou, sai um ALERTA no
console. Numa partida inteira esse contador tem de ficar em zero.

Sobre o embaralhamento: os copos não se teletransportam. Cada troca move os
dois copos por transição de CSS com easing, e um deles ganha altura e frente
enquanto o outro recua — é esse desencontro que faz o movimento parecer um
cruzamento, e não dois objetos deslizando um através do outro.

**Produtos** — nenhuma imagem externa: cada peça é um SVG desenhado a partir da
própria paleta, em três camadas que se movem em ritmos diferentes para o
parallax. Trocar o acento em `src/data/products.ts` re-tematiza fundo,
carrossel, cartas e carrinho. A API serve esse mesmo arquivo em `/api/products`.

## Acessibilidade

- Todos os quatro níveis de texto ficam acima de 4,5:1 contra o fundo.
- Copos, cards e controles são `<button>` de verdade — teclado funciona em tudo.
- Foco preso e `Esc` na gaveta; foco devolvido à origem ao fechar.
- Mudanças de fase e de progresso são anunciadas via `aria-live`.
- `prefers-reduced-motion` encurta as animações no CSS e no framer-motion
  (`MotionConfig reducedMotion="user"`); nenhum feedback depende só de hover.
- Cursor customizado só monta onde existe mouse fino e movimento permitido.
