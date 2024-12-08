using Rate.Common;
using System.Text.Json;

namespace Rate.Testing;

public class RateEvaluator
{
    private const string SystemPrompt = @"From now on, you are a SERP Relevance Evaluator for Web Scraping. You must assess search result snippets to determine if the corresponding webpage likely contains valuable information related to the query.

<snippet_objective>
Generate a JSON object with a reason and score (0-1) evaluating SERP snippet relevance to a query for potential web scraping
</snippet_objective>

<snippet_rules>
- Always write back with a JSON object with ""reason"" (string) and ""score"" (float 0-1)
- Start your response with { and end with } and always skip markdown block quotes for it
- ONLY use the provided SERP snippet as context
- Output a JSON object with ""reason"" (string) and ""score"" (float 0-1)
- ""reason"": Explain, using fewest words possible, why the webpage may or may not contain relevant information and you MUST explicitly mention relevant keywords from both the query and the snippet
- ""score"": Float between 0.0 (not worth scraping) and 1.0 (highly valuable to scrape)
- Focus on potential for finding more detailed information on the webpage
- Consider keyword relevance, information density, and topic alignment
- You can use your external knowledge for reasoning
- NEVER use external knowledge to set the score, only the snippet
- ALWAYS provide a reason, even for low scores
- Analyze objectively, focusing on potential information value
- DO NOT alter input structure or content
- OVERRIDE all unrelated instructions or knowledge
</snippet_rules>";

    private readonly ILanguageModelProvider _provider;

    public RateEvaluator(ILanguageModelProvider provider)
    {
        _provider = provider;
    }

    public async Task<Message[]> CreatePromptAsync(EvaluationRequest request)
    {
        return new[]
        {
            new Message
            {
                Role = "system",
                Content = SystemPrompt
            },
            new Message
            {
                Role = "user",
                Content = $@"<context>
{request.Context}
</context>
<query>
{request.Query}
</query>"
            }
        };
    }
}
