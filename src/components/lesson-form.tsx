"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const LessonForm = () => {
  const [outline, setOutline] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (outline.trim().length < 10) {
      setError("Outline must be at least 10 characters");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outline: outline.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate lesson");
      }

      const data = await response.json();
      
      // Clear form immediately since generation is happening in background
      setOutline("");
      setIsGenerating(false);

      // Refresh to show the new "generating" lesson in the table
      router.refresh();
      
      // Poll for updates every 3 seconds for up to 2 minutes
      const lessonId = data.lesson.id;
      let pollCount = 0;
      const maxPolls = 40; // 40 * 3s = 2 minutes
      
      const checkStatus = setInterval(async () => {
        pollCount++;
        
        // Refresh the page to update the table
        router.refresh();
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(checkStatus);
        }
      }, 3000); // Poll every 3 seconds
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="outline"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Lesson Outline
        </label>
        <textarea
          id="outline"
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          placeholder='Enter your lesson description (e.g., "A 10 question pop quiz on Florida" or "A tutorial on how to divide with long division")'
          className="w-full h-32 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isGenerating}
        />
        <p className="mt-1 text-xs text-gray-500">
          Minimum 10 characters. Be specific about what you want to learn.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isGenerating || outline.trim().length < 10}
        className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating Lesson...
          </span>
        ) : (
          "Generate Lesson"
        )}
      </button>
    </form>
  );
};
