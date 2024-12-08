using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using Rate.Logging;
using Rate.Configuration;
using Rate.Common;

namespace Rate.Providers;

public class OpenAIProvider : ILanguageModelProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _model;

    public OpenAIProvider(IHttpClientFactory httpClientFactory, string apiKey, YamlConfig.LLMProvider provider)
    {
        _httpClient = httpClientFactory.CreateClient("OpenAI");
        _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
        _model = provider.Model;
        Logger.LogDebug($"Initializing OpenAI provider with model: {_model}");
    }

    public async Task<string> GetCompletionAsync(Message[] messages)
    {
        Logger.LogLLM($"Request to OpenAI:\n{JsonSerializer.Serialize(messages, new JsonSerializerOptions { WriteIndented = true })}");
        
        var requestBody = new
        {
            model = _model,
            messages = messages.Select(m => new
            {
                role = m.Role,
                content = m.Content
            })
        };

        var response = await _httpClient.PostAsJsonAsync(
            "v1/chat/completions",
            requestBody
        );

        response.EnsureSuccessStatusCode();
        
        var result = await response.Content.ReadFromJsonAsync<OpenAIResponse>();
        var content = result?.Choices?[0]?.Message?.Content ?? 
            throw new Exception("Failed to get completion from OpenAI");

        Logger.LogLLM($"Response from OpenAI:\n{content}");
        
        return content;
    }

    private class OpenAIResponse
    {
        public Choice[]? Choices { get; set; }
        
        public class Choice
        {
            public ResponseMessage? Message { get; set; }
        }

        public class ResponseMessage
        {
            public string? Content { get; set; }
        }
    }
}
