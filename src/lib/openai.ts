import OpenAI from 'openai';
import { RateLimiter } from 'limiter';

// Rate limiter: 10K TPM (tokens per minute)
const rateLimiter = new RateLimiter({
  tokensPerInterval: 10000,
  interval: 'minute'
});

const configuration = {
  apiKey: process.env.OPENAI_API_KEY
};

const openaiApi = new OpenAI(configuration);

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openaiApi.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
}

export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    this.client = openaiApi;
  }

  private async waitForRateLimit(tokens: number): Promise<void> {
    const remainingTokens = await rateLimiter.removeTokens(tokens);
    if (remainingTokens < 0) {
      const waitTime = -remainingTokens * (60000 / 10000); // Convert to milliseconds
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, tokens: number): Promise<T> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.waitForRateLimit(tokens);
        return await operation();
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;

        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    // Estimate tokens (roughly 4 tokens per word)
    const estimatedTokens = texts.reduce((sum, text) => sum + text.split(/\s+/).length * 4, 0);

    const response = await this.withRetry(
      () => this.client.embeddings.create({
        model: "text-embedding-ada-002",
        input: texts
      }),
      estimatedTokens
    );

    return response.data.map(item => item.embedding);
  }

  // Helper to preprocess text before embedding
  preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/[^\w\s-]/g, '')       // Remove special characters except hyphens
      .trim()                         // Remove leading/trailing whitespace
      .toLowerCase();                 // Convert to lowercase
  }
}

// Export singleton instance
export const openaiClient = new OpenAIClient();
