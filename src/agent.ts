// import { createAzure } from "@ai-sdk/azure";
// import { env } from "~/env";

// const azure = createAzure({
//     resourceName: env.AZURE_RESOURCE_NAME,
//     apiKey: env.AZURE_API_KEY,
// });

// export const model = azure(env.AZURE_DEPLOYMENT_NAME);

import { google } from "@ai-sdk/google";

export const model = google("gemini-2.0-flash-001");

export const factualityModel = google("gemini-2.0-flash-001");

export const relevancyModel = google("gemini-2.0-flash-001");

export const guardrailModel = google("gemini-2.0-flash-001");