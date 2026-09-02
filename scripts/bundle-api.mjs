// Empacota a API inteira (server/index.ts + tudo que ele importa de src/) num
// único arquivo em api/index.js, antes do build do front.
//
// Por quê: a Vercel roda `api/index.ts` como função isolada e não conseguia
// resolver os imports relativos para `server/` e `src/` em tempo de execução
// — o erro real era `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server/...'`.
// O compilador dela transpila arquivo por arquivo em vez de empacotar o
// projeto inteiro, então uma estrutura de pastas como a nossa (api/ importando
// server/, que importa src/) não sobrevive ao deploy.
//
// A correção é não depender disso: empacotamos o app inteiro aqui, com
// esbuild, ANTES do deploy. O arquivo que a Vercel recebe não tem mais
// nenhum import relativo — só pacotes do node_modules (express, cors),
// deixados de fora do pacote e resolvidos normalmente pela plataforma.
//
// api/index.js é gerado a cada build (está no .gitignore, como o dist/).

import { build } from 'esbuild';
import { existsSync, mkdirSync } from 'node:fs';

if (!existsSync('api')) mkdirSync('api');

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: 'api/index.js',
  packages: 'external',
  logLevel: 'info',
});

console.log('  ↳ api/index.js gerado (server/index.ts + dependências locais empacotados)');
