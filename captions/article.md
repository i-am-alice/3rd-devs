# S02E01 — Audio i interfejs głosowy

![](https://cloud.overment.com/S02E01-1727094804.png)

[Duże modele językowe](glossary/LLM.md) umożliwiają swobodne przetwarzanie języka naturalnego. W połączeniu z modelami [Text to Speech](glossary/Text%20to%20Speech.md) i [Speech to Text](glossary/Speech%20to%20Text.md), możemy projektować zaawansowane interfejsy głosowe, które jeszcze kilka lat temu były poza zasięgiem technologii. Otwiera to kolejny rozdział rozwoju interfejsów głosowych oraz narzędzi zdolnych do przetwarzania nagrań audio i wideo.

Na rynku pojawiają się narzędzia oferujące zarówno dostęp do modeli TTS/STT, jak i kompletne rozwiązania dla wybranych zastosowań. Przykładowo, [Happyscribe](https://www.happyscribe.com/) to świetne rozwiązanie dla transkrypcji, które dodatkowo udostępnia API. W tym przypadku, zamiast tworzyć własne rozwiązanie do przetwarzania długich materiałów audio/wideo od podstaw, znacznie lepiej jest skorzystać z gotowego narzędzia.

Natomiast w przypadku platform takich jak [ChatGPT](services/ChatGPT.md) i świetnego "Voice Mode", możliwości personalizacji doświadczeń są bardzo ograniczone. Wówczas uzasadnione może być zbudowanie własnej integracji od podstaw, wykorzystując przy tym naszą wiedzę na temat generatywnego AI oraz programistyczne umiejętności. 

W tej lekcji skupimy się na zbudowaniu własnej integracji, w której połączymy modele [Text to Speech](glossary/Text%20to%20Speech.md), [Speech to Text](glossary/Speech%20to%20Text.md) oraz [LLM](glossary/LLM.md). Celem jest stworzenie interfejsu umożliwiającego głosową rozmowę z modelem, bez konieczności używania klawiatury czy przycisków.

![Interfejs głosowy umożliwiający interakcję z LLM w formie 'rozmowy telefonicznej', bez konieczności ręcznej kontroli z pomocą przycisków](https://cloud.overment.com/2024-09-22/aidevs3_voiceui-da474703-1.png)

## Audio od strony programistycznej

W tej lekcji omówimy przykład `audio` składający się także z interfejsu dostępnego w katalogu `audio-frontend`. Znajduje się w nich dość złożona logika związana z obsługą mikrofonu, odtwarzania audio, animacji z HTML cavas czy komunikacji z back-endem. Jeśli nie pracujesz w JavaScript lub obszar front-endu czy back-endu nie są Ci znane, to w tej lekcji skup się na mechanikach, które będziemy omawiać, a nie na szczegółach implementacji.

W przypadku, gdy będziesz chciał bliżej eksplorować wymienione przykłady, a temat przetwarzania audio jest dla Ciebie nowy, skorzystaj z pomocy modeli (w szczególności Sonnet 3.5 oraz o1) oraz dokumentacji API przeglądarek na stronie [MDN](https://developer.mozilla.org).

## Obecne możliwości TTS, STT oraz generatywnego audio

Modele [Text to Speech](glossary/Text%20to%20Speech.md) i [Speech to Text](glossary/Speech%20to%20Text.md) rozwijają się dość szybko, ale u ich podstaw leżą podobne koncepcje jak w przypadku modeli językowych, co przekłada się także na podobne ograniczenia (np. [konfabulacje](glossary/Konfabulacja.md), ograniczona sterowność czy limit [okna tokenów](glossary/Context%20Window.md)), o których za chwilę się przekonamy.

Budowanie interfejsu audio składa się z trzech głównych komponentów: 

- **Wejście**: źródło dźwięku - mikrofon lub plik audio
- **Logika**: przetwarzanie - transkrypcja i generowanie odpowiedzi
- **Wyjście**: efekt końcowy - strumieniowane audio lub plik dźwiękowy

Zatem zwykle będziemy potrzebować tutaj trzech modeli:

- Speech to Text: np. [Whisper](tools/Whisper.md), [Deepgram](services/Deepgram.md) lub [AssemblyAI](services/AssemblyAI.md) (wspiera rozpoznawanie rozmówców, czyli tzw. diaryzację)
- Text to Text: czyli duże modele językowe od [OpenAI](services/OpenAI.md), [Anthropic](services/Anthropic.md) czy innych
- Text to Speech: np. [OpenAI](services/OpenAI.md) TTS, [ElevenLabs](services/ElevenLabs.md) czy [Neets.ai](https://neets.ai/)

Już teraz skuteczność generowanych transkrypcji jest wysoka, lecz nie perfekcyjna. Można się o tym przekonać samodzielnie dzięki platformie [Groq](services/Groq.md) na której mamy dostęp do [Whisper Large v3](tools/Whisper.md). Widzimy tam od razu, że Whisper wspiera formaty takie jak flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav i webm, a rozmiar pliku ograniczony jest do 25MB. Oznacza to, że w przypadku dłuższych plików, konieczne będzie przeprowadzenie kompresji lub podziału na mniejsze fragmenty. 

![](https://cloud.overment.com/2024-09-22/aidevs3_whisper-6cc958bc-1.png)

Transkrypcja bardzo często musi uwzględniać nazwy własne lub słowa kluczowe charakterystyczne dla przetwarzanej treści. Dlatego, aby zwiększyć prawdopodobieństwo poprawnej transkrypcji, możemy skorzystać z promptu systemowego, który może zawierać nasz własny słownik. W przeciwieństwie do [LLM](glossary/LLM.md), nie mówimy tutaj o instrukcjach, za którymi model ma podążać, lecz bardziej o fragmencie treści, który po prostu poprzedza treść transkrypcji. Nierzadko w przypadku automatyzacji, treść promptu systemowego ustawia się na transkrypcję z poprzedniego fragmentu nagrania. Tutaj limit tokenów ograniczony jest do 224 (encodowanych z pomocą [Multilingual Whisper tokenizer](https://github.com/openai/whisper/blob/main/whisper/tokenizer.py#L361)). Więcej na temat promptów dla modelu Whisper można przeczytać w [OpenAI Cookbook: Whisper Prompting Guide](https://cookbook.openai.com/examples/whisper_prompting_guide). 

![](https://cloud.overment.com/2024-09-22/aidevs3_audioprompt-6628ec95-1.png)

Whisper posiada także bardzo wyraźny problem związany z przetwarzaniem ciszy oraz bardzo krótkich fragmentów tekstu (np. poleceń). Dla poniższego, 5-sekundowego nagrania ciszy, zwrócona transkrypcja zawiera tekst "Thank you". Czasem może być to tekst w innym języku, lub określenia charakterystyczne dla końcówki filmu YouTube (np. dzięki za oglądanie). Oznacza to, że powinniśmy unikać przetwarzania fragmentów audio, które nie zawierają wypowiedzi.  

![](https://cloud.overment.com/2024-09-22/aidevs3_silence-fc37cd91-0.png)

Warto także wiedzieć, że model Whisper można z powodzeniem uruchomić na swoim komputerze, a dzięki projektom takim jak [Insanely Fast Whisper](https://github.com/Vaibhavs10/insanely-fast-whisper) może okazać się bardzo skutecznym rozwiązaniem. 

Tymczasem, jeśli chodzi o modele [Text to Speech](glossary/Text%20to%20Speech.md), to na przestrzeni 2023-2024 roku obserwowaliśmy ich znaczący rozwój nie tylko pod kątem jakości wypowiedzi, ale także **klonowania głosów** oraz symulowania emocji, a także dźwięków takich jak śmiech, oddech, czy nawet śpiew (tutaj przykładem jest [suno.ai](https://www.suno.ai/)). 

W naszym przypadku zazwyczaj będziemy zamieniać tekst na głos, głównie na potrzeby nowych treści (np. odpowiedzi bota czy prywatny podcast). Powodem jest fakt, że nadal dużym wyzwaniem pozostaje przetwarzanie istniejących treści, takich jak tłumaczenie filmów, ze względu na potrzebę synchronizacji dźwięku z oryginalną ścieżką. Drugie wyzwanie dotyczy możliwości sterowania sposobem wypowiedzi. Przykładowo, wpływ na intonację czy sposób wymowy określonych fraz jest niemal zerowy.

Warto także dodać, że na rynku pojawiają się modele Speech to Speech (lub voice to voice), takie jak [Hume.ai](https://www.hume.ai/), który potrafi rozpoznawać emocje rozmówcy. Oznacza to, że dane wejściowe mają znacznie większy wpływ na generowane audio. Z drugiej strony, nadal konieczne jest uwzględnienie logiki pozwalającej na połączenie modelu z zewnętrznymi narzędziami oraz źródłami wiedzy. W takiej sytuacji będzie zależało nam na przetworzeniu audio tak, abyśmy mogli podjąć wszystkie wymagane kroki przed wygenerowaniem odpowiedzi.

![Interakcja głosowa niemal zawsze będzie wymagała dodatkowej logiki, umożliwiającej dostęp do narzędzi i/lub pamięci długoterminowej](https://cloud.overment.com/2024-09-22/aidevs3_audioui-541fc154-1.png)

Za chwilę przejdziemy do zaimplementowania tej logiki w praktyce, jednak już teraz powinno być oczywiste to, jak możemy wykorzystać omawiane przykłady takie jak `memory` czy `linear` z interfejsem audio.
## Przechwytywanie źródeł dźwięku i formaty audio

W przykładzie `audio-frontend`, w pliku `app.ts` znajduje się funkcja `startRecording`, która odpowiada za połączenie z mikrofonem oraz analizę ścieżki dźwiękowej na potrzeby wizualizacji, wykrywania ciszy oraz transkrypcji. Mając do dyspozycji takie dane, jesteśmy w stanie budować bufor z nagraniem audio i stopniowo przesyłać go do [OpenAI](services/OpenAI.md) lub [Groq](services/Groq.md) w celu transkrypcji. Natomiast gdy użytkownik przestanie mówić, przesyłamy treść wiadomości do [czatu z dużym modelem językowym](glossary/LLM.md).

![](https://cloud.overment.com/2024-09-22/aidevs3_recording-9d146326-4.png)

Zatem ogólny schemat wygląda następująco: 

1. **Mikrofon:** Łączymy się z mikrofonem i podłączamy **monitorowanie** ścieżki dźwiękowej
2. **Wykrywanie ciszy:** Na podstawie aktualnego poziomu audio wykrywamy to, czy użytkownik w danej chwili coś mówi. Jeśli cisza zostaje przerwana, rozpoczyna się rejestrowanie nagrania.
3. **Transkrypcja:** Transkrypcja aktualizowana jest co 1 sekundę, na podstawie dotychczasowego nagrania.
4. **Odpowiedź:** Gdy nastąpi cisza na przynajmniej 1 sekundę, rejestracja zostaje wstrzymana i rozpoczyna się generowanie odpowiedzi asystenta, a następnie odtworzenie jej
5. **Kolejna tura:** Po zakończeniu wypowiedzi asystenta, bufor z nagraniem zostaje zresetowany i rozpoczyna się kolejna tura wypowiedzi użytkownika
6. **Pętla:** Proces jest powtarzany aż do zakończenia połączenia

W tym przypadku posługujemy się formatem `.wav`, który pozwala nam na podział nagrania na fragmenty i przetwarzania ich niezależnie. Alternatywnie moglibyśmy skorzystać z formatu `.ogg`, który dzięki kompresji pozwoliłby nam na zmniejszenie rozmiaru przesyłanych danych, natomiast zdecydowałem się na redukcję częstotliwości próbkowania do 16,000 Hz mono. 

W przykładzie `audio-frontend` unikam stosowania zewnętrznych bibliotek, lecz produkcyjnie jest to wskazane ze względu na wsparcie przeglądarek czy łatwiejsze wykrywanie ciszy w nagraniu. Jednak wybór samych narzędzi będzie różnił się w zależności od projektu oraz technologii, z którą pracujemy.
## Generowanie transkrypcji i rozpoznawanie rozmówcy

Wspomniałem, że narzędzia takie jak [Happyscribe](https://www.happyscribe.com/) czy [AssemblyAI](services/AssemblyAI.md) sprawdzają się znacznie lepiej w przypadku transkrypcji dłuższych formatów treści (np. podcastów, filmów czy nagrań ze spotkań). I choć w niektórych przypadkach zastosowanie modelu [Whisper](tools/Whisper.md) czy podobnej alternatywy może być wskazane (np. ze względu na koszty), tak chociażby poniższy interfejs zwykle będzie wystarczającym powodem do tego, aby skorzystać z gotowych rozwiązań. 

![](https://cloud.overment.com/2024-09-23/aidevs3_transcript-d0bbfb89-b.png)

Dostępność API obu wymienionych narzędzi dodatkowo uzasadnia ich wybór, ponieważ nadal możemy mieć korzyść wynikającą z częściowej automatyzacji procesu. 

Jeśli jednak zdecydujesz się na pracę z modelem [Whisper](tools/Whisper.md), to najwięcej uwagi będzie wymagać podział nagrania na fragmenty, co widzimy w przykładzie `audio` oraz `audio-frontend`, więc nie będziemy tego dodatkowo omawiać. 
## Interfejs użytkownika i interakcja w czasie rzeczywistym

Przykłady `audio` oraz `audio-frontend` **należy uruchomić jednocześnie**, aby uzyskać dostęp do wizualnego interfejsu umożliwiającego rozmowę z [LLM](glossary/LLM.md) w czasie rzeczywistym. Serwer aplikacji będzie zatem działać pod adresem `localhost:3000`, natomiast front-end będzie dostępny w przeglądarce pod adresem `http://localhost:5173`. Zobaczmy więc, jak działa cały ten mechanizm na poniższym filmie.

<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1011982841?h=f0c8754030&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="02_01_audio"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

Wizualizując logikę przykładu `audio` widzimy, że nie ma w niej szczególnie zaskakujących elementów, ale musimy pamiętać o kilku detalach wpływających na jakość interakcji. 

Mowa tutaj o: 

1. **Jakość audio:** Umożliwieniu użytkownikowi wcześniejsze zweryfikowanie jakości nagrania audio, w celu uniknięcia generowania niepoprawnej transkrypcji
2. **Cisza:** Dynamicznego wykrywania poziomu ciszy, na podstawie którego system rozpozna moment w którym użytkownik przestaje mówić. Potencjalnie mechanika ta może być wykorzystana także w celu przerywania wypowiedzi asystenta.
3. **Kontekst:** Jakość transkrypcji zależy nie tylko od nagrania audio, ale także od nadanego kontekstu, ze szczególnym uwzględnieniem słów kluczowych charakterystycznych dla użytkownika (np. imię).
4. **Potwierdzenie:** W przypadku interfejsu zdolnego do posługiwania się narzędziami, warto rozważyć także konieczność potwierdzenia wykonania akcji, np. z pomocą przycisków bądź głosu.
5. **Korekta:** Wygenerowana transkrypcja może być dodatkowo przetworzona przez model językowy w celu formatowania i poprawy błędów.

![](https://cloud.overment.com/2024-09-23/aidevs3_voice-aab7724c-0.png)

Patrząc na interfejs głosowy, możemy wziąć pod uwagę także wszystko to, czego nauczyliśmy się do tej pory w temacie interakcji z [LLM](glossary/LLM.md), a także łączenia go z zewnętrznymi narzędziami czy pamięcią długoterminową.

Poza tym, nic nie stoi na przeszkodzie, aby interakcja głosowa odbywała się nie z człowiekiem, lecz pomiędzy dwoma [agentami AI](glossary/Agent.md), podobnie jak ma to miejsce w przypadku [NotebookLM](https://notebooklm.google/), gdzie możemy wygenerować rozmowę na temat naszych dokumentów.
## Techniki optymalizacji generowania audio

W przykładzie `audio` możliwe jest zmniejszenie czasu reakcji poprzez przełączenie transkrypcji na usługę [Groq](services/Groq.md) oraz generowania odpowiedzi asystenta przez usługę [ElevenLabs](services/ElevenLabs.md) z modelem "turbo". Nie jest to jednak koniec optymalizacji, ponieważ możemy popracować jeszcze nad zmianą formatu `wav` na `ogg`, a także nad zastosowaniem strumieniowania. 

Konkretnie odpowiedź generowana przez asystenta może być zwracana fragmentami i w ten sposób przesyłana do [ElevenLabs](services/ElevenLabs.md), które umożliwia także [strumieniowania](glossary/Streaming.md) generowanego nagrania. Oznacza to, że: 

- Pierwszy fragment wypowiedzi asystenta (np. pierwsze zdanie, lub wypowiedź do pierwszego przecinka) jest wystarczająca do rozpoczęcia generowania audio.
- Sama odpowiedź audio, również może trafić do kolejki odtwarzania

W ten sposób możemy zredukować czas reakcji, osiągając wyniki nawet poniżej jednej sekundy. Jednak w praktyce zaoszczędzony czas będzie nam potrzebny na logikę odpowiedzialną za zbudowanie kontekstu lub podjęcie decyzji o wyborze narzędzi. Utrzymanie interakcji w czasie rzeczywistym staje się dużym wyzwaniem i wymaga zastosowania technik optymalizacji generowania treści, o których już rozmawialiśmy. Konkretnie mam na myśli:

- Zastosowanie [strumieniowania](glossary/Streaming.md) tam, gdzie jest to możliwe
- Równoległe wykonanie tych akcji, które nie są od siebie zależne
- Zastosowanie mniejszych modeli i/lub skorzystanie z platform oferujących szybką [inferencję](glossary/Inferencja.md)
- Skrócenie wypowiedzi modelu
- Zastosowanie platform takich jak [Hume.ai](https://hume.ai/) czy [Bland.ai](https://www.bland.ai/) w sytuacji gdy zależy nam na budowaniu interfejsów umożliwiających rozmowy z LLM
## Podsumowanie

Powszechnie wiadomo, że użyteczność interfejsów głosowych w ostatnich latach była bardzo niska lub pozwalała jedynie na bardzo proste interakcje z urządzeniami. Teraz nawet na przykładzie `audio` widzimy, że dość dużo w tym obszarze się zmienia, ale nadal trudno jest mówić o 100% skuteczności. 

Choć interakcje w czasie rzeczywistym sprawdzą się tylko w wybranych scenariuszach, sama możliwość przetwarzania nagrań audio może okazać się przydatna zarówno w kontekście prostych poleceń, jak i automatyzacji działających "w tle".

Z programistycznej perspektywy widać, że na znaczeniu zyskują Web API umożliwiające interakcję z mikrofonem oraz odtwarzaniem audio i wideo, a także przesyłaniem plików między klientem a serwerem.

Jeśli z tej lekcji masz zapamiętać tylko jedną rzecz, to zapoznaj się z przykładem `audio` i spróbuj odwzorować swój własny interfejs umożliwiający rozmowę z modelem językowym, pomijając mechanizmy związane z wykrywaniem ciszy czy strumieniowaniem audio. W zbudowaniu takiego interfejsu może pomóc Ci [LLM](glossary/LLM.md) i edytor [Cursor](tools/Cursor.md).