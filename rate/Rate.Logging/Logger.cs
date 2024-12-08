using System.Text;

namespace Rate.Logging;

public static class Logger
{
    private static readonly string LogDirectory = "Logs";
    private static readonly object LogLock = new();

    static Logger()
    {
        if (!Directory.Exists(LogDirectory))
        {
            Directory.CreateDirectory(LogDirectory);
        }
    }

    public static void LogTest(string message)
    {
        LogToFile("tests.log", message);
    }

    public static void LogDebug(string message)
    {
        LogToFile("debug.log", message);
    }

    public static void LogLLM(string message)
    {
        LogToFile("llm.log", message);
    }

    private static void LogToFile(string fileName, string message)
    {
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
        var logMessage = $"[{timestamp}] {message}{Environment.NewLine}";
        
        var filePath = Path.Combine(LogDirectory, fileName);
        lock (LogLock)
        {
            File.AppendAllText(filePath, logMessage);
        }
    }
} 