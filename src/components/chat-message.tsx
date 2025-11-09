import type { UIMessage } from "ai";
import { ReasoningSteps } from "./reasoning-steps";
import type { OurMessage } from "~/types";

export type MessagePart = NonNullable<UIMessage["parts"]>[number];

interface ChatMessageProps {
  parts: OurMessage["parts"];
  role: string;
  userName: string;
}

// Helper to render values in a more readable way
const RenderValue = ({ value }: { value: unknown }) => {
  // Handle null and undefined
  if (value === null) return <span className="text-gray-500 italic">null</span>;
  if (value === undefined)
    return <span className="text-gray-500 italic">undefined</span>;

  // Handle primitives
  if (typeof value === "string") {
    return <span className="text-green-400">{value}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-blue-400">{value}</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-purple-400">{value.toString()}</span>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400">[]</span>;
    }
    return (
      <div className="ml-4 border-l-2 border-gray-600 pl-3">
        {value.map((item, idx) => (
          <div key={idx} className="mb-1">
            <span className="text-gray-500">[{idx}]</span>{" "}
            <RenderValue value={item} />
          </div>
        ))}
      </div>
    );
  }

  // Handle objects
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className="text-gray-400">{"{}"}</span>;
    }
    return (
      <div className="ml-4 space-y-1">
        {entries.map(([key, val]) => (
          <div key={key}>
            <span className="font-semibold text-cyan-400">{key}</span>
            <span className="text-gray-500">: </span>
            <RenderValue value={val} />
          </div>
        ))}
      </div>
    );
  }

  // Fallback to string representation
  return <span className="text-gray-300">{String(value)}</span>;
};

const ToolInvocation = ({ part }: { part: MessagePart }) => {
  // Filter for tool-* types (the actual type can vary, like "tool-search")
  if (!part.type.startsWith("tool-")) return null;

  const toolPart = part as Extract<MessagePart, { type: `tool-${string}` }>;

  // Get state and tool information
  const state = toolPart.state;
  const toolName = toolPart.type.replace("tool-", "");

  return (
    <div className="mb-3 rounded-lg border border-gray-600 bg-gray-700/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">
          {state === "input-streaming" && "⏳ Streaming Input"}
          {state === "input-available" && "🔧 Input Ready"}
          {state === "output-available" && "✓ Output Available"}
          {state === "output-error" && "❌ Error"}
        </span>
        <span className="text-sm font-mono text-gray-300">{toolName}</span>
      </div>

      {/* Input Arguments */}
      {"input" in toolPart && toolPart.input !== undefined && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-semibold text-gray-400">Input:</p>
          <div className="rounded bg-gray-800 p-3 text-sm">
            <RenderValue value={toolPart.input} />
          </div>
        </div>
      )}

      {/* Output (only shown when output is available) */}
      {state === "output-available" && "output" in toolPart && (
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-400">Output:</p>
          <div className="rounded bg-gray-800 p-3 text-sm">
            <RenderValue value={toolPart.output} />
          </div>
        </div>
      )}

      {/* Error (if present) */}
      {state === "output-error" && "errorText" in toolPart && toolPart.errorText && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-semibold text-red-400">Error:</p>
          <div className="rounded bg-red-900/30 p-3 text-sm text-red-300">
            {toolPart.errorText}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>
        
        {/* Show reasoning steps for AI messages */}
        {isAI && <ReasoningSteps parts={parts} />}

        <div className="max-w-none">
          {parts.map((part, index) => {
            // Hover over MessagePart to see all possible types!
            if (part.type === "text") {
              return (
                <div key={index} className="whitespace-pre-wrap leading-relaxed">
                  {part.text}
                </div>
              );
            }

            // Handle tool parts (type starts with "tool-")
            if (part.type.startsWith("tool-")) {
              return <ToolInvocation key={index} part={part} />;
            }

            // Skip data parts (already shown in ReasoningSteps)
            if (part.type.startsWith("data-")) {
              return null;
            }

            // For any other part types we're not handling yet
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
