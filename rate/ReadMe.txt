Zakładanie sekretów

//dotnet user-secrets init
//dotnet user-secrets set "OpenAI:ApiKey" "twój-klucz-api"

dotnet user-secrets init --id 3rd-devs-secrets
dotnet user-secrets set "OpenAI:ApiKey" "twój-klucz-api" --id 3rd-devs-secrets

Klucze przechowywane są w:
"%APPDATA%\Microsoft\UserSecrets\3rd-devs-secrets\secrets.json" (np. "C:\Users\wj78\AppData\Roaming\Microsoft\UserSecrets\3rd-devs-secrets\secrets.json")
