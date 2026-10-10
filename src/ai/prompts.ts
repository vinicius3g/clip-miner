import type { Candidate } from "../candidates/types.js";

function profileBlock(profile?: string): string {
  if (!profile) return "";

  return `
PERFIL DO CANAL

Priorize cortes alinhados a este perfil:
${profile}
`;
}

export function buildCandidatePrompt(transcript: string, profile?: string): string {
  return `
Você é um especialista em encontrar cortes virais para YouTube Shorts.

Você está analisando a transcrição de uma entrevista, podcast ou vídeo longo.
Cada linha começa com o timestamp inicial em segundos entre colchetes.
${profileBlock(profile)}
TRANSCRIÇÃO

${transcript}

OBJETIVO

Encontre TODOS os momentos com potencial para virar um Short independente.

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
3. Os campos start e end devem ser timestamps (em segundos) presentes na transcrição.
4. O candidato deve fazer sentido isoladamente.
5. Prefira trechos entre 25 e 60 segundos.
6. Não corte no meio de uma frase.
7. O início deve ter potencial de hook.
8. Seja generoso: prefira encontrar candidatos demais a deixar bons momentos passar.
9. O score (0 a 100) representa apenas o potencial relativo daquele candidato.

Retorne apenas os candidatos encontrados.
`;
}

export function buildRankingPrompt(
  candidates: Candidate[],
  topN: number,
  profile?: string
): string {
  return `
Você é um editor especialista em YouTube Shorts.

Abaixo estão candidatos encontrados automaticamente em um vídeo longo.
Sua tarefa é selecionar os ${topN} melhores.
${profileBlock(profile)}
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

Não escolha simplesmente os candidatos com maior pontuação original.
Faça uma nova análise.
Evite escolher vários cortes praticamente iguais.
Distribua os cortes pelo vídeo quando houver bons candidatos em diferentes partes.
Mantenha os valores de start e end exatamente como recebidos.

CANDIDATOS

${JSON.stringify(candidates, null, 2)}

Retorne os ${topN} melhores candidatos.
`;
}
