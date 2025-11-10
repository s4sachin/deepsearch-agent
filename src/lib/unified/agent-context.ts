/**
 * Unified Agent Context
 * Merges SystemContext (chat) and LessonContext (structured content)
 * Supports both conversational Q&A and structured content generation
 */

import type { UIMessage } from "ai";
import type { LessonType, LessonContent } from "~/types/lesson";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type OutputMode = "chat" | "structured";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  date?: string;
};

export type QueryResult = {
  query: string;
  results: SearchResult[];
  timestamp: Date;
};

export type ScrapedContent = {
  url: string;
  content: string;
  metadata?: {
    title?: string;
    author?: string;
    date?: string;
  };
  timestamp: Date;
};

export type Refinement = {
  attemptNumber: number;
  feedback: string;
  improvedContent: LessonContent;
  timestamp: Date;
};

export type GenerationAttempt = {
  attemptNumber: number;
  content?: LessonContent;
  errors?: string[];
  timestamp: Date;
};

// ============================================================================
// UNIFIED AGENT CONTEXT CLASS
// ============================================================================

export class AgentContext {
  // ========== Common State (Used by Both Modes) ==========
  
  /**
   * Current step in the agent loop
   */
  private step = 0;

  /**
   * Maximum steps before forcing completion
   */
  private maxSteps: number;

  /**
   * Conversation messages (chat mode) or initial outline (structured mode)
   */
  private messages: UIMessage[];

  /**
   * Search history (queries and results)
   */
  private searchHistory: QueryResult[] = [];

  /**
   * Scraped content history
   */
  private scrapedContent: ScrapedContent[] = [];

  /**
   * Number of retry attempts
   */
  private retries = 0;

  /**
   * Output mode: chat or structured
   */
  private readonly outputMode: OutputMode;

  // ========== Structured Content State (Only for Structured Mode) ==========

  /**
   * Determined content type (quiz, tutorial, flashcard)
   */
  private contentType?: LessonType;

  /**
   * Generated title for structured content
   */
  private title?: string;

  /**
   * Generated description for structured content
   */
  private description?: string;

  /**
   * Generated structured content
   */
  private generatedContent?: LessonContent;

  /**
   * History of refinement attempts
   */
  private refinementHistory: Refinement[] = [];

  /**
   * History of generation attempts (for debugging)
   */
  private generationAttempts: GenerationAttempt[] = [];

  // ========== Constructor ==========

  constructor(options: {
    messages: UIMessage[];
    outputMode: OutputMode;
    maxSteps?: number;
  }) {
    this.messages = options.messages;
    this.outputMode = options.outputMode;
    
    // Set default max steps based on mode
    // Chat: 10 steps (search, scrape, answer pattern)
    // Structured: 15 steps (search, scrape, determine_type, generate with retries, refine, complete)
    this.maxSteps = options.maxSteps ?? (options.outputMode === "chat" ? 10 : 15);
  }

  // ========== Mode Checking ==========

  isChat(): boolean {
    return this.outputMode === "chat";
  }

  isStructured(): boolean {
    return this.outputMode === "structured";
  }

  getOutputMode(): OutputMode {
    return this.outputMode;
  }

  // ========== Common Methods (Both Modes) ==========

  shouldStop(): boolean {
    // For structured mode, dynamically adjust max steps based on complexity
    if (this.isStructured()) {
      this.maxSteps = this.calculateMaxSteps();
    }
    return this.step >= this.maxSteps;
  }

  incrementStep(): void {
    this.step++;
  }

  getStep(): number {
    return this.step;
  }

  incrementRetry(): void {
    this.retries++;
  }

  getRetryCount(): number {
    return this.retries;
  }

  // ========== Message Management ==========

  getMessages(): UIMessage[] {
    return this.messages;
  }

  getMessageHistory(): string {
    return this.messages
      .map((message) => {
        const role = message.role.toUpperCase();
        // Extract text content from parts
        const textParts = message.parts
          ?.filter((part) => part.type === "text")
          .map((part) => ("text" in part ? part.text : ""))
          .join("\n");
        const content = textParts || "";
        return `<message role="${role}">\n${content}\n</message>`;
      })
      .join("\n\n");
  }

  /**
   * Get the user's question/outline
   * For chat: last user message
   * For structured: first message content (the outline)
   */
  getUserQuery(): string {
    if (this.isChat()) {
      // Get last user message
      const lastUserMsg = [...this.messages]
        .reverse()
        .find((m) => m.role === "user");
      
      if (!lastUserMsg) return "";
      
      const textParts = lastUserMsg.parts
        ?.filter((part) => part.type === "text")
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n");
      
      return textParts || "";
    } else {
      // For structured, first message is the outline
      const firstMsg = this.messages[0];
      if (!firstMsg) return "";
      
      const textParts = firstMsg.parts
        ?.filter((part) => part.type === "text")
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n");
      
      return textParts || "";
    }
  }

  // ========== Search & Research Management ==========

  addSearchResults(query: string, results: SearchResult[]): void {
    this.searchHistory.push({
      query,
      results,
      timestamp: new Date(),
    });
  }

  getSearchHistory(): QueryResult[] {
    return this.searchHistory;
  }

  getSearchHistoryFormatted(): string {
    if (this.searchHistory.length === 0) {
      return "";
    }

    return this.searchHistory
      .map((queryResult) => {
        const results = queryResult.results
          .map((result) => {
            const dateStr = result.date ? `${result.date} - ` : "";
            return `### ${dateStr}${result.title}\n${result.url}\n${result.snippet}`;
          })
          .join("\n\n");
        
        return `## Query: "${queryResult.query}"\n\n${results}`;
      })
      .join("\n\n---\n\n");
  }

  addScrapedContent(scraped: ScrapedContent[]): void {
    this.scrapedContent.push(...scraped);
  }

  getScrapedContent(): ScrapedContent[] {
    return this.scrapedContent;
  }

  getScrapedContentFormatted(): string {
    if (this.scrapedContent.length === 0) {
      return "";
    }

    return this.scrapedContent
      .map((scrape) => {
        const metadata = scrape.metadata
          ? `**Title**: ${scrape.metadata.title ?? "N/A"}\n**Author**: ${scrape.metadata.author ?? "N/A"}\n**Date**: ${scrape.metadata.date ?? "N/A"}\n\n`
          : "";
        
        return `## Scrape: "${scrape.url}"\n\n${metadata}<scrape_result>\n${scrape.content}\n</scrape_result>`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Get research summary formatted for prompts
   */
  getResearchSummary(): string {
    const parts: string[] = [];

    if (this.searchHistory.length > 0) {
      parts.push(`# Search Results\n\n${this.getSearchHistoryFormatted()}`);
    }

    if (this.scrapedContent.length > 0) {
      parts.push(`# Scraped Content\n\n${this.getScrapedContentFormatted()}`);
    }

    return parts.length > 0
      ? parts.join("\n\n===\n\n")
      : "No research conducted yet.";
  }

  // ========== Structured Content Methods (Only for Structured Mode) ==========

  setContentType(type: LessonType): void {
    this.contentType = type;
  }

  getContentType(): LessonType | undefined {
    return this.contentType;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  getTitle(): string | undefined {
    return this.title;
  }

  setDescription(description: string): void {
    this.description = description;
  }

  getDescription(): string | undefined {
    return this.description;
  }

  setContent(content: LessonContent): void {
    this.generatedContent = content;
  }

  getContent(): LessonContent | undefined {
    return this.generatedContent;
  }

  hasContent(): boolean {
    return this.generatedContent !== undefined;
  }

  recordGenerationAttempt(opts: {
    content?: LessonContent;
    errors?: string[];
  }): void {
    this.generationAttempts.push({
      attemptNumber: this.generationAttempts.length + 1,
      content: opts.content,
      errors: opts.errors,
      timestamp: new Date(),
    });
  }

  getGenerationAttempts(): GenerationAttempt[] {
    return this.generationAttempts;
  }

  getPreviousErrors(): string[] {
    return this.generationAttempts
      .flatMap((attempt) => attempt.errors ?? [])
      .filter((error) => error.length > 0);
  }

  recordRefinement(feedback: string, improvedContent: LessonContent): void {
    this.refinementHistory.push({
      attemptNumber: this.refinementHistory.length + 1,
      feedback,
      improvedContent,
      timestamp: new Date(),
    });
  }

  getRefinementHistory(): Refinement[] {
    return this.refinementHistory;
  }

  /**
   * Calculate dynamic max steps for structured mode
   * Allows more steps for complex topics with research and refinements
   */
  private calculateMaxSteps(): number {
    // Base max steps is 15 (set in constructor)
    let maxSteps = 15;
    
    // If we have research or refinements, allow even more steps
    const hasResearch =
      this.searchHistory.length > 0 || this.scrapedContent.length > 0;
    const hasRefinements = this.refinementHistory.length > 0;

    if (hasResearch && hasRefinements) {
      maxSteps = 20; // Complex topic with research and quality iterations
    } else if (hasResearch || hasRefinements) {
      maxSteps = 15; // Default with some complexity
    }

    return maxSteps;
  }

  // ========== Summary & Debugging ==========

  getSummary(): string {
    const mode = this.outputMode.toUpperCase();
    
    let summary = `
Agent Context Summary (${mode} MODE):
- Step: ${this.step}/${this.maxSteps}
- Search Queries: ${this.searchHistory.length}
- Scraped Pages: ${this.scrapedContent.length}
- Retries: ${this.retries}
    `.trim();

    if (this.isStructured()) {
      summary += `
- Content Type: ${this.contentType ?? "Not determined"}
- Title: ${this.title ?? "Not generated"}
- Generation Attempts: ${this.generationAttempts.length}
- Refinements: ${this.refinementHistory.length}
- Content Generated: ${this.hasContent() ? "Yes" : "No"}
      `.trim();
    } else {
      summary += `
- Messages: ${this.messages.length}
      `.trim();
    }

    return summary;
  }
}
