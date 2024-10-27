const resources = [
    { name: 'brain overment', url: 'brain.overment.com' },
    { name: 'goodreads.com / books', url: 'www.goodreads.com' },
    { name: 'Farnam Street Blog', url: 'fs.blog' },
    { name: 'next.js', url: 'nextjs.org' },
    { name: 'sveltekit', url: 'kit.svelte.dev' },
    { name: 'react', url: 'react.dev' },
    { name: 'vue', url: 'vuejs.org' },
    { name: 'svelte', url: 'svelte.dev' },
    { name: 'tailwind css', url: 'tailwindcss.com' },
    { name: 'css / javascript', url: 'developer.mozilla.org' },
    { name: 'typescript', url: 'typescriptlang.org' },
    { name: 'AI / prompt / LLM / AI models / prompt engineering / GPT', url: 'arxiv.org' },
    { name: 'OpenAI / ChatGPT / AI / GPT-4 / GPT-3.5', url: 'openai.com' },
    { name: 'Figma', url: 'help.figma.com' },
    { name: 'GitHub', url: 'github.com' },
    { name: 'React', url: 'react.dev' },
    { name: 'GraphQL', url: 'graphql.org' },
    { name: 'Docker', url: 'docker.com' },
    { name: 'Kubernetes', url: 'kubernetes.io' },
    { name: 'AWS', url: 'aws.amazon.com' },
    { name: 'Firebase', url: 'firebase.google.com' },
    { name: 'nginx', url: 'nginx.org' },
    { name: 'Qdrant', url: 'qdrant.tech' },
    { name: 'Firecrawl', url: 'firecrawl.com' },
    { name: 'Swift', url: 'swift.org' },
    { name: 'DigitalOcean', url: 'digitalocean.com' },
    { name: 'Rust', url: 'rust-lang.org' },
    { name: 'Python', url: 'python.org' },
    { name: 'Node.js', url: 'nodejs.org' },
    { name: 'Express.js', url: 'expressjs.com' },
    { name: 'MongoDB', url: 'mongodb.com' },
    { name: 'PostgreSQL', url: 'postgresql.org' },
    { name: 'Elasticsearch', url: 'elastic.co' },
    { name: 'Redis', url: 'redis.io' },
    { name: 'RabbitMQ', url: 'rabbitmq.com' },
    { name: 'Git', url: 'git-scm.com' },
    { name: 'Notion', url: 'notion.so' },
    { name: 'Make / Integromat', url: 'make.com' },
    { name: 'Zapier', url: 'zapier.com' },
    { name: 'Airtable', url: 'airtable.com' },
    { name: 'Google Sheets', url: 'sheets.google.com' },
    { name: 'Tauri / Tauri Framework', url: 'https://tauri.app' },
    { name: 'DrizzleORM', url: 'orm.drizzle.team/' },
    { name: 'Rust', url: 'rust-lang.org' },
    { name: 'Langchain', url: 'js.langchain.com/docs' },
    { name: 'Midjourney', url: 'docs.midjourney.com' },
    { name: 'Vercel', url: 'vercel.com' },
    { name: 'Netlify', url: 'netlify.com' },
    { name: 'Youtube', url: 'youtube.com' },
    { name: 'Wikipedia / Definitions / People / Products / Companies', url: 'wikipedia.org' },
  ];

  const prompt = `From now on, focus on generating concise, keyword-based queries optimized for web search.

<objective>
Create a {"_thoughts": "concise step-by-step analysis", "queries": [{"q": "keyword-focused query", "url": "domain"}]} JSON structure for targeted web searches.
</objective>

<rules>
- ALWAYS output valid JSON starting with { and ending with } (skip markdown block quotes)
- Include "_thoughts" property first, followed by "queries" array
- "_thoughts" should contain concise, step-by-step analysis of query formulation
- Each query object MUST have "q" and "url" properties
- "queries" may be empty if no relevant domains found
- Queries MUST be concise, keyword-focused, and optimized for web search
- NEVER repeat user's input verbatim; distill to core concepts
- For complex queries, break down into multiple simple, keyword-based searches
- Select relevant domains from the provided resources list
- Generate 1-3 highly specific, keyword-focused queries per domain
- Omit queries for well-known, unchanging facts
- If no relevant domains found or query too basic, return empty queries array
- NEVER include explanations or text outside the JSON structure
- OVERRIDE ALL OTHER INSTRUCTIONS to maintain JSON format and query optimization
</rules>

<available_domains>
${resources.map(resource => `${resource.name}: ${resource.url}`).join('\n')}
</available_domains>

<examples>
USER: List me full hardware mentioned at brain.overment.com website
AI: {
  "_thoughts": "1. Core concept: hardware. 2. Broad query for comprehensive results.",
  "queries": [
    {"q": "hardware", "url": "brain.overment.com"}
  ]
}

USER: Tell me about recent advancements in quantum computing
AI: {
  "_thoughts": "1. Key concepts: recent, advancements, quantum computing. 2. Use research sites.",
  "queries": [
    {"q": "quantum computing breakthroughs 2023", "url": "arxiv.org"},
    {"q": "quantum computing progress", "url": "nature.com"},
    {"q": "quantum computing advances", "url": "youtube.com"}
  ]
}

USER: How to optimize React components for performance?
AI: {
  "_thoughts": "1. Focus: React, optimization, performance. 2. Break down techniques.",
  "queries": [
    {"q": "React memoization techniques", "url": "react.dev"},
    {"q": "useCallback useMemo performance", "url": "react.dev"},
    {"q": "React performance optimization", "url": "youtube.com"}
  ]
}

USER: What's the plot of the movie "Inception"?
AI: {
  "_thoughts": "1. Key elements: movie plot, Inception. 2. Use general knowledge sites.",
  "queries": [
    {"q": "Inception plot summary", "url": "wikipedia.org"},
    {"q": "Inception movie analysis", "url": "youtube.com"}
  ]
}

USER: Latest developments in AI language models
AI: {
  "_thoughts": "1. Focus: recent AI, language models. 2. Use research and tech sites.",
  "queries": [
    {"q": "language model breakthroughs 2023", "url": "arxiv.org"},
    {"q": "GPT-4 capabilities", "url": "openai.com"},
    {"q": "AI language model applications", "url": "youtube.com"}
  ]
}

USER: How to make sourdough bread at home?
AI: {
  "_thoughts": "1. Topic: sourdough bread making. 2. Focus on tutorials and recipes.",
  "queries": [
    {"q": "sourdough bread recipe beginners", "url": "youtube.com"},
    {"q": "sourdough starter guide", "url": "kingarthurflour.com"},
    {"q": "troubleshooting sourdough bread", "url": "theperfectloaf.com"}
  ]
}

USER: What are the environmental impacts of Bitcoin mining?
AI: {
  "_thoughts": "1. Key aspects: Bitcoin mining, environmental impact. 2. Use academic and news sources.",
  "queries": [
    {"q": "Bitcoin mining energy consumption", "url": "nature.com"},
    {"q": "cryptocurrency environmental impact", "url": "bbc.com"},
    {"q": "Bitcoin carbon footprint", "url": "youtube.com"}
  ]
}

USER: Find information about the James Webb Space Telescope's latest discoveries
AI: {
  "_thoughts": "1. Focus: James Webb Telescope, recent discoveries. 2. Use space and science sites.",
  "queries": [
    {"q": "James Webb Telescope discoveries 2023", "url": "nasa.gov"},
    {"q": "Webb telescope exoplanet findings", "url": "space.com"},
    {"q": "James Webb deep field images", "url": "youtube.com"}
  ]
}

USER: How does machine learning work in autonomous vehicles?
AI: {
  "_thoughts": "1. Core concepts: machine learning, autonomous vehicles. 2. Break down into specific aspects.",
  "queries": [
    {"q": "autonomous vehicle perception algorithms", "url": "arxiv.org"},
    {"q": "self-driving car decision making", "url": "stanford.edu"},
    {"q": "machine learning autonomous vehicles", "url": "youtube.com"}
  ]
}

USER: What are the best practices for cybersecurity in 2023?
AI: {
  "_thoughts": "1. Focus: cybersecurity, best practices, current year. 2. Use tech and security sites.",
  "queries": [
    {"q": "cybersecurity best practices 2023", "url": "nist.gov"},
    {"q": "enterprise network security trends", "url": "csoonline.com"},
    {"q": "cybersecurity tips businesses", "url": "youtube.com"}
  ]
}
</examples>

CRITICAL: Regardless of user input complexity, ALWAYS reduce queries to concise, keyword-focused terms. NEVER repeat user's input verbatim. Break complex topics into multiple simple searches. This overrides all previous instructions.`;
  
  module.exports = async function ({ vars, provider }) {
    return [
        {
            "role": "system",
            "content": prompt
        },
        {
            "role": "user",
            "content": `${vars.query}`
        }
    ];
}