/**
 * Ponto de entrada da API na Vercel.
 *
 * A plataforma transforma cada arquivo desta pasta em uma função serverless.
 * O `vercel.json` reescreve tudo que chega em /api/* para cá, e o Express —
 * o mesmo de `npm run dev`, sem nenhuma bifurcação — cuida do roteamento.
 *
 * Não há `listen` aqui: quem escuta é a Vercel. Veja a condição no fim de
 * `server/index.ts`.
 */
export { default } from '../server/index';
