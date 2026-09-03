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

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitIntoSentences(text: string): string[] {
  return (
    text
      .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? []
  );
}

function splitLongText(text: string, chunkSize: number): string[] {
  const sentences = splitIntoSentences(text);

  if (sentences.length <= 1) {
    const chunks: string[] = [];

    for (let start = 0; start < text.length; start += chunkSize) {
      const chunk = text.slice(start, start + chunkSize).trim();

      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > chunkSize) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      for (let start = 0; start < sentence.length; start += chunkSize) {
        const chunk = sentence.slice(start, start + chunkSize).trim();

        if (chunk) {
          chunks.push(chunk);
        }
      }

      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current);
      }

      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
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

  const paragraphs = splitIntoParagraphs(normalizedText);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      chunks.push(...splitLongText(paragraph, chunkSize));
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      chunks.push(current);
      current = paragraph;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((content, chunkIndex) => ({
    content,
    chunkIndex,
  }));
}
