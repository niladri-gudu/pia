export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;

  embed(text: string): Promise<number[]>;

  embedMany(texts: string[]): Promise<number[][]>;

  embedQuery(text: string): Promise<number[]>;

  embedDocuments(texts: string[]): Promise<number[][]>;
}
