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
