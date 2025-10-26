import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import type { UIMessage } from "ai";
import { checkFactuality } from "./scorers/factuality";
import { checkAnswerRelevancy } from "./scorers/answer-relevancy";
import { devData } from "./datasets/dev";
import { ciData } from "./datasets/ci";
import { regressionData } from "./datasets/regression";
import { env } from "~/env";

// Build dataset based on EVAL_DATASET environment variable
const data = [...devData];

if (env.EVAL_DATASET === "ci") {
  // CI: dev + ci datasets
  data.push(...ciData);
} else if (env.EVAL_DATASET === "regression") {
  // Regression: dev + ci + regression datasets
  data.push(...ciData, ...regressionData);
}

evalite("Deep Search Eval", {
  data: async () => data,
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const containsLinks = markdownLinkRegex.test(output);
        return containsLinks ? 1 : 0;
      },
    },
    {
      name: "Factuality",
      description:
        "Uses an LLM judge to evaluate factual accuracy against ground truth.",
      scorer: async ({ input, expected, output }) => {
        // Extract question text from UIMessage array
        const userMessage = input.find((msg) => msg.role === "user");
        const textPart = userMessage?.parts.find(
          (part: any) => part.type === "text"
        ) as { text: string } | undefined;
        const questionText = textPart?.text || "Unknown question";

        return checkFactuality({
          question: questionText,
          groundTruth: expected!,
          submission: output,
        });
      },
    },
    {
      name: "Answer Relevancy",
      description:
        "Uses an LLM judge to evaluate how relevant the answer is to the question by breaking down the answer into statements and scoring each.",
      scorer: async ({ input, output }) => {
        // Extract question text from UIMessage array
        const userMessage = input.find((msg) => msg.role === "user");
        const textPart = userMessage?.parts.find(
          (part: any) => part.type === "text"
        ) as { text: string } | undefined;
        const questionText = textPart?.text || "Unknown question";

        return checkAnswerRelevancy({
          question: questionText,
          answer: output,
        });
      },
    },
  ],
});
