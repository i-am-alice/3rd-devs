using Rate.Models;

namespace Rate.Testing;

public record TestResult(int TestNumber, LLMResponse Response);

public static class TestResultExtensions
{
    public static IEnumerable<TestResult> GetBestResults(this IEnumerable<TestResult> results)
    {
        if (!results.Any()) return Enumerable.Empty<TestResult>();
        
        var maxScore = results.Max(r => r.Response.Score);
        return results.Where(r => r.Response.Score == maxScore);
    }
} 