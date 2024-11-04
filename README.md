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
   git clone git@github.com:i-am-alice/3rd-devs.git
   cd 3rd-devs
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
- Interakcja demo: `curl -X POST http://localhost:3000/api/demo`
- Interakcja chat: `curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message": { "role": "user", "content": "Hi"}}'`

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

## S01E02

### Linear

Uruchomienie tego przykładu wymaga uzupełnienia pliku `.env` i wartości `LINEAR_API_KEY` oraz `LINEAR_WEBHOOK_SECRET`.
Obie wartości można znaleźć w [ustawieniach API](https://linear.app/overment/settings/api). Dodatkowo Twój localhost musi być dostępny z poza Twojej sieci lokalnej, np. za pomocą [ngrok](https://ngrok.com/). Publiczny adres URL należy także wskazać w panelu Linear w sekcji Webhooks, np.: `https://<ngrok-url>/api/linear/watch-issue` (pamiętaj o dodaniu właściwego endpointu do adresu).

WAŻNE: w pliku `linear/prompts.ts` znajduje się prompt w którym zostały opisane **moje projekty** w Linear. 
Aby skrypt działał poprawnie, musisz zmodyfikować ten prompt, tak aby zawierał identyfikatory oraz opisy Twoich projektów.

Listę projektów i ich identyfikatory możesz pobrać korzystając z endpointu `/api/linear/projects`.

- Uruchomienie serwera: `bun linear`
- Pobranie listy projektów: `curl http://localhost:3000/api/linear/projects`
- Po dodaniu nowego wpisu w Twoim linearze, zostanie on automatycznie przypisany do projektu zgodnie z zasadami w promptach, o ile nie został przypisany przez Ciebie ręcznie.

### Files

- Uruchomienie serwera: `bun files`
- Interakcja: 
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hey there, what\'s up?"}], "conversation_id": "d7582176-bc52-4ef3-980a-047b868f9f49"}'
  ```

Przykład ten pokazuje mechanizm podejmowania decyzji o zapamiętywaniu informacji na podstawie kontekstu rozmowy. 
Dodatkowo w przypadku podania `conversation_id` w obiekcie żądania, do rozmowy zostaną wczytane wszystkie wiadomości dotyczące konkretnej rozmowy.

Wszystkie pliki zapisywane są w folderze `files/context`, a sam katalog można otworzyć w aplikacji [Obsidian](https://obsidian.md/) aby zobaczyć powiązania pomiędzy wspomnieniami.

## S01E03

### Langfuse

Ten przykład wymaga uzupełnienia pliku `.env` o wartości `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` oraz `LANGFUSE_HOST`. Można je uzyskać zakładając bezpłatne konto na [Langfuse](https://langfuse.com/).

- Uruchomienie serwera: `bun langfuse`
- Interakcja: 
  ```bash
  curl http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hey there, what\'s up?"}]}'
  ```

Po wykonaniu zapytania, zostanie ono automatycznie zalogowane do Langfuse, a wynik wyświetlony w panelu.

### Tiktokenizer

- Uruchomienie serwera: `bun tiktokenizer`
- Interakcja:
  ```bash
  curl http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hey there, what\'s up?"}], "model": "gpt-4o"}'
  ```

Przykład ten pokazuje mechanizm liczenia tokenów w zapytaniach do modeli OpenAI (np. gpt-4o).

### Max tokens

Przykład ten pokazuje jeden mechanizm pozwalający na kontynuowanie wypowiedzi modelu, pomimo osiągnięcia maksymalnej liczby tokenów wyjściowych (output tokens).

- Uruchomienie serwera: `bun max_tokens`
- Interakcja: 
  ```bash
  curl http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Write ten sentences about apples and put them in order."}]}'
  ```

### Constitution

Przykład ten przedstawia mechanizm blokowania zapytań, które nie spełniają warunków określonych w prompcie `/constitution/prompts.ts`.

- Uruchomienie serwera: `bun constitution`
- Interakcja:
  ```bash
  curl http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
  ```
