import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { url, maxPages = 5, maxDepth = 2 } = await req.json();

    if (!url) {
      return Response.json({ error: 'Missing URL' }, { status: 400 });
    }

    const discovered = new Set();
    const results = [];
    const visited = new Set();

    const crawlUrl = async (pageUrl, depth) => {
      if (visited.has(pageUrl) || results.length >= maxPages || depth > maxDepth) return;
      visited.add(pageUrl);

      try {
        const res = await base44.functions.invoke('crawlPage', { url: pageUrl });
        if (res.data) {
          results.push({
            url: pageUrl,
            title: res.data.title,
            links: res.data.links?.length || 0,
            buttons: res.data.buttons?.length || 0,
            forms: res.data.forms || 0,
            errors: res.data.errors?.length || 0,
          });

          // Extract links from crawl data for next depth
          if (res.data.links && depth < maxDepth) {
            res.data.links.slice(0, 5).forEach(link => {
              if (link && link.startsWith(new URL(pageUrl).origin)) {
                discovered.add(link);
              }
            });
          }
        }
      } catch (e) {
        console.error(`Failed to crawl ${pageUrl}:`, e.message);
      }
    };

    await crawlUrl(url, 0);

    // Crawl discovered links at next depth
    for (const link of Array.from(discovered).slice(0, maxPages - results.length)) {
      await crawlUrl(link, 1);
    }

    return Response.json({ pages: results, total: results.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});