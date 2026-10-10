import { spawn } from "node:child_process";
import { loadEnv } from "../config/env.js";
import { fileExists } from "./files.js";

function hasFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function preflight(videoPath: string, srtPath: string): Promise<string[]> {
  const errors: string[] = [];

  try {
    loadEnv();
  } catch (error) {
    errors.push((error as Error).message);
  }

  if (!(await fileExists(videoPath))) {
    errors.push(`Vídeo não encontrado: ${videoPath}`);
  }

  if (!(await fileExists(srtPath))) {
    errors.push(`Transcrição SRT não encontrada: ${srtPath}`);
  }

  if (!(await hasFfmpeg())) {
    errors.push("ffmpeg não encontrado no PATH.");
  }

  return errors;
}
