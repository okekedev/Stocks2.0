// src/services/ArticleFetcher.js - Fixed with better error handling and fallbacks
class ArticleFetcher {
  constructor() {
    // Using Jina Reader API for web scraping
    this.jinaReaderUrl = 'https://r.jina.ai/';
    this.cache = new Map(); // Simple cache to avoid re-fetching
  }

  // Fetch article content using Jina Reader with fallbacks
  async fetchArticleContent(articleUrl) {
    // Check cache first
    if (this.cache.has(articleUrl)) {
      console.log(`[CACHE] Using cached content for ${articleUrl}`);
      return this.cache.get(articleUrl);
    }

    try {
      console.log(`[INFO] Fetching article content: ${articleUrl}`);
      
      // Try Jina Reader first
      const jinaUrl = `${this.jinaReaderUrl}${articleUrl}`;
      
      const response = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'StockAnalyzer/1.0'
        }
      });

      // ✅ Handle specific error codes better
      if (response.status === 451) {
        console.warn(`[WARN] Jina Reader blocked for legal reasons: ${articleUrl}`);
        return this.createFallbackContent(articleUrl, 'Content blocked for legal reasons');
      }

      if (response.status === 429) {
        console.warn(`[WARN] Jina Reader rate limited: ${articleUrl}`);
        return this.createFallbackContent(articleUrl, 'Rate limited - using summary only');
      }

      if (!response.ok) {
        console.warn(`[WARN] Jina Reader failed (${response.status}): ${articleUrl}`);
        return this.createFallbackContent(articleUrl, `HTTP ${response.status} error`);
      }

      const content = await response.text();
      
      // ✅ Validate content
      if (!content || content.trim().length < 50) {
        console.warn(`[WARN] Jina Reader returned insufficient content: ${articleUrl}`);
        return this.createFallbackContent(articleUrl, 'Insufficient content returned');
      }
      
      // Clean up the content
      const cleanContent = this.cleanContent(content);
      
      // Cache the result (limit cache size)
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(articleUrl, cleanContent);
      
      console.log(`[SUCCESS] Fetched ${cleanContent.content.length} characters from article`);
      return cleanContent;
      
    } catch (error) {
      console.error(`[ERROR] Failed to fetch article content:`, error);
      // ✅ Always return valid fallback content
      return this.createFallbackContent(articleUrl, error.message);
    }
  }

  // ✅ NEW: Create consistent fallback content structure
  createFallbackContent(articleUrl, reason) {
    const fallbackContent = {
      content: `Article content unavailable (${reason}). Analysis will use news summary only.`,
      title: 'Article Content Unavailable',
      wordCount: 0,
      success: false,
      error: reason,
      fallback: true
    };

    // Cache the fallback to avoid repeated failed requests
    this.cache.set(articleUrl, fallbackContent);
    
    return fallbackContent;
  }

  // Clean and structure the content
  cleanContent(rawContent) {
    try {
      // Remove excessive whitespace and clean up
      let cleaned = rawContent
        .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
        .replace(/\s{3,}/g, ' ') // Reduce multiple spaces
        .trim();

      // Extract key parts (assuming Jina Reader returns structured content)
      const lines = cleaned.split('\n');
      let title = '';
      let content = '';
      
      // Try to find title (usually first substantial line)
      for (const line of lines) {
        if (line.trim().length > 10 && !title) {
          title = line.trim();
          break;
        }
      }
      
      // Get main content (limit to reasonable length for AI)
      content = cleaned.substring(0, 4000); // Limit to ~4000 chars for AI processing
      
      return {
        content,
        title: title || 'Article',
        wordCount: content.split(' ').length,
        success: true
      };
      
    } catch (error) {
      console.error('[ERROR] Failed to clean content:', error);
      return {
        content: rawContent.substring(0, 2000),
        title: 'Article',
        wordCount: 0,
        success: false,
        error: error.message
      };
    }
  }

  // Alternative method using a CORS proxy (fallback)
  async fetchWithProxy(articleUrl) {
    try {
      // Using a public CORS proxy (for testing only)
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`;
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (data.contents) {
        // Basic HTML text extraction
        const textContent = this.extractTextFromHtml(data.contents);
        return {
          content: textContent.substring(0, 4000),
          title: 'Article Content',
          wordCount: textContent.split(' ').length,
          success: true
        };
      }
      
      throw new Error('No content returned from proxy');
      
    } catch (error) {
      console.error('[ERROR] Proxy fetch failed:', error);
      return this.createFallbackContent(articleUrl, 'Proxy fetch failed');
    }
  }

  // Simple HTML text extraction
  extractTextFromHtml(html) {
    try {
      // Create a temporary DOM element to extract text
      const temp = document.createElement('div');
      temp.innerHTML = html;
      
      // Remove script and style elements
      const scripts = temp.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      // Get text content
      return temp.textContent || temp.innerText || '';
    } catch (error) {
      console.error('[ERROR] HTML text extraction failed:', error);
      return '';
    }
  }

  // Batch fetch multiple articles
  async fetchMultipleArticles(articles, maxConcurrent = 3) {
    const results = [];
    
    // Process in batches to avoid rate limiting
    for (let i = 0; i < articles.length; i += maxConcurrent) {
      const batch = articles.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (article) => {
        const content = await this.fetchArticleContent(article.articleUrl);
        return {
          ...article,
          fullContent: content
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + maxConcurrent < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }
}

export const articleFetcher = new ArticleFetcher();