import { spawn } from "node:child_process";

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
      start.toFixed(3),
      "-i",
      input,
      "-t",
      duration.toFixed(3),
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      output,
    ];

    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg terminou com código ${code}`));
      }
    });
  });
}
