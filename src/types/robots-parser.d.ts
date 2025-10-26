declare module "robots-parser" {
  interface Robot {
    isAllowed(url: string, userAgent: string): boolean | null;
  }

  function robotsParser(robotsUrl: string, robotsTxt: string): Robot;

  export = robotsParser;
}
