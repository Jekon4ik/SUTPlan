/**
 * Fetch ICS files from Cloudflare Worker proxy
 * 
 * The proxy handles TLS negotiation with plan.polsl.pl and provides CORS headers,
 * allowing browser-based requests from React app.
 */

const CLOUDFLARE_PROXY_URL =
  import.meta.env.VITE_PLAN_URL ?? "https://sutplan-proxy.yaold623.workers.dev";

export interface FetchIcsOptions {
  timeout?: number; // milliseconds, default 20000
}

/**
 * Fetch ICS calendar file for a given group and week
 * @param groupId - University group ID (e.g., "343167655")
 * @param week - Week number (1-54)
 * @param options - Optional fetch options (timeout)
 * @returns Raw ICS file content
 * @throws Error with descriptive message if fetch fails
 */
export async function fetchIcs(
  groupId: string,
  week: number,
  options: FetchIcsOptions = {}
): Promise<string> {
  const { timeout = 20000 } = options;

  // Build URL with query parameters
  const url = new URL(CLOUDFLARE_PROXY_URL);
  url.searchParams.set("type", "0");
  url.searchParams.set("id", groupId);
  url.searchParams.set("cvsfile", "true");
  url.searchParams.set("w", String(week));

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    console.info("Fetching ICS:", url.toString());

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "text/calendar",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} — Failed to fetch schedule from server`
      );
    }

    const content = await response.text();

    // Validate that we received actual ICS data
    if (!content.trim().startsWith("BEGIN:VCALENDAR")) {
      throw new Error(
        "Invalid calendar data received — server did not return valid ICS file"
      );
    }

    return content;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timeout (20s) — unable to reach university server"
        );
      }
      throw error;
    }
    throw new Error("Failed to fetch schedule");
  }
}
