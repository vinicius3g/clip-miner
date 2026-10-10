import { extname } from "node:path";
import { processVideo } from "../pipeline/process-video.js";
import { preflight } from "../utils/preflight.js";
import { logger } from "../utils/logger.js";

async function main(): Promise<void> {
  const [videoArg, srtArg] = process.argv.slice(2);

  if (!videoArg) {
    logger.error("Uso: npm run dev -- <video.mp4> [transcricao.srt]");
    process.exit(1);
  }

  const srtPath = srtArg ?? videoArg.replace(new RegExp(`${extname(videoArg)}$`), ".srt");

  logger.banner("CLIP MINER");

  const errors = await preflight(videoArg, srtPath);

  if (errors.length > 0) {
    for (const error of errors) logger.error(error);
    process.exit(1);
  }

  try {
    await processVideo(videoArg, srtPath);
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }
}

main();
