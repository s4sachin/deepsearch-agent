import type { LessonType, LessonContent } from "~/types/lesson";

type ResearchNote = {
  query: string;
  summary: string;
  sources: string[];
};

type GenerationAttempt = {
  attemptNumber: number;
  content?: LessonContent;
  errors?: string[];
  timestamp: Date;
};

/**
 * LessonContext manages the state during lesson generation
 * Tracks the lesson outline, research, generation attempts, and progress
 */
export class LessonContext {
  /**
   * The current step in the generation loop
   */
  private step = 0;

  /**
   * Maximum steps allowed before forcing completion
   */
  private readonly maxSteps = 5;

  /**
   * The user's original lesson outline/description
   */
  private readonly outline: string;

  /**
   * Determined lesson type (quiz, tutorial, flashcard, etc.)
   */
  private lessonType?: LessonType;

  /**
   * Generated title for the lesson
   */
  private title?: string;

  /**
   * Generated description for the lesson
   */
  private description?: string;

  /**
   * Research notes gathered during generation
   */
  private researchNotes: ResearchNote[] = [];

  /**
   * History of all generation attempts (for debugging and retry logic)
   */
  private generationAttempts: GenerationAttempt[] = [];

  /**
   * Final generated content (if successful)
   */
  private content?: LessonContent;

  constructor(outline: string) {
    this.outline = outline;
  }

  /**
   * Check if we should stop the generation loop
   */
  shouldStop(): boolean {
    return this.step >= this.maxSteps;
  }

  /**
   * Increment the step counter
   */
  incrementStep(): void {
    this.step++;
  }

  /**
   * Get the current step number
   */
  getStep(): number {
    return this.step;
  }

  /**
   * Get the user's original outline
   */
  getOutline(): string {
    return this.outline;
  }

  /**
   * Set the determined lesson type
   */
  setLessonType(type: LessonType): void {
    this.lessonType = type;
  }

  /**
   * Get the determined lesson type
   */
  getLessonType(): LessonType | undefined {
    return this.lessonType;
  }

  /**
   * Set the generated title
   */
  setTitle(title: string): void {
    this.title = title;
  }

  /**
   * Get the generated title
   */
  getTitle(): string | undefined {
    return this.title;
  }

  /**
   * Set the generated description
   */
  setDescription(description: string): void {
    this.description = description;
  }

  /**
   * Get the generated description
   */
  getDescription(): string | undefined {
    return this.description;
  }

  /**
   * Add a research note
   */
  addResearchNote(note: ResearchNote): void {
    this.researchNotes.push(note);
  }

  /**
   * Get all research notes
   */
  getResearchNotes(): ResearchNote[] {
    return this.researchNotes;
  }

  /**
   * Get research notes as a formatted string for prompts
   */
  getResearchNotesFormatted(): string {
    if (this.researchNotes.length === 0) {
      return "No research notes available.";
    }

    return this.researchNotes
      .map((note) => {
        const sources = note.sources.map((s) => `- ${s}`).join("\n");
        return `## Research Query: "${note.query}"\n\n${note.summary}\n\n### Sources:\n${sources}`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Record a generation attempt
   */
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

  /**
   * Get the number of generation attempts so far
   */
  getAttemptCount(): number {
    return this.generationAttempts.length;
  }

  /**
   * Get all generation attempts
   */
  getGenerationAttempts(): GenerationAttempt[] {
    return this.generationAttempts;
  }

  /**
   * Get errors from all previous attempts (for retry feedback)
   */
  getPreviousErrors(): string[] {
    return this.generationAttempts
      .flatMap((attempt) => attempt.errors ?? [])
      .filter((error) => error.length > 0);
  }

  /**
   * Set the final generated content
   */
  setContent(content: LessonContent): void {
    this.content = content;
  }

  /**
   * Get the final generated content
   */
  getContent(): LessonContent | undefined {
    return this.content;
  }

  /**
   * Check if content has been successfully generated
   */
  hasContent(): boolean {
    return this.content !== undefined;
  }

  /**
   * Get a summary of the context for debugging
   */
  getSummary(): string {
    return `
Lesson Generation Context Summary:
- Step: ${this.step}/${this.maxSteps}
- Outline: "${this.outline}"
- Type: ${this.lessonType ?? "Not determined"}
- Title: ${this.title ?? "Not generated"}
- Research Notes: ${this.researchNotes.length}
- Generation Attempts: ${this.generationAttempts.length}
- Content Generated: ${this.hasContent() ? "Yes" : "No"}
    `.trim();
  }
}
