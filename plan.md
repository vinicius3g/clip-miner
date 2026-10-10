Eu montaria o Clip Miner como uma CLI local em Node.js/TypeScript, com a IA sendo usada apenas para análise dos trechos. Assim, o processamento de vídeo, transcrição, armazenamento e cortes ficam no seu PC e o único serviço externo é a API gratuita do Gemini.

A API Gemini atualmente oferece nível gratuito para modelos Flash, e o Gemini 2.5 Flash, por exemplo, possui janela de entrada de 1.048.576 tokens. Os limites de RPM/TPM/RPD variam por projeto e podem ser consultados no AI Studio.

1. Arquitetura que eu usaria
                         ┌──────────────────┐
                         │     video.mp4    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ FFmpeg           │
                         │ extrai áudio     │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Whisper local    │
                         │ transcrição      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ SRT / JSON       │
                         │ timestamps       │
                         └────────┬─────────┘
                                  │
                                  ▼
                  ┌───────────────────────────────┐
                  │ Segmentador                   │
                  │ blocos de 10-15 min           │
                  │ overlap de 30s                │
                  └──────────────┬────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        bloco 01            bloco 02            bloco 03
              │                  │                  │
              ▼                  ▼                  ▼
        Gemini Flash-Lite   Gemini Flash-Lite   Gemini Flash-Lite
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
                       candidatos encontrados
                                 │
                                 ▼
                       deduplicação local
                                 │
                                 ▼
                     ┌────────────────────┐
                     │ Ranking final      │
                     │ Gemini Flash       │
                     └─────────┬──────────┘
                               │
                               ▼
                       TOP 5-10 candidatos
                               │
                               ▼
                         FFmpeg / cortes
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
          clip-01.mp4       clip-02.mp4       clip-03.mp4

A grande vantagem é que você nunca mais precisa copiar uma transcrição para uma LLM manualmente.

2. Stack

Tudo gratuito:

Componente	Tecnologia
Runtime	Node.js
Linguagem	TypeScript
IA	Gemini API Free
SDK	@google/genai
Validação	Zod
Transcrição	Whisper local
Vídeo	FFmpeg
Persistência	JSON/arquivos
Banco	Nenhum inicialmente
Interface	CLI
Deploy	Nenhum

O SDK oficial atual para JavaScript/TypeScript é @google/genai, e o Google suporta respostas estruturadas com JSON Schema/Zod.

3. Estrutura do projeto

Eu começaria assim:

clip-miner/
│
├── src/
│   ├── cli/
│   │   └── index.ts
│   │
│   ├── config/
│   │   └── env.ts
│   │
│   ├── transcription/
│   │   ├── whisper.ts
│   │   ├── srt-parser.ts
│   │   └── types.ts
│   │
│   ├── segmentation/
│   │   ├── segmenter.ts
│   │   └── types.ts
│   │
│   ├── ai/
│   │   ├── gemini.ts
│   │   ├── prompts.ts
│   │   ├── candidate-miner.ts
│   │   └── candidate-ranker.ts
│   │
│   ├── candidates/
│   │   ├── deduplicate.ts
│   │   └── types.ts
│   │
│   ├── video/
│   │   ├── ffmpeg.ts
│   │   └── cutter.ts
│   │
│   ├── pipeline/
│   │   └── process-video.ts
│   │
│   └── utils/
│       ├── logger.ts
│       ├── sleep.ts
│       └── files.ts
│
├── data/
│   └── .gitkeep
│
├── videos/
│   └── .gitkeep
│
├── output/
│   └── .gitkeep
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
4. Instalação
mkdir clip-miner
cd clip-miner

npm init -y

npm install @google/genai zod dotenv
npm install -D typescript tsx @types/node

O SDK oficial é instalado atualmente com:

npm install @google/genai

conforme a documentação do Google.

5. package.json
{
  "name": "clip-miner",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/cli/index.ts",
    "build": "tsc",
    "start": "node dist/cli/index.js"
  },
  "dependencies": {
    "@google/genai": "^1.0.0",
    "dotenv": "^17.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}

Não fixe essas versões como requisito absoluto; rode npm install e deixe o npm resolver versões atuais compatíveis.

6. tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": [
    "src"
  ]
}
7. Variáveis de ambiente

.env

GEMINI_API_KEY=sua_chave_aqui

GEMINI_MODEL=gemini-2.5-flash
GEMINI_FAST_MODEL=gemini-2.5-flash-lite

CHUNK_MINUTES=12
CHUNK_OVERLAP_SECONDS=30

MIN_CLIP_SECONDS=25
MAX_CLIP_SECONDS=60

TOP_CLIPS=10

O Google permite que o SDK leia GEMINI_API_KEY automaticamente.

Importante: se sua conta/projeto não tiver acesso ao 2.5, basta trocar os modelos no .env por um Flash disponível no seu nível gratuito. A arquitetura não muda.

8. Tipos da transcrição

src/transcription/types.ts

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  duration: number;
  segments: TranscriptSegment[];
}

Cada pedaço da transcrição ficará assim:

{
  "id": 142,
  "start": 2531.2,
  "end": 2537.8,
  "text": "Você não precisa estar motivado para começar."
}

Isso é extremamente importante porque a IA não precisa adivinhar timestamps.

9. Parser do SRT

src/transcription/srt-parser.ts

import type {
  Transcript,
  TranscriptSegment
} from "./types.js";

function parseTimestamp(value: string): number {
  const [time, milliseconds] = value.split(",");

  const [hours, minutes, seconds] = time
    .split(":")
    .map(Number);

  return (
    hours * 3600 +
    minutes * 60 +
    seconds +
    Number(milliseconds) / 1000
  );
}

export function parseSrt(content: string): Transcript {
  const blocks = content
    .replace(/\r/g, "")
    .split("\n\n");

  const segments: TranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");

    if (lines.length < 3) continue;

    const timeLine = lines[1];

    if (!timeLine.includes("-->")) continue;

    const [startRaw, endRaw] = timeLine
      .split("-->")
      .map(value => value.trim());

    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);

    const text = lines
      .slice(2)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();

    if (!text) continue;

    segments.push({
      id: segments.length,
      start,
      end,
      text
    });
  }

  return {
    duration: segments.at(-1)?.end ?? 0,
    segments
  };
}
10. Segmentação

Aqui está uma das partes mais importantes.

Não corte a transcrição simplesmente a cada X caracteres.

Corte usando timestamp.

src/segmentation/segmenter.ts

import type { TranscriptSegment } from "../transcription/types.js";

export interface TranscriptChunk {
  id: number;
  start: number;
  end: number;
  segments: TranscriptSegment[];
  text: string;
}

interface Options {
  chunkSeconds: number;
  overlapSeconds: number;
}

export function createChunks(
  segments: TranscriptSegment[],
  options: Options
): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];

  const { chunkSeconds, overlapSeconds } = options;

  const duration = segments.at(-1)?.end ?? 0;

  let start = 0;
  let id = 0;

  while (start < duration) {
    const end = Math.min(
      start + chunkSeconds,
      duration
    );

    const chunkSegments = segments.filter(segment => {
      return (
        segment.end >= start &&
        segment.start <= end
      );
    });

    chunks.push({
      id,
      start,
      end,
      segments: chunkSegments,
      text: chunkSegments
        .map(segment => {
          return `[${segment.start.toFixed(2)}] ${segment.text}`;
        })
        .join("\n")
    });

    id++;

    start += chunkSeconds - overlapSeconds;
  }

  return chunks;
}

Eu usaria inicialmente:

12 minutos
+
30 segundos de overlap

Isso significa:

Chunk 1
00:00 → 12:00

Chunk 2
11:30 → 23:30

Chunk 3
23:00 → 35:00

Assim, uma frase que começa no final de um bloco não desaparece.

11. Gemini client

src/ai/gemini.ts

import {
  GoogleGenAI
} from "@google/genai";

import "dotenv/config";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function generateText(
  model: string,
  prompt: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text ?? "";
}
12. Schema dos candidatos

src/candidates/types.ts

import { z } from "zod";

export const CandidateSchema = z.object({
  start: z.number(),
  end: z.number(),

  title: z.string(),

  hook: z.string(),

  category: z.enum([
    "motivacao",
    "disciplina",
    "insight",
    "historia",
    "curiosidade",
    "emocao",
    "contraste",
    "conselho",
    "outro"
  ]),

  reason: z.string(),

  score: z.number().min(0).max(100)
});

export const CandidateListSchema = z.object({
  candidates: z.array(CandidateSchema)
});

export type Candidate = z.infer<
  typeof CandidateSchema
>;
13. Prompt para encontrar cortes

src/ai/prompts.ts

export function buildCandidatePrompt(
  start: number,
  end: number,
  transcript: string
) {
  return `
Você é um especialista em encontrar cortes virais
para YouTube Shorts.

Você está analisando um trecho de uma entrevista,
podcast ou vídeo longo.

INTERVALO DO VÍDEO

${start}s → ${end}s

TRANSCRIÇÃO

${transcript}

OBJETIVO

Encontre TODOS os momentos que possuem potencial
para virar um Short independente.

Um bom candidato pode conter:

- uma frase forte
- uma opinião controversa
- um insight
- uma história curta
- uma lição
- uma explicação surpreendente
- uma mudança de perspectiva
- uma frase motivacional
- um contraste
- uma pergunta interessante
- uma conclusão forte
- um momento emocional
- algo que gere curiosidade

REGRAS

1. Não invente informações.
2. Não altere as frases do entrevistado.
3. Os timestamps devem estar dentro do trecho fornecido.
4. O candidato deve fazer sentido isoladamente.
5. Prefira trechos entre 25 e 60 segundos.
6. Não corte no meio de uma frase.
7. O início deve ter potencial de hook.
8. Seja generoso: prefira encontrar candidatos demais
   a deixar bons momentos passar.
9. Não dê uma nota baixa apenas porque o trecho
   não parece extremamente viral.
10. O score representa apenas o potencial relativo
    daquele candidato.

Retorne somente os candidatos encontrados.
`;
}
14. Usando JSON estruturado

Aqui eu faria questão de usar structured output, porque você não quer ficar fazendo:

JSON.parse(
  response.text
    .replace("```json", "")
    .replace("```", "")
);

O Gemini possui suporte oficial a respostas estruturadas e schemas em JavaScript/Zod.

Por exemplo:

import {
  GoogleGenAI,
  Type
} from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const response = await ai.models.generateContent({
  model: process.env.GEMINI_FAST_MODEL!,
  contents: prompt,

  config: {
    responseMimeType: "application/json",

    responseSchema: {
      type: Type.OBJECT,

      properties: {
        candidates: {
          type: Type.ARRAY,

          items: {
            type: Type.OBJECT,

            properties: {
              start: {
                type: Type.NUMBER
              },

              end: {
                type: Type.NUMBER
              },

              title: {
                type: Type.STRING
              },

              hook: {
                type: Type.STRING
              },

              category: {
                type: Type.STRING
              },

              reason: {
                type: Type.STRING
              },

              score: {
                type: Type.NUMBER
              }
            },

            required: [
              "start",
              "end",
              "title",
              "hook",
              "category",
              "reason",
              "score"
            ]
          }
        }
      },

      required: ["candidates"]
    }
  }
});

const result = JSON.parse(response.text!);
15. Candidate miner

src/ai/candidate-miner.ts

import { GoogleGenAI, Type } from "@google/genai";

import { buildCandidatePrompt } from "./prompts.js";
import type { TranscriptChunk } from "../segmentation/segmenter.js";
import type { Candidate } from "../candidates/types.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MODEL =
  process.env.GEMINI_FAST_MODEL ??
  "gemini-2.5-flash-lite";

export async function mineCandidates(
  chunk: TranscriptChunk
): Promise<Candidate[]> {
  const prompt = buildCandidatePrompt(
    chunk.start,
    chunk.end,
    chunk.text
  );

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,

    config: {
      temperature: 0.2,

      responseMimeType: "application/json",

      responseSchema: {
        type: Type.OBJECT,

        properties: {
          candidates: {
            type: Type.ARRAY,

            items: {
              type: Type.OBJECT,

              properties: {
                start: {
                  type: Type.NUMBER
                },

                end: {
                  type: Type.NUMBER
                },

                title: {
                  type: Type.STRING
                },

                hook: {
                  type: Type.STRING
                },

                category: {
                  type: Type.STRING
                },

                reason: {
                  type: Type.STRING
                },

                score: {
                  type: Type.NUMBER
                }
              },

              required: [
                "start",
                "end",
                "title",
                "hook",
                "category",
                "reason",
                "score"
              ]
            }
          }
        },

        required: ["candidates"]
      }
    }
  });

  const parsed = JSON.parse(response.text ?? "{}");

  return parsed.candidates ?? [];
}
16. Não faça todas as requisições simultaneamente

Esse é um erro importante.

Não faça:

await Promise.all(
  chunks.map(chunk => mineCandidates(chunk))
);

Se um vídeo tem 2 horas:

10 chunks

você pode disparar 10 chamadas ao mesmo tempo.

Isso pode bater nos limites gratuitos.

O Google mede limites por RPM, TPM e RPD, e exceder qualquer um pode gerar 429 RESOURCE_EXHAUSTED.

Eu faria uma fila simples:

export async function processSequentially<T, R>(
  items: T[],
  callback: (item: T) => Promise<R>,
  delayMs = 1500
): Promise<R[]> {
  const results: R[] = [];

  for (const item of items) {
    const result = await callback(item);

    results.push(result);

    await new Promise(resolve =>
      setTimeout(resolve, delayMs)
    );
  }

  return results;
}
17. Retry automático

Também é essencial.

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 5
): Promise<T> {

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();

    } catch (error) {

      const delay =
        Math.pow(2, attempt) * 2000;

      console.log(
        `Erro. Tentativa ${attempt + 1}/${retries}`
      );

      await new Promise(resolve =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw new Error(
    "Número máximo de tentativas excedido"
  );
}
18. O ponto mais importante: salvar progresso

Imagine que seu vídeo tenha:

15 chunks

Você processou:

1
2
3
4
5
6
7

e a API deu erro.

Você não pode começar novamente do zero.

Salve:

data/
└── meu-video/
    ├── transcript.srt
    ├── transcript.json
    ├── chunks.json
    ├── candidates/
    │   ├── chunk-000.json
    │   ├── chunk-001.json
    │   ├── chunk-002.json
    │   ├── chunk-003.json
    │   ├── chunk-004.json
    │   ├── chunk-005.json
    │   └── chunk-006.json
    │
    └── final.json

Quando executar novamente:

chunk-000 existe → pula
chunk-001 existe → pula
...
chunk-006 existe → pula

chunk-007 → Gemini

Isso economiza tempo e principalmente sua cota gratuita.

19. Deduplicação

Como existe overlap:

00:00 → 12:00
11:30 → 23:30

a IA pode encontrar o mesmo corte duas vezes.

Você precisa remover duplicados.

function overlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) {
  return (
    Math.max(aStart, bStart) <
    Math.min(aEnd, bEnd)
  );
}

Depois:

export function deduplicate(
  candidates: Candidate[]
): Candidate[] {

  const sorted = [...candidates]
    .sort((a, b) => b.score - a.score);

  const result: Candidate[] = [];

  for (const candidate of sorted) {

    const duplicate = result.some(existing =>
      overlap(
        candidate.start,
        candidate.end,
        existing.start,
        existing.end
      )
    );

    if (!duplicate) {
      result.push(candidate);
    }
  }

  return result;
}
20. Agora vem a segunda IA

Essa é uma parte que eu considero fundamental para o seu projeto.

Não peça:

"Escolha os melhores momentos dessa transcrição de 2 horas."

Peça:

"Eu já encontrei 100 candidatos. Escolha os 10 que têm maior potencial."

Muito mais fácil.

Prompt do ranking
export function buildRankingPrompt(
  candidates: Candidate[]
) {
  return `
Você é um editor especialista em YouTube Shorts.

Abaixo estão candidatos encontrados automaticamente
em um vídeo longo.

Sua tarefa é selecionar os melhores.

CRITÉRIOS

Avalie:

1. força do hook
2. capacidade de prender atenção
3. clareza sem contexto adicional
4. valor da informação
5. curiosidade
6. emoção
7. potencial de compartilhamento
8. potencial de retenção
9. força da frase inicial
10. possibilidade de transformar o trecho em um Short

IMPORTANTE

Não escolha simplesmente os candidatos com maior
pontuação original.

Faça uma nova análise.

Evite escolher vários cortes praticamente iguais.

Distribua os cortes pelo vídeo quando houver
bons candidatos em diferentes partes.

CANDIDATOS:

${JSON.stringify(candidates, null, 2)}

Retorne os 10 melhores candidatos.
`;
}
21. Por que isso é melhor?

Imagine:

Vídeo = 2h15

Você encontra:

chunk 1 → 8 candidatos
chunk 2 → 11
chunk 3 → 5
chunk 4 → 13
...

Total:

97 candidatos

Então:

97 candidatos
       ↓
Gemini
       ↓
10 melhores

A segunda chamada tem um contexto muito menor.

22. Eu adicionaria um terceiro filtro local

Antes da segunda chamada:

97 candidatos
       ↓
remover duplicados
       ↓
remover <25 segundos
       ↓
remover >90 segundos
       ↓
remover candidatos muito próximos
       ↓
~60 candidatos
       ↓
Gemini
       ↓
TOP 10

Isso reduz bastante o uso da API.

23. Cortes automáticos com FFmpeg

Depois que a IA decidiu:

{
  "start": 2531,
  "end": 2580
}

você manda:

ffmpeg \
  -ss 00:42:11 \
  -i video.mp4 \
  -t 00:00:49 \
  -c:v libx264 \
  -c:a aac \
  output.mp4

Para o primeiro MVP, eu não usaria -c copy, porque cortes com precisão podem acabar ficando presos a keyframes.

24. Código do FFmpeg

src/video/cutter.ts

import { spawn } from "node:child_process";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);

  const m = Math.floor(
    (seconds % 3600) / 60
  );

  const s = Math.floor(seconds % 60);

  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0")
  ].join(":");
}

export function cutVideo(
  input: string,
  output: string,
  start: number,
  end: number
): Promise<void> {

  return new Promise((resolve, reject) => {

    const duration = end - start;

    const args = [
      "-y",

      "-ss",
      formatTime(start),

      "-i",
      input,

      "-t",
      formatTime(duration),

      "-c:v",
      "libx264",

      "-c:a",
      "aac",

      output
    ];

    const process = spawn(
      "ffmpeg",
      args,
      {
        stdio: "inherit"
      }
    );

    process.on("close", code => {

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `FFmpeg terminou com código ${code}`
          )
        );
      }

    });
  });
}
25. Estrutura final do resultado

Eu faria o programa produzir:

output/
└── meu-video/
    │
    ├── clips/
    │   ├── 01-disciplina.mp4
    │   ├── 02-motivacao.mp4
    │   ├── 03-insight.mp4
    │   ├── 04-historia.mp4
    │   └── 05-superacao.mp4
    │
    ├── candidates.json
    ├── final-ranking.json
    └── report.json

O final-ranking.json:

{
  "video": "meu-video.mp4",
  "duration": 8123,
  "totalCandidates": 87,
  "selected": 10,
  "clips": [
    {
      "rank": 1,
      "start": 2531,
      "end": 2580,
      "duration": 49,
      "title": "Você não precisa estar motivado",
      "hook": "Você não precisa estar motivado para começar",
      "category": "disciplina",
      "score": 94
    }
  ]
}
26. Pipeline principal

src/pipeline/process-video.ts

Conceitualmente:

export async function processVideo(
  videoPath: string
) {

  console.log("1. Transcrição");

  const transcript =
    await transcribe(videoPath);

  console.log("2. Criando chunks");

  const chunks = createChunks(
    transcript.segments,
    {
      chunkSeconds: 12 * 60,
      overlapSeconds: 30
    }
  );

  console.log(
    `Encontrados ${chunks.length} chunks`
  );

  const candidates = [];

  console.log("3. Encontrando candidatos");

  for (const chunk of chunks) {

    const result =
      await mineCandidates(chunk);

    candidates.push(...result);

    await sleep(1500);
  }

  console.log(
    `${candidates.length} candidatos`
  );

  console.log("4. Deduplicando");

  const unique =
    deduplicate(candidates);

  console.log(
    `${unique.length} candidatos únicos`
  );

  console.log("5. Ranking final");

  const best =
    await rankCandidates(unique);

  console.log("6. Gerando vídeos");

  for (const [index, candidate]
    of best.entries()) {

    await cutVideo(
      videoPath,
      `output/clip-${index + 1}.mp4`,
      candidate.start,
      candidate.end
    );
  }

  return best;
}
27. CLI

Quero que seu uso final seja extremamente simples:

npm run dev -- video.mp4

Ou:

npx tsx src/cli/index.ts video.mp4

E aparecer:

╔══════════════════════════════════════╗
║          CLIP MINER                  ║
╚══════════════════════════════════════╝

Vídeo:
podcast-ep-142.mp4

Duração:
02:13:42

[1/6] Transcrição
████████████████████ 100%

[2/6] Segmentação
12 chunks encontrados

[3/6] Encontrando candidatos

Chunk 01/12 ✓ 8 candidatos
Chunk 02/12 ✓ 6 candidatos
Chunk 03/12 ✓ 11 candidatos
Chunk 04/12 ✓ 7 candidatos
...

Total:
91 candidatos

[4/6] Deduplicação

91 → 64 candidatos

[5/6] Ranking

TOP 10 selecionados

[6/6] Gerando vídeos

01 ✓ 00:13:42 → 00:14:28
02 ✓ 00:27:11 → 00:28:03
03 ✓ 00:41:32 → 00:42:14
...

Concluído.
28. E a transcrição?

Aqui eu faria uma escolha importante.

Opção A — você já possui a transcrição

É o que eu recomendo para a primeira versão.

Seu fluxo atual provavelmente já gera algo como:

video.mp4
video.srt

Então o Clip Miner começa daqui:

SRT
 ↓
parser
 ↓
chunks
 ↓
Gemini

Você não precisa mexer no seu sistema atual.

29. Depois colocamos Whisper local

Aí o fluxo passa a ser:

video.mp4
    ↓
FFmpeg
    ↓
audio.wav
    ↓
Whisper local
    ↓
transcript.srt

O Whisper pode rodar localmente, então a transcrição também não custa nada.

Para sua máquina, eu consideraria whisper.cpp ou faster-whisper.

Se você quiser manter 100% Node, podemos chamar o executável do Whisper através de child_process.

import { spawn } from "node:child_process";

export function runWhisper(
  audio: string
): Promise<void> {

  return new Promise((resolve, reject) => {

    const process = spawn(
      "./whisper-cli",
      [
        "-m",
        "./models/ggml-small.bin",

        "-f",
        audio,

        "-osrt"
      ],
      {
        stdio: "inherit"
      }
    );

    process.on("close", code => {

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`Whisper error: ${code}`)
        );
      }

    });
  });
}
30. Uma melhoria que eu faria especificamente para o seu canal

Como você está usando isso para Shorts, eu adicionaria um conceito chamado:

clip profile

No .env:

CLIP_PROFILE=mentalidade-solida

E o perfil:

const profile = {
  name: "Mentalidade Sólida",

  preferredCategories: [
    "disciplina",
    "motivacao",
    "insight",
    "superacao",
    "mentalidade"
  ],

  minDuration: 30,
  maxDuration: 55,

  style: `
  Conteúdo direto.
  Frases fortes.
  Desenvolvimento pessoal.
  Mentalidade.
  Disciplina.
  Sem introduções longas.
  Sem necessidade de contexto externo.
  `
};

Então a IA passa a procurar cortes adequados ao seu canal, e não apenas "momentos interessantes".

31. Outra melhoria: hook separado do corte

Eu faria o sistema retornar:

{
  "start": 2531,
  "end": 2580,

  "hook": "Você não precisa estar motivado para começar.",

  "body": "...",

  "title": "Pare de esperar motivação",

  "category": "disciplina"
}

Porque futuramente você pode usar isso para gerar:

Título
Descrição
Legenda
Texto na tela
Hashtags
Thumbnail

sem precisar analisar o vídeo novamente.

32. E futuramente podemos colocar Auto-Caption

Depois:

clip.mp4
 ↓
Whisper
 ↓
SRT
 ↓
FFmpeg
 ↓
Short vertical 9:16
 ↓
legendas queimadas

A arquitetura pode evoluir para:

                   ┌───────────────┐
                   │   VIDEO 2h    │
                   └───────┬───────┘
                           ↓
                      TRANSCRIÇÃO
                           ↓
                     AI CLIP MINER
                           ↓
                     TOP 10 CORTES
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
          horizontal                 vertical
              ↓                         ↓
          legendas                  legendas
              ↓                         ↓
              └────────────┬────────────┘
                           ↓
                      FINAL SHORT
33. Custos reais

A ideia é:

Item	Custo
Node.js	R$ 0
TypeScript	R$ 0
FFmpeg	R$ 0
Whisper local	R$ 0
Gemini Free	R$ 0
Zod	R$ 0
JSON	R$ 0
Git	R$ 0
Vercel	não necessário
Banco	não necessário

Total: R$ 0.

A ressalva é que "gratuito" significa dentro das cotas gratuitas do Gemini. O Google deixa claro que as cotas de RPM/TPM/RPD variam por projeto e podem mudar; portanto, o sistema precisa tratar 429 e continuar de onde parou.

34. A arquitetura que eu recomendo para você

Eu não começaria tentando fazer uma aplicação web.

Começaria assim:

                 CLIP MINER V1

                 video.mp4
                     │
                     ▼
              transcrição SRT
                     │
                     ▼
             ┌───────────────┐
             │ Segmentação   │
             │ 12m + 30s     │
             └───────┬───────┘
                     │
                     ▼
              Gemini Flash-Lite
                     │
                     ▼
              candidatos.json
                     │
                     ▼
                deduplicação
                     │
                     ▼
                ~50 candidatos
                     │
                     ▼
                Gemini Flash
                     │
                     ▼
                 TOP 10
                     │
                     ▼
                  FFmpeg
                     │
                     ▼
              10 vídeos .mp4

E depois:

V1
CLI
 ↓
V2
Whisper automático
 ↓
V3
legendas automáticas
 ↓
V4
9:16 automático
 ↓
V5
interface web local
 ↓
V6
fila de vídeos
 ↓
V7
integração YouTube/TikTok