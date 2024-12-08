using Rate.Models;
using Rate.Configuration;
using Rate.Logging;
using System.Text.Json;
using Rate.Common;

namespace Rate.Testing;

public class TestRunner
{
    private readonly YamlConfig _config;

    public TestRunner(YamlConfig config)
    {
        _config = config;
    }

    public async Task<IReadOnlyList<TestResult>> RunTests()
    {
        var tasks = new List<Task<TestResult?>>();
        
        // Start all tests concurrently
        for (int i = 0; i < _config.Tests.Count; i++)
        {
            var testIndex = i; // Capture the index for async lambda
            var task = Task.Run(async () =>
            {
                try
                {
                    var testStartMessage = $"Running test {testIndex}...";
                    Console.WriteLine(testStartMessage);
                    Logger.LogTest(testStartMessage);
                    Logger.LogDebug(testStartMessage);

                    var test = _config.Tests[testIndex];
                    var request = new EvaluationRequest(
                        Context: test.Vars["context"],
                        Query: test.Vars["query"]
                    );

                    var result = await Examples.RunExample(request);
                    var llmResponse = JsonSerializer.Deserialize<LLMResponse>(result, 
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    
                    if (llmResponse == null)
                    {
                        return null;
                    }

                    Logger.LogTest($"Test {testIndex} result: {result}");
                    await ValidateResult(result, test.Assert);
                    Console.WriteLine($"Test {testIndex} completed successfully\n");

                    return new TestResult(testIndex, llmResponse);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Test {testIndex} failed: {ex.Message}");
                    Logger.LogTest($"Test {testIndex} failed: {ex.Message}");
                    return null;
                }
            });

            tasks.Add(task);
        }

        // Wait for all tests to complete and collect results
        var results = await Task.WhenAll(tasks);
        
        // Filter out null results (from failed tests) and return as read-only list
        return results.Where(r => r != null).ToList().AsReadOnly();
    }

    private async Task ValidateResult(string result, List<YamlConfig.Assertion> assertions)
    {
        foreach (var assertion in assertions)
        {
            switch (assertion.Type)
            {
                case "is-json":
                    ValidateJson(result);
                    break;

                case "javascript":
                    if (!string.IsNullOrEmpty(assertion.Value))
                    {
                        ValidateJavaScript(result);
                    }
                    break;

                default:
                    Console.WriteLine($"Warning: Unknown assertion type '{assertion.Type}'");
                    break;
            }
        }
    }

    private void ValidateJson(string result)
    {
        try
        {
            JsonDocument.Parse(result);
            var validationMessage = "✓ JSON validation passed: Valid JSON structure";
            Console.WriteLine(validationMessage);
            Logger.LogTest(validationMessage);
            Logger.LogDebug(validationMessage);
        }
        catch
        {
            throw new Exception("Response is not valid JSON");
        }
    }

    private void ValidateJavaScript(string result)
    {
        var jsonResult = JsonDocument.Parse(result).RootElement;
        
        if (!jsonResult.TryGetProperty("reason", out var reason) || 
            reason.ValueKind != JsonValueKind.String)
        {
            throw new Exception("Response must have a string 'reason' property");
        }

        if (!jsonResult.TryGetProperty("score", out var score) || 
            score.ValueKind != JsonValueKind.Number)
        {
            throw new Exception("Response must have a numeric 'score' property");
        }

        var scoreValue = score.GetDouble();
        if (scoreValue < 0 || scoreValue > 1)
        {
            throw new Exception($"Score must be between 0 and 1, got {scoreValue}");
        }

        Console.WriteLine("✓ JavaScript validation passed");
    }
} 