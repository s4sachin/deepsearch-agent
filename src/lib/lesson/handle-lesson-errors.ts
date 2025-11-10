import type { AgentContext } from "../unified/agent-context";
import type { LessonType } from "~/types/lesson";
import { ZodError } from "zod";

// Type for contexts that support structured content generation
// Previously supported both LessonContext and AgentContext, now unified to AgentContext
type StructuredContext = AgentContext;

export interface LessonErrorInfo {
  type: "validation" | "generation" | "research" | "timeout" | "unknown";
  message: string;
  details?: unknown;
  recoverable: boolean;
  suggestedAction?: string;
}

/**
 * Parse and categorize errors from lesson generation
 * Determines if error is recoverable and suggests next action
 */
export function handleLessonError(
  error: unknown,
  context: StructuredContext
): LessonErrorInfo {
  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      type: "validation",
      message: `Content validation failed: ${error.errors[0]?.message ?? "Unknown error"}`,
      details: error.errors,
      recoverable: true,
      suggestedAction: "refine_content",
    };
  }

  // API errors (rate limits, network issues)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit errors
    if (message.includes("rate limit") || message.includes("429")) {
      return {
        type: "generation",
        message: "Rate limit exceeded",
        details: error,
        recoverable: false,
        suggestedAction: "retry_later",
      };
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("aborted")) {
      return {
        type: "timeout",
        message: "Request timed out",
        details: error,
        recoverable: true,
        suggestedAction: "retry",
      };
    }

    // Network errors
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("econnrefused")
    ) {
      return {
        type: "research",
        message: "Network error during research",
        details: error,
        recoverable: true,
        suggestedAction: "skip_research",
      };
    }

    // Content generation errors
    if (
      message.includes("generation") ||
      message.includes("model") ||
      message.includes("gemini")
    ) {
      return {
        type: "generation",
        message: `Content generation failed: ${error.message}`,
        details: error,
        recoverable: true,
        suggestedAction: "retry",
      };
    }

    // Generic error with message
    return {
      type: "unknown",
      message: error.message,
      details: error,
      recoverable: true,
      suggestedAction: "retry",
    };
  }

  // Unknown error type
  return {
    type: "unknown",
    message: "An unexpected error occurred",
    details: error,
    recoverable: false,
  };
}

/**
 * Determine if we should retry after an error
 * Considers error type, retry count, and context state
 */
export function shouldRetryAfterError(
  errorInfo: LessonErrorInfo,
  context: StructuredContext,
  maxRetries = 2
): boolean {
  // Don't retry if not recoverable
  if (!errorInfo.recoverable) {
    return false;
  }

  // Don't retry if we've hit max retries
  if (context.getRetryCount() >= maxRetries) {
    return false;
  }

  // Don't retry if we're out of steps
  if (context.shouldStop()) {
    return false;
  }

  // Retry for specific error types
  if (
    errorInfo.type === "validation" ||
    errorInfo.type === "timeout" ||
    errorInfo.type === "generation"
  ) {
    return true;
  }

  return false;
}

/**
 * Generate error recovery strategy
 * Decides what to do after an error based on context
 */
export function getErrorRecoveryStrategy(
  errorInfo: LessonErrorInfo,
  context: StructuredContext
): {
  action: "retry" | "skip_research" | "simplify" | "fallback" | "abort";
  reason: string;
} {
  // If we have content already, we can complete
  if (context.hasContent()) {
    return {
      action: "fallback",
      reason: "Using previously generated content",
    };
  }

  // For validation errors, try to refine
  if (errorInfo.type === "validation") {
    if (context.getRetryCount() < 2) {
      return {
        action: "retry",
        reason: "Will refine content to fix validation errors",
      };
    } else {
      return {
        action: "simplify",
        reason: "Too many validation failures, simplifying requirements",
      };
    }
  }

  // For research errors, skip research and generate without it
  if (errorInfo.type === "research") {
    return {
      action: "skip_research",
      reason: "Research failed, will generate from topic only",
    };
  }

  // For timeouts, retry once
  if (errorInfo.type === "timeout") {
    if (context.getRetryCount() < 1) {
      return {
        action: "retry",
        reason: "Request timed out, retrying",
      };
    } else {
      return {
        action: "simplify",
        reason: "Timeout persists, reducing complexity",
      };
    }
  }

  // For generation errors, retry with simplified prompt
  if (errorInfo.type === "generation") {
    if (context.getRetryCount() < 2) {
      return {
        action: "retry",
        reason: "Generation failed, retrying",
      };
    } else {
      return {
        action: "simplify",
        reason: "Generation failing repeatedly, simplifying",
      };
    }
  }

  // Unknown errors or non-recoverable - abort
  return {
    action: "abort",
    reason: errorInfo.message,
  };
}

/**
 * Simplify lesson requirements after repeated failures
 * Reduces complexity to increase success chance
 */
export function simplifyLessonRequirements(
  outline: string,
  lessonType: LessonType | undefined
): {
  simplifiedOutline: string;
  reducedLength: boolean;
} {
  const lines = outline.split("\n").filter((line) => line.trim().length > 0);

  // Reduce to max 3 main points
  const simplifiedLines = lines.slice(0, 3);

  // Add instruction to keep it simple
  const simplifiedOutline = [
    ...simplifiedLines,
    "",
    "Note: Keep the content concise and focused on core concepts only.",
  ].join("\n");

  // Adjust expectations based on lesson type
  let typeSpecificNote = "";
  if (lessonType === "quiz") {
    typeSpecificNote = "Generate 3-5 questions only.";
  } else if (lessonType === "tutorial") {
    typeSpecificNote = "Focus on 1-2 main code examples.";
  } else if (lessonType === "flashcard") {
    typeSpecificNote = "Create 5-8 flashcards only.";
  }

  return {
    simplifiedOutline: `${simplifiedOutline}\n${typeSpecificNote}`,
    reducedLength: true,
  };
}

/**
 * Log error for debugging and monitoring
 * Sends to console and could send to observability platform
 */
export function logLessonError(
  errorInfo: LessonErrorInfo,
  context: StructuredContext
): void {
  // Error logging removed for production
}
