# AI_devs 3

Repozytorium zawiera przykłady z lekcji kursu AI_devs 3. 
Więcej informacji znajdziesz na [aidevs.pl](https://aidevs.pl).

## Wymagania

Wszystkie przykłady zostały napisane w JavaScript / TypeScript i większość z nich zawiera kod backendowy do którego uruchomienia potrzebny jest Node.js oraz Bun.

- [Node.js](https://nodejs.org)
- [Bun](https://bun.sh)

Upewnij się, że posiadasz najnowsze wersje Node.js oraz Bun zainstalowane na swoim komputerze.

## Instalacja

1. Pobierz repozytorium:
   ```bash
   git clone https://github.com/twojnazwauzytkownika/aidevs3-examples.git
   cd aidevs3-examples
   ```

2. Zainstaluj zależności:
   ```bash
   bun install
   ```
3. Skopiuj plik `.env.example` do `.env` i wypełnij go kluczami API (na początek wystarczy klucz OpenAI).

3. Uruchom dostępne przykłady z pliku `package.json`, według poniższej instrukcji.

## S01E01

### Thread

Przykład przedstawia konwersację między użytkownikiem i asystentem, w której działa mechanizm podsumowania konwersacji.

- Uruchomienie serwera: `bun run thread`
- Interakcja: `curl http://localhost:3000/api/demo`

Wywołanie powyższego endpointu uruchomi trzy niezależne zapytania do OpenAI, jednak w wiadomości systemowej zostanie przekazane podsumowanie poprzedniej interakcji, dzięki czemu model będzie miał możliwość odwołać się do ich treści.

W przykładzie uwzględniony jest także endpoint `/api/chat` na który można przesłać obiekt { "message": "..." } zawierający treść wiadomości do modelu. Wątek zostanie zresetowany **dopiero po ponownym uruchomieniu serwera** (wciśnij CMD + C / Control + C i ponownie `bun run thread`).

### Use Search

UWAGA: przykład wymaga zainstalowania `promptfoo` w przypadku którego prawdopodobnie musisz to zrobić poleceniem `npm install promptfoo` ponieważ `bun install promptfoo` nie działa poprawnie w każdej sytuacji.

- Uruchomienie skryptu: `bun use_search`

Rezultatem działania skryptu jest tablica zawierająca kilkanaście przykładowych testów dla promptu decydującego o tym, czy skorzystanie z wyszukiwarki jest potrzebne. 

### Pick domains

- Uruchomienie skryptu: `bun pick_domains`

Rezultatem działania skryptu jest tablica zawierająca kilkanaście przykładowych testów dla promptu generującego zapytania do wyszukiwarki Internetowej, wskazując także odpowiednie domeny.

### Rate

- Uruchomienie skryptu: `bun rate`

Rezultatem działania skryptu jest tablica zawierająca kilkanaście przykładowych testów dla promptu oceniającego, czy odpowiedź modelu zawiera odpowiednie informacje.

### Websearch

Przykład ten korzysta z [Firecrawl](https://www.firecrawl.dev) do przeszukiwania Internetu oraz pobierania treści stron www. Konieczne jest więc uzupełnienie pliku `.env` wartości FIRECRAWL_API_KEY ustawionej na klucz API.
(Firecrawl oferuje bezpłatny plan).

- Uruchomienie serwera: `bun websearch`
- Interakcja: 
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Search wiki for 'John Wick'"}]}'
  ```

Ważne: w pliku `websearch/app.ts` można zmienić listę domen, które są dopuszczalne do przeszukiwania i pobierania treści.