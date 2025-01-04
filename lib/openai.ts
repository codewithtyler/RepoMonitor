import OpenAI from 'openai';
import { RateLimiter } from 'limiter';

// Rate limits for text-embedding-3-small model:
// - 40,000 TPM (Tokens Per Minute)
// - 100 RPM (Requests Per Minute)
// - 2,000 RPD (Requests Per Day)
const requestLimiter = new RateLimiter({
  tokensPerInterval: 100, // 100 requests per minute
  interval: 'minute'
});

const dailyLimiter = new RateLimiter({
  tokensPerInterval: 2000, // 2000 requests per day
  interval: 'day'
});

class OpenAIClient {
  private client: OpenAI;
  private static instance: OpenAIClient;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey,
      maxRetries: 3,
      timeout: 30000,
    });
  }

  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  private async waitForRateLimit() {
    // Check both minute and daily limits
    const [remainingMinute, remainingDaily] = await Promise.all([
      requestLimiter.removeTokens(1),
      dailyLimiter.removeTokens(1)
    ]);

    // Handle minute limit
    if (remainingMinute < 0) {
      const waitTimeMinute = -remainingMinute * (60000 / 100); // Convert to milliseconds
      await new Promise(resolve => setTimeout(resolve, waitTimeMinute));
    }

    // Handle daily limit
    if (remainingDaily < 0) {
      throw new Error('Daily rate limit exceeded. Please try again tomorrow.');
    }
  }

  public async createEmbedding(text: string): Promise<number[]> {
    try {
      await this.waitForRateLimit();

      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      });

      return response.data[0].embedding;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        switch (error.status) {
          case 429:
            // Rate limit exceeded - wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.createEmbedding(text);
          case 500:
          case 502:
          case 503:
          case 504:
            // Server error - retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.createEmbedding(text);
          default:
            throw new Error(`OpenAI API error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  public async createEmbeddingBatch(texts: string[]): Promise<number[][]> {
    try {
      await this.waitForRateLimit();

      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: 1536,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        switch (error.status) {
          case 429:
            // Rate limit exceeded - wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.createEmbeddingBatch(texts);
          case 500:
          case 502:
          case 503:
          case 504:
            // Server error - retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 2000));
            return this.createEmbeddingBatch(texts);
          default:
            throw new Error(`OpenAI API error: ${error.message}`);
        }
      }
      throw error;
    }
  }
}

export const openai = OpenAIClient.getInstance();