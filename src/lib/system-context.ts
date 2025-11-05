import type { UIMessage } from "ai";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
};

const toQueryResult = (query: QueryResultSearchResult) =>
  [`### ${query.date} - ${query.title}`, query.url, query.snippet].join("\n\n");

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The conversation message history
   */
  private messages: UIMessage[] = [];

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  constructor(messages: UIMessage[]) {
    this.messages = messages;
  }

  shouldStop() {
    return this.step >= 10;
  }

  incrementStep() {
    this.step++;
  }

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [`## Query: "${query.query}"`, ...query.results.map(toQueryResult)].join(
          "\n\n",
        ),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getMessageHistory(): string {
    return this.messages
      .map((message) => {
        const role = message.role.toUpperCase();
        // Extract text content from parts
        const textParts = message.parts
          ?.filter((part) => part.type === "text")
          .map((part) => ("text" in part ? part.text : ""))
          .join("\n");
        const content = textParts || "";
        return `<message role="${role}">\n${content}\n</message>`;
      })
      .join("\n\n");
  }
}
