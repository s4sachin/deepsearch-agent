import type { EvalDataItem } from "./dev";

/**
 * CI Dataset - Pre-deployment test cases
 * Size: 4 additional examples (total 6 with dev)
 * Purpose: More comprehensive testing before deployment
 */
export const ciData: EvalDataItem[] = [
  {
    input: [
      {
        id: "3",
        role: "user",
        parts: [
          {
            type: "text",
            text: "What are the breaking changes in React 19?",
          },
        ],
      },
    ],
    expected: `
Key breaking changes in React 19:
- Removal of deprecated APIs (e.g., string refs, legacy context)
- Changes to Server Components behavior
- Stricter hydration error handling
- Updates to concurrent features
- Changes to useEffect timing in some cases
`,
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        parts: [
          {
            type: "text",
            text: "How does Bun compare to Node.js in terms of performance?",
          },
        ],
      },
    ],
    expected: `
Bun performance vs Node.js:
- Startup time: Bun is significantly faster (4x or more)
- Package installation: Bun's package manager is faster than npm
- JavaScript execution: Similar performance for most workloads
- Built-in APIs: Bun has faster built-in implementations for common tasks
- HTTP server: Bun's server is notably faster than Node.js
- Bundler: Bun's bundler is faster than traditional bundlers
`,
  },
  {
    input: [
      {
        id: "5",
        role: "user",
        parts: [
          {
            type: "text",
            text: "What are the new features in Python 3.13?",
          },
        ],
      },
    ],
    expected: `
Python 3.13 new features:
- Improved error messages with more context
- Performance improvements in the interpreter
- New and improved standard library modules
- Better support for type hints
- Enhanced asyncio capabilities
- Improved debugging tools
`,
  },
  {
    input: [
      {
        id: "6",
        role: "user",
        parts: [
          {
            type: "text",
            text: "What are the best practices for implementing RAG systems with LLMs?",
          },
        ],
      },
    ],
    expected: `
RAG (Retrieval Augmented Generation) best practices:
- Chunking: Split documents into appropriate sizes (typically 500-1000 tokens)
- Embedding quality: Use high-quality embedding models
- Vector database: Choose appropriate vector DB (Pinecone, Weaviate, Chroma)
- Retrieval strategy: Implement hybrid search (semantic + keyword)
- Context window management: Balance retrieved content vs token limits
- Reranking: Use reranking models to improve relevance
- Evaluation: Continuously measure retrieval quality and answer accuracy
- Metadata filtering: Leverage metadata for better retrieval
- Query preprocessing: Improve query quality before retrieval
`,
  },
];
