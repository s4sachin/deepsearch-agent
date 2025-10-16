# AI SDK v5 - Azure OpenAI Provider Documentation

This documentation covers the Azure OpenAI provider for the Vercel AI SDK v5. This is a reference for using Azure OpenAI services in this project.

## Table of Contents

- [Installation](#installation)
- [Setup & Configuration](#setup--configuration)
- [Basic Usage](#basic-usage)
- [Provider Options](#provider-options)
- [Models & Capabilities](#models--capabilities)
- [Advanced Features](#advanced-features)

---

## Installation

```bash
npm i @ai-sdk/azure
```

Or with pnpm (recommended for this project):

```bash
pnpm add @ai-sdk/azure
```

---

## Setup & Configuration

### Import the Provider

```typescript
import { azure } from '@ai-sdk/azure';
```

### Default Configuration

The default Azure provider uses environment variables:

- `AZURE_RESOURCE_NAME` - Azure resource name
- `AZURE_API_KEY` - API key for authentication
- `AZURE_API_VERSION` - API version (defaults to 'preview')

### Custom Configuration

Create a custom Azure provider instance:

```typescript
import { createAzure } from '@ai-sdk/azure';

const azure = createAzure({
  resourceName: 'your-resource-name', // Azure resource name
  apiKey: 'your-api-key',
  apiVersion: 'preview', // optional, defaults to 'preview'
  baseURL: 'https://custom-url.com', // optional, alternative URL prefix
  headers: {
    'Custom-Header': 'value'
  }, // optional
  fetch: customFetchImplementation // optional
});
```

### Configuration Parameters

- **resourceName** (string, optional): Azure resource name. Defaults to `AZURE_RESOURCE_NAME` env var. Used to construct the URL: `https://{resourceName}.openai.azure.com/openai/v1{path}`.
- **apiKey** (string, optional): API key for authentication. Defaults to `AZURE_API_KEY` env var. Sent in the 'api-key' header.
- **apiVersion** (string, optional): Custom API version. Defaults to 'preview'.
- **baseURL** (string, optional): Alternative URL prefix for API calls. If provided, resourceName is ignored. Resolved URL: `{baseURL}/v1{path}`.
- **headers** (Record<string, string>, optional): Custom headers to include in requests.
- **fetch** ((input: RequestInfo, init?: RequestInit) => Promise<Response>, optional): Custom fetch implementation.

---

## Basic Usage

### Create a Language Model Instance

```typescript
import { azure } from '@ai-sdk/azure';

const model = azure('your-deployment-name');
```

### Generate Text

```typescript
import { azure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const { text } = await generateText({
  model: azure('gpt-4o'), // your deployment name
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Stream Text

```typescript
import { azure } from '@ai-sdk/azure';
import { streamText } from 'ai';

const { textStream } = streamText({
  model: azure('your-deployment-name'),
  prompt: 'Write a story about a robot.',
});

for await (const textPart of textStream) {
  console.log(textPart);
}
```

---

## Provider Options

### Chat Model Provider Options

Available via `providerOptions.openai`:

#### logitBias

Modifies the likelihood of specified tokens appearing in the completion.

```typescript
import { azure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const result = await generateText({
  model: azure('your-deployment-name'),
  prompt: 'Write a short story about a robot.',
  providerOptions: {
    azure: {
      logitBias: {
        '50256': -100, // prevent token with ID 50256
      },
    },
  },
});
```

#### logprobs

Return the log probabilities of tokens.

- `true` - Returns all token logprobs
- `number` - Returns top N token logprobs

```typescript
providerOptions: {
  azure: {
    logprobs: true, // or a number
  },
}
```

#### parallelToolCalls

Whether to enable parallel function calling during tool use.

```typescript
providerOptions: {
  azure: {
    parallelToolCalls: true, // defaults to true
  },
}
```

#### user

A unique identifier representing your end-user, for monitoring and abuse detection.

```typescript
providerOptions: {
  azure: {
    user: 'user_123',
  },
}
```

#### imageDetail

Controls the detail level for image inputs (e.g., 'low', 'high').

```typescript
const messages = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      {
        type: 'image',
        image: 'https://example.com/image.png',
        providerOptions: {
          openai: { imageDetail: 'low' },
        },
      },
    ],
  },
];
```

#### reasoningEffort

Specifies the reasoning effort for the model (e.g., 'low', 'medium', 'high').

```typescript
const { text } = await generateText({
  model: azure('your-deployment-name'),
  providerOptions: {
    openai: {
      reasoningEffort: 'low',
    },
  },
});
```

### Response Model Provider Options

Available for Azure OpenAI Responses models via `providerOptions.openai`:

```typescript
import { azure, OpenAIResponsesProviderOptions } from '@ai-sdk/azure';
import { generateText } from 'ai';

const result = await generateText({
  model: azure.responses('your-deployment-name'),
  providerOptions: {
    openai: {
      parallelToolCalls: false,
      store: false,
      user: 'user_123',
      reasoningEffort: 'medium',
      strictJsonSchema: false,
      metadata: {
        custom: 'value',
      },
      previousResponseId: 'response-id',
      instructions: 'New system instructions',
    } satisfies OpenAIResponsesProviderOptions,
  },
});
```

- **parallelToolCalls** (boolean): Whether to use parallel tool calls. Defaults to `true`.
- **store** (boolean): Whether to store the generation. Defaults to `true`.
- **metadata** (Record<string, string>): Additional metadata to store with the generation.
- **previousResponseId** (string): The ID of the previous response, used to continue a conversation. Defaults to `undefined`.
- **instructions** (string): Instructions for the model, used to change system/developer messages when continuing a conversation. Defaults to `undefined`.
- **user** (string): A unique identifier representing your end-user. Defaults to `undefined`.
- **reasoningEffort** ('low' | 'medium' | 'high'): Reasoning effort for reasoning models. Defaults to `medium`.
- **strictJsonSchema** (boolean): Whether to use strict JSON schema validation. Defaults to `false`.

### Completion Model Provider Options

Available for completion models via `providerOptions.azure`:

```typescript
import { azure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const result = await generateText({
  model: azure.completion('your-gpt-35-turbo-instruct-deployment'),
  prompt: 'Write a haiku about coding.',
  providerOptions: {
    azure: {
      echo: true,
      logitBias: { '50256': -100 },
      suffix: 'some text',
      user: 'test-user',
    },
  },
});
```

---

## Models & Capabilities

### Chat Models

Create chat models using the default factory method:

```typescript
const model = azure('your-deployment-name');
```

### Response Models

Create response models for specific use cases:

```typescript
const model = azure.responses('your-deployment-name');
```

### Completion Models

Create completion models (legacy):

```typescript
import { azure } from '@ai-sdk/azure';

const model = azure.completion('your-gpt-35-turbo-instruct-deployment');
```

### Text Embedding Models

Create embedding models:

```typescript
import { azure } from '@ai-sdk/azure';
import { embed } from 'ai';

const model = azure.textEmbedding('your-embedding-deployment');

const { embedding } = await embed({
  model,
  value: 'sunny day at the beach',
  providerOptions: {
    azure: {
      dimensions: 512, // optional
      user: 'test-user', // optional
    },
  },
});
```

### Image Generation Models (DALL-E)

Create image generation models:

```typescript
import { azure } from '@ai-sdk/azure';
import { experimental_generateImage as generateImage } from 'ai';

const model = azure.image('your-dalle-deployment-name');

const { image } = await generateImage({
  model,
  prompt: 'A photorealistic image of a cat astronaut floating in space',
  size: '1024x1024', // '1024x1024', '1792x1024', or '1024x1792' for DALL-E 3
  providerOptions: {
    azure: {
      user: 'test-user',
      responseFormat: 'url', // 'url' or 'b64_json', defaults to 'url'
    },
  },
});
```

**DALL-E Model Capabilities:**

- **DALL-E 3**: Supported sizes: `1024x1024`, `1792x1024`, `1024x1792`
- **DALL-E 2**: Supported sizes: `256x256`, `512x512`, `1024x1024`

**Note**: The `aspectRatio` parameter is not supported. Use the `size` parameter instead.

### Transcription Models (Whisper)

Create transcription models:

```typescript
import { azure } from '@ai-sdk/azure';
import { experimental_transcribe as transcribe } from 'ai';
import { readFile } from 'fs/promises';

const model = azure.transcription('whisper-1');

const result = await transcribe({
  model,
  audio: await readFile('audio.mp3'),
  providerOptions: {
    azure: {
      language: 'en', // ISO-639-1 format, improves accuracy and latency
      prompt: 'Optional text to guide the model',
      temperature: 0,
      include: ['timestamp'],
      timestampGranularities: ['word', 'segment'],
    },
  },
});
```

**Transcription Model Capabilities:**

| Model | Transcription | Duration | Segments | Language |
|-------|--------------|----------|----------|----------|
| whisper-1 | ✓ | ✓ | ✓ | ✓ |
| gpt-4o-mini-transcribe | ✓ | ✗ | ✗ | ✗ |
| gpt-4o-transcribe | ✓ | ✗ | ✗ | ✗ |

**Transcription Provider Options:**

- **language** (string, optional): The language of the input audio in ISO-639-1 format (e.g., 'en'). Improves accuracy and latency.
- **prompt** (string, optional): Text to guide the model's style or continue previous audio. Should match audio language.
- **temperature** (number, optional): Sampling temperature between 0 and 1. Defaults to 0.
- **include** (string[], optional): Additional information to include in the response (e.g., 'timestamp').
- **timestampGranularities** (('word' | 'segment')[], optional): Granularity of timestamps. Defaults to `['segment']`. Generating word timestamps incurs additional latency.

---

## Advanced Features

### Provider Metadata

Access provider-specific metadata from the response:

```typescript
const { providerMetadata } = await generateText({
  model: azure.responses('your-deployment-name'),
});

const openaiMetadata = providerMetadata?.openai;
```

**OpenAI-Specific Metadata:**

- **responseId** (string): The ID of the response. Can be used to continue a conversation.
- **cachedPromptTokens** (number): The number of prompt tokens that were a cache hit.
- **reasoningTokens** (number): The number of reasoning tokens that the model generated.

### Process PDF Files

Send PDF files as part of messages to the Azure OpenAI Responses API:

```typescript
import fs from 'fs';
import { azure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const result = await generateText({
  model: azure.responses('your-deployment-name'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is an embedding model?' },
        {
          type: 'file',
          data: fs.readFileSync('./data/ai.pdf'),
          mediaType: 'application/pdf',
          filename: 'ai.pdf', // optional
        },
      ],
    },
  ],
});
```

### Reasoning Models with Middleware

Enhance models to extract reasoning tags (e.g., `<think>`) from generated text:

```typescript
import { azure } from '@ai-sdk/azure';
import { wrapLanguageModel, extractReasoningMiddleware } from 'ai';

const enhancedModel = wrapLanguageModel({
  model: azure('your-deepseek-r1-deployment-name'),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});
```

---

## Common Patterns

### Basic Text Generation

```typescript
import { azure } from '@ai-sdk/azure';
import { generateText } from 'ai';

const { text } = await generateText({
  model: azure('gpt-4o'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});

console.log(text);
```

### Streaming with Tool Calls

```typescript
import { azure } from '@ai-sdk/azure';
import { streamText, tool } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: azure('gpt-4o'),
  prompt: 'What is the weather in San Francisco?',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
});

for await (const textPart of result.textStream) {
  process.stdout.write(textPart);
}
```

### Multi-Step Agent with Custom Options

```typescript
import { azure } from '@ai-sdk/azure';
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const { text, steps } = await generateText({
  model: azure('gpt-4o'),
  stopWhen: stepCountIs(5),
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  prompt: 'What is the weather in San Francisco?',
  providerOptions: {
    azure: {
      user: 'user_123',
    },
  },
});

console.log(text);
console.log('Steps taken:', steps.length);
```

---

## Reference Links

- [AI SDK v5 Documentation](https://sdk.vercel.ai/docs)
- [Azure OpenAI Service Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [AI SDK GitHub Repository](https://github.com/vercel/ai)

---

## Notes for This Project

This project uses Azure OpenAI exclusively. The configuration is managed via environment variables in `.env`:

- `AZURE_RESOURCE_NAME`
- `AZURE_API_KEY`
- `AZURE_DEPLOYMENT_NAME`

The model instance is created in [src/agent.ts](../src/agent.ts) and exported for use throughout the application.
