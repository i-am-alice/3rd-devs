using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;

namespace Rate.Configuration;

public class RateConfig
{
    public required string OpenAIApiKey { get; init; }
    public required ApiSettings ApiSettings { get; init; }
    public required TestSettings TestSettings { get; init; }

    public static RateConfig Load()
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")}.json", optional: true)
            .AddEnvironmentVariables()
            .AddUserSecrets<RateConfig>()
            .Build();

        var config = new RateConfig
        {
            OpenAIApiKey = configuration["OpenAI:ApiKey"] 
                ?? throw new InvalidOperationException("OpenAI API key not found in configuration"),
            ApiSettings = configuration.GetSection("ApiSettings").Get<ApiSettings>()
                ?? new ApiSettings(),
            TestSettings = configuration.GetSection("TestSettings").Get<TestSettings>()
                ?? new TestSettings()
        };

        return config;
    }
}

public class ApiSettings
{
    public string BaseUrl { get; set; } = "https://api.openai.com/v1/";
    public int TimeoutSeconds { get; set; } = 30;
    public int MaxRetries { get; set; } = 3;
}

public class TestSettings
{
    public int DefaultTimeoutSeconds { get; set; } = 60;
    public bool ParallelExecution { get; set; } = true;
    public string OutputDirectory { get; set; } = "TestResults";
} 