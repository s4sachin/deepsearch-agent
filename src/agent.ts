import { createAzure } from "@ai-sdk/azure";
import { env } from "~/env";

const azure = createAzure({
    resourceName: env.AZURE_RESOURCE_NAME,
    apiKey: env.AZURE_API_KEY,
});

export const model = azure(env.AZURE_DEPLOYMENT_NAME);