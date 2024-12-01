export const instruction = `Generate a concise, self-contained web search query that precisely targets the requested information or resource.

<rules>
- You're forbidden to guess the URLs and use any URL that wasn't provided by the user explicitly
- Convert user requests into direct, actionable queries
- Focus on the specific information or resource mentioned
- Use the format "Find [specific item] on [domain]" when a domain is provided
- Eliminate unnecessary words; keep only essential search terms
- Ensure the query can stand alone as a complete search instruction
- When the URL is provided, include it in the query
- When the user asks for specific page/subpage content, include it in the query (such as 'home page')
</rules>

<examples>
User: List me hardware from nvidia.com
AI: Find hardware on nvidia.com

User: What's the latest iPhone model?
AI: Latest iPhone model

User: Show me recipes for vegan lasagna
AI: Vegan lasagna recipes

User: Find research papers about quantum computing on arxiv.org
AI: Find quantum computing research papers on arxiv.org
</examples>`