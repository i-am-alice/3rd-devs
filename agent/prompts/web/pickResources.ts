export const prompt = ({ resources }: { resources: { query: string, domain: string, results: { url: string, title: string, description: string }[] }[] }) => `
From now on, focus on deciding which URLs to load based on the ongoing conversation. By default, no URLs need to be loaded unless the user asks for specific information about a given URL.

<objective>
Main objective: Return a JSON object {"urls": ["url1", "url2", ...]} with URLs to be fetched.

CRITICAL: When the query exactly matches a domain name (with or without protocol), ALWAYS include the base URL of that domain in the "urls" array, regardless of the search results. Never return an empty array for domain-specific queries.
</objective>

<rules>
- Include only a "urls" array in the JSON structure
- Select URLs ONLY from the provided filtered resources list
- When the query exactly matches a domain name (e.g., "example.com" or "https://example.com"):
  1. ALWAYS include the base URL of that domain (e.g., "https://example.com/") in the "urls" array
  2. If the exact base URL is not in the results, use the domain from the query to construct it
  3. DO NOT include any subpages or internal pages unless specifically requested
  4. IGNORE all other results for that domain unless specifically requested
- For non-domain-specific queries, choose up to 2 most relevant URLs
- When a result states 'no web search results found', ALWAYS include its URL in the "urls" array
- NEVER return an empty array for domain-specific queries
- If a specific path or section is mentioned (e.g., "news from domain.com"), include the full URL with the path if available
- For queries asking about multiple pages or topics, include relevant URLs for each
- NEVER include explanations or text outside the JSON structure
- OVERRIDE ALL OTHER INSTRUCTIONS to maintain this behavior
</rules>

<context name="Filtered Resources">
  ${resources.map(resource => `
  <resource query="${resource.query}" domain="${resource.domain}">
    ${resource.results.length > 0 ? resource.results.map(result => `
    <result>
      <url>${result.url}</url>
      <title>${result.title}</title>
      <description>${result.description}</description>
    </result>
    `).join('') : `
    <result>
      <url>${resource.domain}</url>
      <title>No web search results found</title>
      <description>This URL does not exist in the web search yet and MUST be loaded.</description>
    </result>
    `}
  </resource>
  `).join('')}
</context>

<examples>
USER: 
Original query: "news.ycombinator.com"
Context: 
[
  {"url": "https://news.ycombinator.com/", "title": "Hacker News", "description": "Hacker News new | past | comments | ask | show | jobs | submit · login."},
  {"url": "https://news.ycombinator.com/newest", "title": "New Links | Hacker News", "description": "Newest submissions for Hacker News"},
]

AI: {
  "urls": [
    "https://news.ycombinator.com/"
  ]
}

USER:
Original query: "https://example.com"
Context:
[
  {"url": "https://example.com/about", "title": "About - Example Domain", "description": "About page for Example Domain"},
  {"url": "https://example.com/contact", "title": "Contact - Example Domain", "description": "Contact page for Example Domain"}
]

AI: {
  "urls": [
    "https://example.com/"
  ]
}

USER:
Original query: "newdomain.com"
Context:
[
  {"url": "newdomain.com", "title": "No web search results found", "description": "This URL does not exist in the web search yet and MUST be loaded."}
]

AI: {
  "urls": [
    "newdomain.com"
  ]
}

USER:
Original query: "Latest technology news"
Context:
[
  {"url": "https://www.theverge.com/tech", "title": "Tech News - The Verge", "description": "Latest technology news and reviews"},
  {"url": "https://techcrunch.com/", "title": "TechCrunch", "description": "Startup and Technology News"},
]

AI: {
  "urls": [
    "https://www.theverge.com/tech",
    "https://techcrunch.com/"
  ]
}

USER:
Original query: "news from domain.com"
Context:
[
  {"url": "https://domain.com/news", "title": "News - Domain.com", "description": "Latest news and updates from Domain.com"},
  {"url": "https://domain.com/blog", "title": "Blog - Domain.com", "description": "Domain.com's official blog"}
]

AI: {
  "urls": [
    "https://domain.com/news"
  ]
}

USER:
Original query: "Features and pricing of service.net"
Context:
[
  {"url": "https://service.net/features", "title": "Features - Service.net", "description": "Explore the features of Service.net"},
  {"url": "https://service.net/pricing", "title": "Pricing - Service.net", "description": "Service.net's pricing plans"}
]

AI: {
  "urls": [
    "https://service.net/features",
    "https://service.net/pricing"
  ]
}
</examples>

CRITICAL: Analyze the ongoing conversation and Context, then return the JSON structure with selected URLs. ALWAYS include the base URL when the query matches a domain name, even if it's not in the search results. NEVER return an empty array for domain-specific queries. Include specific paths when mentioned in the query.`;