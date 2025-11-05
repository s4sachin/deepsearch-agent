"use client";

import { useState } from "react";
import { Search as SearchIcon, Link as LinkIcon } from "lucide-react";
import type { Action } from "~/lib/get-next-action";
import type { OurMessage } from "~/types";

interface ReasoningStepsProps {
  parts: OurMessage["parts"];
}

export const ReasoningSteps = ({ parts }: ReasoningStepsProps) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  // Filter for data-new-action parts
  const actions = parts
    .filter((part) => part.type === "data-new-action")
    .map((part) => ("data" in part ? part.data : null))
    .filter((data): data is Action => data !== null);

  if (actions.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {actions.map((action, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {index + 1}
                </span>
                {action.title}
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    <div className="text-sm italic text-gray-400">
                      {action.reasoning}
                    </div>
                    {action.type === "search" && action.query && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <SearchIcon className="size-4" />
                        <span>{action.query}</span>
                      </div>
                    )}
                    {action.type === "scrape" && action.urls && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <LinkIcon className="size-4" />
                        <span>
                          {action.urls
                            .map((url) => {
                              try {
                                return new URL(url).hostname;
                              } catch {
                                return url;
                              }
                            })
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
