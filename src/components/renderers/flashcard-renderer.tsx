"use client";

import { useState, useMemo } from "react";
import type { FlashcardContent } from "~/types/lesson";
import {
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Shuffle,
  Grid3x3,
} from "lucide-react";

export const FlashcardRenderer = ({
  content,
}: {
  content: FlashcardContent;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(content.cards.map((card) => card.category));
    return Array.from(cats).filter(Boolean);
  }, [content.cards]);

  // Filter and sort cards
  const displayCards = useMemo(() => {
    let cards = content.cards;

    // Filter by category
    if (selectedCategory) {
      cards = cards.filter((card) => card.category === selectedCategory);
    }

    // Shuffle if enabled
    if (isShuffled) {
      cards = [...cards].sort(() => Math.random() - 0.5);
    }

    return cards;
  }, [content.cards, selectedCategory, isShuffled]);

  const currentCard = displayCards[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped && !studiedCards.has(currentIndex)) {
      setStudiedCards(new Set([...studiedCards, currentIndex]));
    }
  };

  const handleNext = () => {
    if (currentIndex < displayCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleKnown = (known: boolean) => {
    const newKnownCards = new Set(knownCards);
    if (known) {
      newKnownCards.add(currentIndex);
    } else {
      newKnownCards.delete(currentIndex);
    }
    setKnownCards(newKnownCards);
    handleNext();
  };

  const toggleShuffle = () => {
    setIsShuffled(!isShuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const resetProgress = () => {
    setStudiedCards(new Set());
    setKnownCards(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>
            Card {currentIndex + 1} of {displayCards.length}
          </span>
          <span>
            Studied: {studiedCards.size}/{displayCards.length}
          </span>
          <span>
            Known: {knownCards.size}/{displayCards.length}
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(studiedCards.size / displayCards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedCategory
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              All ({content.cards.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat ?? null);
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {cat} (
                {content.cards.filter((c) => c.category === cat).length})
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={toggleShuffle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isShuffled
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            <Shuffle className="h-4 w-4" />
            Shuffle
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            <Grid3x3 className="h-4 w-4" />
            {showGrid ? "Card View" : "Grid View"}
          </button>
          <button
            onClick={resetProgress}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {showGrid ? (
        /* Grid view */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayCards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => {
                setCurrentIndex(index);
                setShowGrid(false);
                setIsFlipped(false);
              }}
              className={`relative p-4 rounded-lg text-left transition-all ${
                index === currentIndex
                  ? "bg-blue-600 text-white ring-2 ring-blue-400"
                  : knownCards.has(index)
                    ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                    : studiedCards.has(index)
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <div className="text-xs font-medium mb-2">
                {card.category || "General"}
              </div>
              <div className="text-sm font-semibold line-clamp-3">
                {card.front}
              </div>
              {knownCards.has(index) && (
                <Check className="absolute top-2 right-2 h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      ) : (
        /* Card view */
        <>
          {/* Main flashcard */}
          <div
            onClick={handleFlip}
            className="relative h-96 mb-6 cursor-pointer perspective-1000"
            style={{ perspective: "1000px" }}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                isFlipped ? "rotate-y-180" : ""
              }`}
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front of card */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 flex flex-col justify-center items-center text-center backface-hidden"
                style={{ backfaceVisibility: "hidden" }}
              >
                {currentCard?.category && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {currentCard.category}
                  </div>
                )}
                <div className="text-2xl font-bold text-white mb-4">
                  {currentCard?.front}
                </div>
                <div className="text-sm text-blue-100 mt-4">
                  Click to flip
                </div>
              </div>

              {/* Back of card */}
              <div
                className="absolute w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-8 flex flex-col justify-center items-center text-center backface-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="text-xl text-gray-200">
                  {currentCard?.back}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation and feedback buttons */}
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </button>

            {isFlipped && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleKnown(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                  Still Learning
                </button>
                <button
                  onClick={() => handleKnown(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Check className="h-5 w-5" />I Know This
                </button>
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={currentIndex === displayCards.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      {/* Study stats */}
      {studiedCards.size === displayCards.length && (
        <div className="mt-8 p-6 bg-green-600/20 border border-green-500/30 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-400 mb-2">
            🎉 All cards studied!
          </div>
          <div className="text-gray-300 mb-4">
            You marked {knownCards.size} out of {displayCards.length} as known
            (
            {Math.round((knownCards.size / displayCards.length) * 100)}%)
          </div>
          <button
            onClick={resetProgress}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Study Again
          </button>
        </div>
      )}
    </div>
  );
};
