/**
 * Redirect chain detection and analysis
 */

export interface RedirectChain {
  startUrl: string;
  finalUrl: string;
  chain: Array<{ url: string; statusCode: number }>;
  length: number;
  isTooLong: boolean;
}

/**
 * Detect redirect chains by following redirects
 */
export async function detectRedirectChains(
  urls: string[],
  maxChainLength: number = 5
): Promise<RedirectChain[]> {
  const chains: RedirectChain[] = [];

  for (const startUrl of urls) {
    const chain: Array<{ url: string; statusCode: number }> = [];
    let currentUrl = startUrl;
    const visited = new Set<string>();

    for (let i = 0; i < maxChainLength; i++) {
      if (visited.has(currentUrl)) {
        // Circular redirect
        break;
      }
      visited.add(currentUrl);

      try {
        const response = await fetch(currentUrl, {
          method: "HEAD",
          redirect: "manual",
          signal: AbortSignal.timeout(5000),
        });

        chain.push({
          url: currentUrl,
          statusCode: response.status,
        });

        // Check if redirect
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (location) {
            // Resolve relative URLs
            try {
              currentUrl = new URL(location, currentUrl).toString();
            } catch {
              currentUrl = location;
            }
          } else {
            break;
          }
        } else {
          // Not a redirect, chain ends here
          break;
        }
      } catch (error) {
        // Failed to fetch, chain ends
        break;
      }
    }

    if (chain.length > 1) {
      chains.push({
        startUrl,
        finalUrl: chain[chain.length - 1].url,
        chain,
        length: chain.length,
        isTooLong: chain.length > 3,
      });
    }
  }

  return chains;
}
