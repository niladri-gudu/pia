export interface Chunk {
  content: string;
  chunkIndex: number;
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

export function chunkText(
  text: string,
  options: ChunkOptions = {},
): Chunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }

  if (chunkOverlap < 0) {
    throw new Error("chunkOverlap cannot be negative");
  }

  if (chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap must be smaller than chunkSize");
  }

  const normalizedText = text.trim();

  if (!normalizedText) {
    return [];
  }

  const chunks: Chunk[] = [];
  const step = chunkSize - chunkOverlap;

  for (let start = 0; start < normalizedText.length; start += step) {
    const content = normalizedText.slice(start, start + chunkSize).trim();

    if (!content) {
      continue;
    }

    chunks.push({
      content,
      chunkIndex: chunks.length,
    });

    if (start + chunkSize >= normalizedText.length) {
      break;
    }
  }

  return chunks;
}
