"use client";

import { useState } from "react";
import type { QuizContent } from "~/types/lesson";
import { Check, X, ChevronRight, RotateCcw } from "lucide-react";

export const QuizRenderer = ({ content }: { content: QuizContent }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const question = content.questions[currentQuestion];
  const hasAnswered = answers[question!.id] !== undefined;
  const isCorrect = hasAnswered && answers[question!.id] === question?.correctAnswer;

  const handleAnswer = (optionIndex: number) => {
    if (!hasAnswered) {
      setAnswers({ ...answers, [question!.id]: optionIndex });
    }
  };

  const handleNext = () => {
    if (currentQuestion < content.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    content.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: content.questions.length,
      percentage: Math.round((correct / content.questions.length) * 100),
    };
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  if (showResults) {
    const score = calculateScore();
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <h2 className="text-3xl font-bold text-gray-100 mb-4">
          Quiz Complete!
        </h2>
        <div className="bg-gray-800 rounded-lg p-8 mb-6">
          <div className="text-6xl font-bold text-blue-500 mb-2">
            {score.percentage}%
          </div>
          <p className="text-gray-400 text-lg">
            You got {score.correct} out of {score.total} questions correct
          </p>
        </div>

        <button
          onClick={resetQuiz}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RotateCcw className="h-5 w-5" />
          Retake Quiz
        </button>

        {/* Review answers */}
        <div className="mt-8 space-y-4 text-left">
          <h3 className="text-xl font-semibold text-gray-200 mb-4">Review</h3>
          {content.questions.map((q, index) => {
            const userAnswer = answers[q.id];
            const isCorrectAnswer = userAnswer === q.correctAnswer;
            return (
              <div
                key={q.id}
                className="bg-gray-800 rounded-lg p-4 border-l-4"
                style={{
                  borderLeftColor: isCorrectAnswer ? "#10b981" : "#ef4444",
                }}
              >
                <div className="font-medium text-gray-200 mb-2">
                  {index + 1}. {q.question}
                </div>
                <div className="text-sm text-gray-400 mb-1">
                  Your answer: {q.options[userAnswer!]}
                </div>
                {!isCorrectAnswer && (
                  <div className="text-sm text-green-400 mb-1">
                    Correct answer: {q.options[q.correctAnswer]}
                  </div>
                )}
                {q.explanation && (
                  <div className="text-sm text-gray-500 mt-2">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>
            Question {currentQuestion + 1} of {content.questions.length}
          </span>
          <span>
            {Object.keys(answers).length}/{content.questions.length} answered
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestion + 1) / content.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-2xl font-bold text-gray-100 mb-6">
        {question?.question}
      </h2>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question?.options.map((option, index) => {
          const isSelected = answers[question.id] === index;
          const isCorrectOption = index === question.correctAnswer;
          const showCorrect = hasAnswered && isCorrectOption;
          const showWrong = hasAnswered && isSelected && !isCorrectOption;

          return (
            <button
              key={index}
              onClick={() => handleAnswer(index)}
              disabled={hasAnswered}
              className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                hasAnswered
                  ? "cursor-not-allowed"
                  : "hover:border-blue-500 cursor-pointer"
              } ${
                showCorrect
                  ? "border-green-500 bg-green-500/10"
                  : showWrong
                    ? "border-red-500 bg-red-500/10"
                    : isSelected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-200">{option}</span>
                {showCorrect && <Check className="h-5 w-5 text-green-500" />}
                {showWrong && <X className="h-5 w-5 text-red-500" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {hasAnswered && question?.explanation && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <span className="text-blue-400">💡</span>
            <div className="text-gray-300">{question.explanation}</div>
          </div>
        </div>
      )}

      {/* Next button */}
      {hasAnswered && (
        <button
          onClick={handleNext}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          {currentQuestion === content.questions.length - 1
            ? "See Results"
            : "Next Question"}
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
