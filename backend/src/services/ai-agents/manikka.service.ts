import axios from 'axios';

/**
 * Manikka (Claude) API Service
 * All AI agents call this service for natural language generation
 * Runs inside Railway deployment - no extra infrastructure needed
 */

interface ManikkaOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' | 'text' };
  model?: string;
}

interface ManikkaResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

const MANIKKA_API_URL = process.env.MANIKKA_API_URL || 'https://api.anthropic.com/v1/messages';
const MANIKKA_API_KEY = process.env.MANIKKA_API_KEY;
const MANIKKA_MODEL = process.env.MANIKKA_MODEL || 'claude-3-haiku-20240307';

export const manikkaService = {
  /**
   * Generate text using Manikka (Claude) API
   */
  async generate(prompt: string, options: ManikkaOptions = {}): Promise<string> {
    const {
      temperature = 0.5,
      maxTokens = 500,
      responseFormat = { type: 'text' },
      model = MANIKKA_MODEL,
    } = options;

    if (!MANIKKA_API_KEY) {
      console.warn('[ManikkaService] API key not configured, returning fallback');
      throw new Error('Manikka API key not configured');
    }

    try {
      const response = await axios.post<{
        content: Array<{ type: 'text'; text: string }>;
        usage: { input_tokens: number; output_tokens: number };
      }>(
        MANIKKA_API_URL,
        {
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          ...(responseFormat.type === 'json_object' && {
            response_format: { type: 'json_object' },
          }),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': MANIKKA_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const content = response.data.content[0]?.text || '';
      
      console.log(`[ManikkaService] Generated ${response.data.usage.output_tokens} tokens`);
      
      return content;
    } catch (error: any) {
      console.error('[ManikkaService] API error:', error.message);
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        console.error('[ManikkaService] Rate limited - implement retry with backoff');
      }
      
      if (error.response?.status === 400) {
        console.error('[ManikkaService] Bad request:', error.response.data);
      }
      
      throw error;
    }
  },

  /**
   * Batch generate multiple prompts (for efficiency)
   */
  async generateBatch(prompts: string[], options: ManikkaOptions = {}): Promise<string[]> {
    // Process sequentially to avoid rate limits
    const results: string[] = [];
    
    for (const prompt of prompts) {
      try {
        const result = await this.generate(prompt, options);
        results.push(result);
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[ManikkaService] Batch item failed:`, error);
        results.push(''); // Push empty string for failed items
      }
    }
    
    return results;
  },

  /**
   * Check if Manikka service is available
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    
    try {
      await this.generate('Test', { maxTokens: 10 });
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return { healthy: false, latency: Date.now() - start };
    }
  },

  /**
   * Get token usage estimate
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  },
};

export default manikkaService;
