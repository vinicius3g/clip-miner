import { readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import { loadEnv } from "../config/env.js";
import { parseSrt } from "../transcription/srt-parser.js";
import { mineCandidates } from "../ai/candidate-miner.js";
import { deduplicate } from "../candidates/deduplicate.js";
import { rankCandidates } from "../ai/candidate-ranker.js";
import { cutVideo } from "../video/cutter.js";
import { addUsage, emptyUsage, type Usage } from "../ai/usage.js";
import { ensureDir, fileExists, readJson, writeJson } from "../utils/files.js";
import { formatClock, slugify } from "../utils/format.js";
import { logger } from "../utils/logger.js";
import type { Candidate } from "../candidates/types.js";
import type { Transcript } from "../transcription/types.js";

export interface ReportClip {
  rank: number;
  start: number;
  end: number;
  duration: number;
  title: string;
  hook: string;
  category: string;
  score: number;
  file: string;
}

export interface Report {
  video: string;
  duration: number;
  totalCandidates: number;
  uniqueCandidates: number;
  selected: number;
  usedChunking: boolean;
  tokensUsed: Usage;
  clips: ReportClip[];
}

export async function processVideo(videoPath: string, srtPath: string): Promise<Report> {
  loadEnv();

  const name = basename(videoPath, extname(videoPath));
  const dataDir = join("data", name);
  const outputDir = join("output", name);
  const clipsDir = join(outputDir, "clips");

  await ensureDir(dataDir);
  await ensureDir(clipsDir);

  let usage = emptyUsage();

  // 1. Transcrição
  logger.step("1/5", "Transcrição (SRT)");
  const transcriptPath = join(dataDir, "transcript.json");
  let transcript: Transcript;

  if (await fileExists(transcriptPath)) {
    transcript = await readJson<Transcript>(transcriptPath);
  } else {
    transcript = parseSrt(await readFile(srtPath, "utf8"));
    await writeJson(transcriptPath, transcript);
  }
  logger.info(
    `${transcript.segments.length} segmentos, duração ${formatClock(transcript.duration)}`
  );

  // 2. Mineração
  logger.step("2/5", "Mineração de candidatos");
  const candidatesPath = join(dataDir, "candidates.json");
  let candidates: Candidate[];
  let usedChunking = false;

  if (await fileExists(candidatesPath)) {
    candidates = await readJson<Candidate[]>(candidatesPath);
    logger.info(`Reaproveitando ${candidates.length} candidatos`);
  } else {
    const mined = await mineCandidates(transcript);
    usage = addUsage(usage, mined.usage);
    usedChunking = mined.usedChunking;
    candidates = mined.candidates;
    await writeJson(candidatesPath, candidates);
    logger.info(
      `${candidates.length} candidatos (${usedChunking ? "chunking" : "single-call"})`
    );
  }

  // 3. Deduplicação
  logger.step("3/5", "Deduplicação");
  const unique = deduplicate(candidates);
  logger.info(`${candidates.length} → ${unique.length}`);

  // 4. Ranking
  logger.step("4/5", "Ranking final");
  const rankingPath = join(dataDir, "final-ranking.json");
  let best: Candidate[];

  if (await fileExists(rankingPath)) {
    best = await readJson<Candidate[]>(rankingPath);
    logger.info(`Reaproveitando ranking (${best.length})`);
  } else {
    const ranked = await rankCandidates(unique);
    usage = addUsage(usage, ranked.usage);
    best = ranked.candidates;
    await writeJson(rankingPath, best);
    logger.info(`TOP ${best.length} selecionados`);
  }

  // 5. Cortes
  logger.step("5/5", "Gerando cortes");
  const clips: ReportClip[] = [];

  for (const [index, candidate] of best.entries()) {
    const rank = index + 1;
    const slug = `${String(rank).padStart(2, "0")}-${slugify(candidate.category)}`;
    const file = join(clipsDir, `${slug}.mp4`);

    await cutVideo(videoPath, file, candidate.start, candidate.end);
    logger.info(
      `${slug} ${formatClock(candidate.start)} → ${formatClock(candidate.end)}`
    );

    clips.push({
      rank,
      start: candidate.start,
      end: candidate.end,
      duration: Math.round(candidate.end - candidate.start),
      title: candidate.title,
      hook: candidate.hook,
      category: candidate.category,
      score: candidate.score,
      file,
    });
  }

  const report: Report = {
    video: basename(videoPath),
    duration: transcript.duration,
    totalCandidates: candidates.length,
    uniqueCandidates: unique.length,
    selected: best.length,
    usedChunking,
    tokensUsed: usage,
    clips,
  };

  await writeJson(join(outputDir, "report.json"), report);
  logger.info("Concluído.");

  return report;
}
