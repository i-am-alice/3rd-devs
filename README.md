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

