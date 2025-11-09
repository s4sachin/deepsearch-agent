"use client";

import { useState } from "react";
import type { TutorialContent } from "~/types/lesson";
import { ChevronLeft, ChevronRight, Check, Code2 } from "lucide-react";

export const TutorialRenderer = ({ content }: { content: TutorialContent }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(
    new Set()
  );

  // Sort sections by order
  const sortedSections = [...content.sections].sort((a, b) => a.order - b.order);
  const section = sortedSections[currentSection];

  const markComplete = () => {
    setCompletedSections(new Set([...completedSections, currentSection]));
    if (currentSection < sortedSections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const goToPrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const goToNext = () => {
    if (currentSection < sortedSections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>
            Section {currentSection + 1} of {sortedSections.length}
          </span>
          <span>
            {completedSections.size}/{sortedSections.length} completed
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(completedSections.size / sortedSections.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Section navigation tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sortedSections.map((sec, index) => (
          <button
            key={sec.id}
            onClick={() => setCurrentSection(index)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              index === currentSection
                ? "bg-blue-600 text-white"
                : completedSections.has(index)
                  ? "bg-green-600/20 text-green-400"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {completedSections.has(index) && (
                <Check className="h-4 w-4" />
              )}
              <span>{sec.title}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">
          {section?.title}
        </h2>

        {/* Content - render as simple text with basic formatting */}
        <div className="prose prose-invert prose-blue max-w-none text-gray-300 whitespace-pre-wrap">
          {section?.content}
        </div>

        {/* Code examples */}
        {section?.examples && section.examples.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Examples
            </h3>
            {section.examples.map((example, index) => (
              <div key={index} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                {example.explanation && (
                  <div className="px-4 py-3 bg-gray-800 text-gray-300 text-sm border-b border-gray-700">
                    💡 {example.explanation}
                  </div>
                )}
                <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                  <code>{example.code}</code>
                </pre>
                {example.language && (
                  <div className="px-4 py-2 bg-gray-800 text-xs text-gray-500 border-t border-gray-700">
                    Language: {example.language}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={goToPrevious}
          disabled={currentSection === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          Previous
        </button>

        {!completedSections.has(currentSection) && (
          <button
            onClick={markComplete}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Mark Complete
          </button>
        )}

        <button
          onClick={goToNext}
          disabled={currentSection === sortedSections.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Tutorial metadata */}
      <div className="mt-6 text-center text-sm text-gray-500 space-y-1">
        {content.estimatedReadTime && (
          <div>Estimated read time: {content.estimatedReadTime} minutes</div>
        )}
        {content.difficulty && (
          <div className="capitalize">Difficulty: {content.difficulty}</div>
        )}
      </div>
    </div>
  );
};
