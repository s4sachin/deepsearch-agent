import type { EvalDataItem } from "./dev";

/**
 * Regression Dataset - Comprehensive test cases
 * Size: 4 additional examples (total 10 with dev + CI)
 * Purpose: Track performance over time, catch regressions, edge cases
 */
export const regressionData: EvalDataItem[] = [
  {
    input: [
      {
        id: "7",
        role: "user",
        parts: [
          {
            type: "text",
            text: "What is the current state of WebAssembly adoption in 2025?",
          },
        ],
      },
    ],
    expected: `
WebAssembly adoption in 2025:
- Browser support: Universal support across all major browsers
- Use cases: Gaming, video editing, scientific computing, blockchain
- Performance: Near-native performance for compute-intensive tasks
- Language support: Rust, C++, Go, AssemblyScript well-supported
- Tooling: Mature toolchains and debugging capabilities
- Server-side: Growing adoption with WASI for cloud/edge computing
`,
  },
  {
    input: [
      {
        id: "8",
        role: "user",
        parts: [
          {
            type: "text",
            text: "How do you optimize Core Web Vitals for a Next.js application?",
          },
        ],
      },
    ],
    expected: `
Core Web Vitals optimization for Next.js:
LCP (Largest Contentful Paint):
- Use Next.js Image component for optimization
- Implement priority loading for above-fold images
- Use streaming SSR with Suspense
- Optimize font loading with next/font

FID/INP (First Input Delay/Interaction to Next Paint):
- Minimize JavaScript bundle size
- Use dynamic imports for code splitting
- Defer non-critical JavaScript
- Optimize third-party scripts

CLS (Cumulative Layout Shift):
- Specify image dimensions
- Reserve space for ads and embeds
- Use CSS aspect ratios
- Avoid inserting content above existing content
`,
  },
  {
    input: [
      {
        id: "9",
        role: "user",
        parts: [
          {
            type: "text",
            text: "What are the differences between Server Components and Client Components in React?",
          },
        ],
      },
    ],
    expected: `
Server Components vs Client Components:

Server Components:
- Render on the server only
- Can access backend resources directly
- Zero JavaScript sent to client
- Cannot use hooks or browser APIs
- Default in Next.js App Router

Client Components:
- Can render on server and client
- Require 'use client' directive
- Can use hooks and browser APIs
- Enable interactivity
- Required for event handlers and state

Key principles:
- Keep interactive components as Client Components
- Use Server Components for data fetching
- Compose them together for optimal performance
`,
  },
  {
    input: [
      {
        id: "10",
        role: "user",
        parts: [
          {
            type: "text",
            text: "What are the key features of Tailwind CSS v4?",
          },
        ],
      },
    ],
    expected: `
Tailwind CSS v4 features:
- Performance: Significantly faster build times
- CSS-first configuration: Native CSS instead of JavaScript config
- New engine: Complete rewrite in Rust
- Improved IntelliSense
- Better container queries support
- Enhanced color palette system
- Simplified plugin system
- Smaller bundle sizes
`,
  },
];
