using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;
using Rate.Logging;

namespace Rate.Configuration;

public class YamlConfig
{
    public string Description { get; set; } = string.Empty;
    public List<string> Prompts { get; set; } = new();
    public List<LLMProvider> Providers { get; set; } = new();
    public List<TestCase> Tests { get; set; } = new();

    public class TestCase
    {
        public Dictionary<string, string> Vars { get; set; } = new();
        public List<Assertion> Assert { get; set; } = new();
    }

    public class Assertion
    {
        public string Type { get; set; } = string.Empty;
        public string? Value { get; set; }
    }

    public class LLMProvider
    {
        private readonly string _providerString;

        public LLMProvider(string provider)
        {
            _providerString = provider;
            var parts = provider.Split(':');
            if (parts.Length == 3)
            {
                Provider = parts[0];
                Type = parts[1];
                Model = parts[2];

                if (Provider != "openai")
                {
                    throw new ArgumentException($"Unsupported provider '{Provider}'. Only 'openai' is supported!");
                }

                if (Type != "chat")
                {
                    throw new ArgumentException($"Unsupported type '{Type}'. Only 'chat' is supported!");
                }
            }
            else
            {
                throw new ArgumentException($"Unsupported provider '{provider}'!");
            }
        }

        public string Provider { get; } = string.Empty;
        public string Type { get; } = string.Empty;
        public string Model { get; } = string.Empty;

        public static implicit operator LLMProvider(string provider) => new(provider);
        public static implicit operator string(LLMProvider provider) => provider._providerString;
    }

    public static YamlConfig Load(string path)
    {
        var yaml = File.ReadAllText(path);

        // Fix multi-line strings in context
        var lines = yaml.Split('\n');
        var fixedLines = new List<string>();
        bool inContext = false;
        
        for (int i = 0; i < lines.Length; i++)
        {
            var line = lines[i].TrimEnd();
            if (line.Contains("context:"))
            {
                // Convert multi-line context to single line with \n
                var contextBuilder = new System.Text.StringBuilder();
                contextBuilder.Append(line);
                i++;
                
                while (i < lines.Length && 
                      (lines[i].StartsWith("\\n") || lines[i].Contains("Title:") || 
                       lines[i].Contains("Link:") || lines[i].Contains("Snippet:")))
                {
                    contextBuilder.Append(lines[i].TrimEnd());
                    i++;
                }
                i--; // Back one step as we went too far
                
                fixedLines.Add(contextBuilder.ToString());
            }
            else
            {
                fixedLines.Add(line);
            }
        }
        
        yaml = string.Join("\n", fixedLines);

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        try 
        {
            return deserializer.Deserialize<YamlConfig>(yaml);
        }
        catch (YamlException ex)
        {
            var errorContext = $"Near line {ex.Start.Line}, column {ex.Start.Column}";
            var errorMessage = $"\nYAML parsing error: {errorContext}";
            Console.WriteLine(errorMessage);
            Logger.LogDebug(errorMessage);
            
            var contentMessage = "Content around error:";
            Console.WriteLine(contentMessage);
            Logger.LogDebug(contentMessage);
            
            var errorLines = yaml.Split('\n');
            for (int i = Math.Max(0, ex.Start.Line - 2); i < Math.Min(errorLines.Length, ex.Start.Line + 2); i++)
            {
                var lineMessage = $"{i + 1}: {errorLines[i]}";
                Console.WriteLine(lineMessage);
                Logger.LogDebug(lineMessage);
            }
            throw new Exception($"Error parsing YAML file: {ex.Message}\nLine: {ex.Start.Line}, Column: {ex.Start.Column}", ex);
        }
    }
} 