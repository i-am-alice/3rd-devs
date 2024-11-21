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

4. Uruchom dostępne przykłady z pliku `package.json`, według poniższej instrukcji.

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

UWAGA: Aby uruchomić ten przykład, musisz w panelu Langfuse utworzyć nowy prompt o nazwie `Answer`, którego wartość możesz ustawić na np. 'Odpowiadaj pisząc wyłącznie wielkimi literami'.

- Uruchomienie serwera: `bun langfuse`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hey there, what\'s up?"}]}'
  ```

Po wykonaniu zapytania, zostanie ono automatycznie zalogowane do Langfuse, a wynik wyświetlony w panelu.

### Tiktokenizer

- Uruchomienie serwera: `bun tiktokenizer`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hey there, what\'s up?"}], "model": "gpt-4o"}'
  ```

Przykład ten pokazuje mechanizm liczenia tokenów w zapytaniach do modeli OpenAI (np. gpt-4o).

### Max tokens

Przykład ten pokazuje jeden mechanizm pozwalający na kontynuowanie wypowiedzi modelu, pomimo osiągnięcia maksymalnej liczby tokenów wyjściowych (output tokens).

- Uruchomienie serwera: `bun max_tokens`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Write ten sentences about apples and put them in order."}]}'
  ```

### Constitution

Przykład ten przedstawia mechanizm blokowania zapytań, które nie spełniają warunków określonych w prompcie `/constitution/prompts.ts`.

- Uruchomienie serwera: `bun constitution`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
  ```

## S01E04

### Memory

Ten przykład po uruchomieniu tworzy katalog memories w którym zapisywane są pliki markdown, pełniące rolę pamięci modelu.
Nie jest to przykład nadający się na produkcję, lecz przedstawia ogólne mechaniki pamięci długoterminowej, które będziemy rozwijać w dalszych lekcjach.

- Uruchomienie serwera: `bun memory`
- Interakcja:

```bash
 curl -X POST http://localhost:3000/api/chat \
   -H "Content-Type: application/json" \
   -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

## S01E05

### External

Ten przykład zawiera standardową logikę interakcji z modelem, ale wymaga podania klucza API w nagłówku `Authorization` w formacie `Bearer <klucz>`. Wartość klucza zostaje wczytana z pliku `.env` jako `PERSONAL_API_KEY`. Dodatkowo zostały dodane mechanizmy ograniczania liczby zapytań, więc po kilku próbach ponowne wywołanie zapytania zwróci błąd 429.

- Uruchomienie serwera: `bun external`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
  ```

### Prompts

**UWAGA**: Aby uruchomić ten przykład konieczne jest nawiązanie połączenie z Langfuse poprzez uzupełnienie pliku `.env` o wartości `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` oraz `LANGFUSE_HOST`. Dodatkowo na Twoim koncie musisz utworzyć nowy prompt o nazwie `Answer`, którego wartość możesz ustawić na np. 'Odpowiadaj pisząc wyłącznie wielkimi literami', aby tylko sprawdzić działanie mechanizmu. Dodatkowo prompt "Answer" należy dodać w ustawieniu "Chat", a nie "Text" (tryb można zmienić z pomocą zakładek w Langfuse)

- Uruchomienie serwera: `bun prompts`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
  ```

### Database

Ten przykład nie dotyczy bezpośrednio działania LLM, lecz przedstawia sposób organizacji informacji w bazie danych, takich jak konwersacje czy historia wiadomości.

- Uruchomienie serwera: `bun database`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
  ```

### Qdrant

Przykład ten przedstawia **absolutnie podstawowe** połączenie z bazą wektorową Qdrant. Jego zadaniem jest zapisywanie historii wiadomości, a następnie wyszukiwanie i wczytywanie do kontekstu rozmowy najbardziej podobnych wiadomości. Przykład ten będziemy rozbudowywać w dalszych lekcjach, łącząc się z Qdrant w bardziej złożonych konfiguracjach.

UWAGA: Aby uruchomić ten przykład, musisz w panelu Langfuse utworzyć nowy prompt o nazwie `Answer`, którego wartość możesz ustawić na np. 'Odpowiadaj pisząc wyłącznie wielkimi literami'. Powodem jest fakt, że w ten przykład został powiązany z przykładem `langfuse`.

- Uruchomienie serwera: `bun qdrant`
- Interakcja:
  ```bash
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
  ```

## S02E01

### Audio

UWAGA: Ten przykład wymaga uruchomienia frontendu w folderze `audio-frontend` oraz backendu w folderze `audio-backend`. W związku z tym przykład **trzeba** uruchomić na własnym komputerze.

- Uruchomienie frontendu: `bun audio:dev`
- Uruchomienie backendu: `bun audio`
- Interakcja: Otwórz w przeglądarce stronę http://localhost:5173

WAŻNE: Jakość działania tego przykładu zależy głównie od jakości mikrofonu oraz dźwięków otoczenia. Upewnij się więc, że jakość nagrania jest dobra i że nie ma zakłóceń uniemożliwiających wykrywanie końca wypowiedzi.

## S02E02

### Vision

- Uruchomienie kodu: `bun vision`

### Recognize

- Uruchomienie kodu: `bun recognize`

### Recognize-Pixtral

Do uruchomienia tego przykładu należy uzupełnić plik `.env` o wartość `MISTRAL_API_KEY`. Można go pobrać tutaj na [Mistral.ai](https://auth.mistral.ai/ui/login?flow=d2707d87-5325-4ff5-a7cd-25a2e21323d5)

- Uruchomienie kodu: `bun recognize_pixtral`

## S02E02

### Vision

- Uruchomienie kodu: `bun vision`
- Interakcja: przykład wykonuje się automatycznie na pliku `vision/lessons.png`

### Recognize

- Uruchomienie kodu: `bun recognize`
- Interakcja: przykład wykonuje się automatycznie na plikach z katalogu `recognize/avatars`

### Recognize-Pixtral

- Uruchomienie kodu: `bun recognize_pixtral`
- Interakcja: przykład wykonuje się automatycznie na plikach z katalogu `recognize_pixtral/avatars`

## S02E03

--- brak przykładów ---

## S02E04

### Captions

- Uruchomienie kodu: `bun captions`
- Interakcja: przykład wykonuje się automatycznie na pliku `captions/article.md`

### Summary

- Uruchomienie kodu: `bun summary`
- Interakcja: skrypt wykonuje się automatycznie na pliku `summary/article.md`

### Video

Do uruchomienia tego przykładu należy uzupełnić plik `.env` o wartość `GOOGLE_AI_STUDIO_API_KEY`, który można pobrać z [Google AI Studio](https://aistudio.google.com/).

- Uruchomienie kodu: `bun video`
- Interakcja: przykład wykonuje się automatycznie na pliku `video/test.mp3`

### Narration

UWAGA: Ten przykład może zużywać duże ilości kredytów na ElevenLabs, więc jeśli chcesz zobaczyć rezultat jego działania, to w katalogu `narration` znajdują się dwa przykładowe pliki audio, które możesz odtworzyć bez uruchamiania kodu.

Do uruchomienia tego przykładu należy uzupełnić plik `.env` o wartość `GOOGLE_AI_STUDIO_API_KEY`, który można pobrać z [Google AI Studio](https://aistudio.google.com/) oraz `ELEVEN_LABS_API_KEY`, który można pobrać z [ElevenLabs](https://elevenlabs.io/).

- Uruchomienie kodu: `bun narration`
- Interakcja: przykład wykonuje się automatycznie na treści wiadomości użytkownika przekazanej w funkcji `generateNarration` w pliku `narration/app.ts`

## S02E05

### Read

- Uruchomienie kodu: `bun read`
- Interakcja: przykład wykonuje się automatycznie na pliku `read/article.md` i generuje plik audio w folderze read/summary.wav

### Mindmap

Ten przykład wymaga uruchomienia frontendu w folderze `audio-map-frontend` oraz backendu w folderze `audio-map`. W związku z tym przykład **trzeba** uruchomić na własnym komputerze.

- Uruchomienie frontendu: `bun map:dev`
- Uruchomienie backendu: `bun audio-map`
- Interakcja: Otwórz w przeglądarce stronę http://localhost:5173

### Notes

- Uruchomienie kodu: `bun notes`
- Interakcja: przykład wykonuje się automatycznie na wiadomości wpisanej w treść pliku `notes/app.ts` (jest tam kilka przykładów innych wiadomości, które można podmienić).

## S03E01

### Text Splitter

- Uruchomienie kodu: `bun text-splitter`
- Interakcja: przykład wykonuje się automatycznie na plikach markdown z katalogu "text-splitter"

### Unstructured

- Uruchomienie kodu: `bun unstructured`
- Interakcja: przykład wykonuje się automatycznie na pliku source.md z katalogu "unstructured"

## S03E02

### Embedding

Uruchomienie tego przykładu wymaga uzupełnienia pliku `.env` o wartości "QDRANT_URL" oraz "QDRANT_API_KEY".
Wartości te można znaleźć w panelu Qdrant po zalogowaniu na bezpłatne konto na stronie [Qdrant Cloud](https://cloud.qdrant.io/).

![Qdrant Cloud](https://cloud.overment.com/aidevs3_cluster-1732010353.png)

Natomiast klucz API można pobrać w zakładce "Data Access Control".

- Uruchomienie kodu: `bun embedding`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku embedding/app.ts

### Rerank

- Uruchomienie kodu: `bun rerank`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku rerank/app.ts

### Naive RAG

- Uruchomienie kodu: `bun naive-rag`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku naive-rag/app.ts

### Better RAG

- Uruchomienie kodu: `bun better-rag`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku better-rag/app.ts

### Semantic

- Uruchomienie kodu: `bun semantic`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku semantic/app.ts

## S03E03

### Algolia

Do uruchomienia tego przykładu konieczne jest uzupełnienie `ALGOLIA_APP_ID` oraz `ALGOLIA_API_KEY` w pliku `.env`.
**UWAGA**: przy pierwszym uruchomieniu przykładu pojawi się błąd ale spowoduje to utworzenie indeksu w Algolia. Wówczas należy przejść do panelu Algolia i w zakładce "Facets" dodać nowy facet o nazwie `author`.

![](https://cloud.overment.com/2024-11-20/aidevs3_algolia-09eeb970-2.png)

- Uruchomienie kodu: `bun algolia`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku algolia/app.ts

### Sync

**UWAGA**: Do uruchomienia tego przykładu konieczne jest uzupełnienie `ALGOLIA_APP_ID` oraz `ALGOLIA_API_KEY` w pliku `.env`.
Wymagane jest bezpłatne konto na [Algolia](https://www.algolia.com/).

Dodatkowo jeśli wyniki wyszukiwania nie są poprawnie zwracane, należy sprawdzić czy pole `text` zostało poprawnie ustawione w panelu Algolia jako `searchableAttributes`.

![Algolia](https://cloud.overment.com/2024-11-19/aidevs3_cleanshot-3e7fd444-c.png)

- Uruchomienie kodu: `bun sync`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku sync/app.ts

### Hybrid

**UWAGA**: Do uruchomienia tego przykładu konieczne jest uzupełnienie `QDRANT_URL` oraz `QDRANT_API_KEY` w pliku `.env`.
Konieczne jest także połączenie z Algolia podobnie jak w przypadku przykładu `sync`.

- Uruchomienie kodu: `bun hybrid`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku hybrid/app.ts

## S03E05

Do uruchomienia tego przykładu konieczne jest połączenie z bazą Neo4j. Można ją zainstalować lokalnie, a następnie uzupełnić plik `.env` o wartości `NEO4J_URI`, `NEO4J_USER` oraz `NEO4J_PASSWORD`.

### Neo4j-101

- Uruchomienie kodu: `bun neo4j-101`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku neo4j-101/app.ts

### Neo4j

- Uruchomienie kodu: `bun neo4j`
- Interakcja: przykład wykonuje się automatycznie na danych osadzonych w pliku neo4j/app.ts
