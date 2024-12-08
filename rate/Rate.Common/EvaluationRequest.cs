namespace Rate.Common;

public record EvaluationRequest(string Context, string Query);

public record Message
{
    public required string Role { get; init; }
    public required string Content { get; init; }
}

public interface ILanguageModelProvider
{
    Task<string> GetCompletionAsync(Message[] messages);
}
