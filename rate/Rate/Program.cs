using Rate;
using Rate.Configuration;
using System.Text.Json;
using Rate.Logging;
using Rate.Models;
using Rate.Testing;

try
{
    var config = YamlConfig.Load("rate.yaml");
    var message = $"Loaded {config.Tests.Count} tests from rate.yaml";
    Console.WriteLine(message + "\n");
    Logger.LogDebug(message);

    var testRunner = new TestRunner(config);
    var results = await testRunner.RunTests();
    var bestResults = results.GetBestResults();

    if (bestResults.Any())
    {
        var maxScore = bestResults.First().Response.Score;
        var resultMessage = $"\nBest scoring results (score: {maxScore}):\n" + 
            string.Join("\n", bestResults.Select(r => $"Test {r.TestNumber}: {r.Response}"));
        
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine(resultMessage);
        Console.ResetColor();
        
        Logger.LogTest(resultMessage);
    }

    Console.WriteLine("All tests completed successfully!");
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Yellow;
    Console.WriteLine("\n=== Exception Details ===");
    Console.WriteLine($"Type: {ex.GetType().Name}");
    Console.WriteLine($"Message: {ex.Message}");
    
    if (ex.InnerException != null)
    {
        Console.WriteLine("\n=== Inner Exception ===");
        Console.WriteLine($"Type: {ex.InnerException.GetType().Name}");
        Console.WriteLine($"Message: {ex.InnerException.Message}");
    }
    
    Console.WriteLine("\n=== Stack Trace ===");
    Console.WriteLine(ex.StackTrace);
    Console.ResetColor();
    
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"Error: {ex.Message}");
    Console.ResetColor();
    Environment.Exit(1);
}

Console.WriteLine("\nPress any key to exit...");
Console.ReadKey(); 