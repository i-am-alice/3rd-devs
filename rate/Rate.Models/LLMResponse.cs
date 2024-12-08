namespace Rate.Models;

public class LLMResponse
{
    public string Reason { get; set; } = string.Empty;
    public double Score { get; set; }

    public override string ToString()
    {
        return $"Score: {Score}, Reason: {Reason}";
    }
} 