import Link from "next/link";
import { MessageSquare, BookOpen, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-12 w-12 text-blue-500 animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
              Deep Search Agent
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
            AI-powered research assistant with two powerful modes
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Chat Agent Card */}
          <Link href="/chat">
            <div className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              
              <div className="relative">
                {/* Icon */}
                <div className="mb-6 flex items-center justify-center">
                  <div className="p-4 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-colors duration-300">
                    <MessageSquare className="h-12 w-12 text-blue-500" />
                  </div>
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-gray-100 mb-3 group-hover:text-blue-400 transition-colors">
                  Chat Agent
                </h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Ask questions and get research-backed answers. The agent searches the web, 
                  scrapes relevant content, and provides comprehensive responses.
                </p>

                {/* Features List */}
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Real-time web search & scraping</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Conversational interface</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Context-aware responses</span>
                  </li>
                </ul>

                {/* CTA Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                  <span className="text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors">
                    Start chatting
                  </span>
                  <svg
                    className="h-5 w-5 text-blue-500 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Lesson Generator Card */}
          <Link href="/lessons">
            <div className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer">
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              
              <div className="relative">
                {/* Icon */}
                <div className="mb-6 flex items-center justify-center">
                  <div className="p-4 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 transition-colors duration-300">
                    <BookOpen className="h-12 w-12 text-purple-500" />
                  </div>
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-gray-100 mb-3 group-hover:text-purple-400 transition-colors">
                  Lesson Generator
                </h2>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Create interactive educational content on any topic. Generate quizzes, 
                  tutorials, flashcards, and more with AI-powered research.
                </p>

                {/* Features List */}
                <ul className="space-y-2 mb-6">
                  <li className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-purple-500 mt-1">✓</span>
                    <span>Multiple content types</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-purple-500 mt-1">✓</span>
                    <span>Research-backed content</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-purple-500 mt-1">✓</span>
                    <span>Save & manage lessons</span>
                  </li>
                </ul>

                {/* CTA Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                  <span className="text-sm font-medium text-purple-400 group-hover:text-purple-300 transition-colors">
                    Create lesson
                  </span>
                  <svg
                    className="h-5 w-5 text-purple-500 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <p className="text-sm text-gray-600">
            Powered by advanced AI models and real-time web research
          </p>
        </div>
      </div>
    </div>
  );
}
