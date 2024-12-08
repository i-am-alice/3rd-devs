using Rate.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Rate.Common;
using Rate.Providers;

namespace Rate.Testing;

public class Examples
{
    public static async Task<string> RunExample(EvaluationRequest request)
    {
        Console.WriteLine("Loading configuration...");
        var secretsConfig = RateConfig.Load();
        var yamlConfig = YamlConfig.Load("rate.yaml");
        Console.WriteLine("Configuration loaded successfully.");

        Console.WriteLine("\nConfiguring services...");
        var services = new ServiceCollection();
        services.AddHttpClient("OpenAI", client =>
        {
            client.BaseAddress = new Uri("https://api.openai.com/");
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        Console.WriteLine("\nInitializing OpenAI provider...");
        var serviceProvider = services.BuildServiceProvider();
        var httpClientFactory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        var provider = new OpenAIProvider(
            httpClientFactory, 
            secretsConfig.OpenAIApiKey,
            yamlConfig.Providers.First()  // Use first provider from YAML config
        );
        var evaluator = new RateEvaluator(provider);

        Console.WriteLine("\nProcessing request...");

        Console.WriteLine("\nCreating prompt...");
        var messages = await evaluator.CreatePromptAsync(request);
        Console.WriteLine("Sending request to OpenAI...");
        var result = await provider.GetCompletionAsync(messages);
        
        Console.WriteLine("\nResult:");
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine(result);
        Console.ResetColor();
        return result;
    }
}
