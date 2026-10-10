# AGENTS.md — Clip Miner

CLI local em Node.js/TypeScript que minera cortes para Shorts de um vídeo longo + SRT, usando o Gemini apenas para análise. Visão geral em [README.md](README.md); processos detalhados em [docs/](docs/README.md).

## Build e testes

```powershell
npm install
npm run dev -- videos/<video>.mp4 [videos/<video>.srt]   # executa a CLI (tsx)
npm run typecheck                                        # tsc --noEmit (verificação autoritativa)
npm test                                                 # vitest
npm run build                                            # compila para dist/
```

Sempre rode `npm run typecheck` e `npm test` após mudar código. FFmpeg precisa estar no PATH para os cortes.

## Arquitetura

Pipeline de 5 etapas orquestrado por [src/pipeline/process-video.ts](src/pipeline/process-video.ts): parse SRT → mineração (Gemini) → deduplicação → ranking (Gemini) → cortes (FFmpeg). Detalhes e fronteiras de cada camada em [docs/arquitetura.md](docs/arquitetura.md) e [docs/pipeline.md](docs/pipeline.md).

## Convenções (diferentes do comum)

- **ESM NodeNext**: imports relativos DEVEM terminar em `.js` (ex.: `import { x } from "./foo.js"`), mesmo apontando para `.ts`. Imports de built-ins usam prefixo `node:` (ex.: `node:child_process`).
- **Zod v4** é a fonte única de schema: o `responseSchema` do Gemini é derivado do Zod via `toGeminiResponseSchema()` em [src/candidates/types.ts](src/candidates/types.ts). Ao alterar o schema de candidato, mude só o Zod.
- **Toda saída da IA é validada** com `CandidateListSchema.safeParse` e os timestamps são ajustados com `snapToSegments` antes de uso. Nunca confie em JSON cru da IA. Veja [docs/mineracao.md](docs/mineracao.md).
- **Config via Zod**: adicione variáveis de ambiente apenas em [src/config/env.ts](src/config/env.ts) (validação falha cedo). Documente em `.env.example` e [docs/configuracao.md](docs/configuracao.md).
- **Chamadas ao Gemini** passam por `withRetry` ([src/ai/retry.ts](src/ai/retry.ts)) — retry só em 429/5xx/rede. Veja [docs/gemini.md](docs/gemini.md).
- **Strings de usuário, logs e prompts em português** (pt-BR).
- **Testes** em `test/`, importando `src` com extensão `.js`. Cobrem funções puras (parser, segmenter, dedup, snap).

## Pitfalls

- O servidor TS do editor pode mostrar erros fantasmas (ex.: módulo não encontrado) após instalar deps — `npm run typecheck` é a verdade; recarregue a janela se divergir.
- **Nunca commitar** `.env`, `data/`, `output/`, `models/` (já no [.gitignore](.gitignore)). `data/<video>/*.json` controla a **retomada**: apagar um JSON força reprocessar aquela etapa (e gasta cota).
- Não dispare chamadas Gemini em paralelo no caminho com chunking — respeite a execução sequencial com pausa (limites de cota).
