## Wprowadzenie do AI_devs 3

Generatywne AI oferuje możliwości przetwarzania i generowania treści, które jeszcze niedawno były bardzo trudne do osiągnięcia lub leżały poza naszym zasięgiem. Aktualnie najpopularniejszą formą pracy z modelami są chatboty, takie jak [ChatGPT](services/ChatGPT.md) czy [Claude.ai](services/Claude.ai.md), które wymagają bezpośredniego zaangażowania człowieka. Można to potraktować jako pierwszy poziom rozwoju.

[Andrej Karpathy](https://x.com/karpathy) w jednym z wpisów powiedział, że "**Postrzeganie dużego modela językowego w roli chatbota, jest porównywalne z postrzeganiem komputera w roli kalkulatora**". 

W tej edycji AI_devs dowiemy się w praktyce, co to oznacza i jak łączy się z programowaniem.
## Zasady działania dużych modeli językowych

Duże Modele Językowe (ang. Large Language Models, [LLM](glossary/LLM.md)) są wyspecjalizowane w przetwarzaniu i generowaniu języka naturalnego w formie tekstu. Obecnie modele te potrafią również pracować z obrazem, dźwiękiem czy materiałami wideo, co określa się mianem `multimodalności`.

<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1002823053?h=b4ed4229a8&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="00_playground"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

[LLM](glossary/LLM.md) podobnie jak funkcja w programowaniu przyjmuje dane wejściowe (input) i zwraca dane wyjściowe (output). Natomiast nasza wiedza na temat tego, co się dzieje z danymi w trakcie przetwarzania, jest obecnie bardzo ograniczona. Nietrudno się domyślić, że wiąże się z tym wiele komplikacji oraz pytań bez znanych odpowiedzi. 

![Wizualizacja Input -> LLM -> Output](https://cloud.overment.com/2024-07-17/aidevs3_test-b39e9866-0.png)

Inaczej jest w przypadku kodu, ponieważ gdy spojrzymy na poniższą funkcję `double`, to widzimy, że przyjmuje jako argument liczbę i zwraca jej wartość pomnożoną razy dwa. Rezultat ten nie zmieni się dla tych samych danych wejściowych, a w dodatku możemy go przewidzieć. Takie zachowanie jest więc `deterministyczne`. 

![Funkcja double, mnożąca liczbę razy dwa](https://cloud.overment.com/2024-07-17/aidevs3_double-8c837d72-7.png)

Natomiast [Duże Modele Językowe](glossary/LLM.md) działają na architekturze wykorzystującej `sieci neuronowe`, czyli złożone struktury wzorowane na ludzkim mózgu. Ich główne komponenty definiowane są przez ludzi, jednak sam sposób działania jest kształtowany podczas kilkuetapowego treningu. Proces ten wymaga ogromnych zestawów danych (np. wiedzy z Internetu, filmów czy książek), mocy obliczeniowej oraz zaangażowania ze strony ludzi. W rezultacie otrzymujemy sieć (lub sieci) wyspecjalizowane w konkretnym zadaniu.

Poniżej mamy wizualizację bardzo prostej sieci neuronowej składającej się z 13 neuronów, co daje w przeliczeniu 49 parametrów. Architektura dużych modeli językowych jest znacznie bardziej złożona i tylko dla porównania dodam, że skala modelu [GPT-4](glossary/GPT-4.md) to według nieoficjalnych danych, około 1.77 trylionów parametrów. Nietrudno więc sobie wyobrazić, że jej zrozumienie wymaga czasu. Dodatkowym utrudnieniem jest fakt, że mówimy tutaj o przetwarzaniu danych w formie liczb mało czytelnych dla człowieka. Pomimo tego wszystkiego, duży postęp w tym obszarze dokonał zespół firmy [Anthropic](services/Anthropic.md) o czym możemy przeczytać w [Mapping the Mind of a Large Language Model](https://www.anthropic.com/news/mapping-mind-language-model). Warto także spojrzeć na [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) oraz [LLM Visualization](https://bbycroft.net/llm), aby doświadczyć złożoności modeli z którymi będziemy pracować. 

![Prosta wizualizacja Sieci Neuronowej](https://cloud.overment.com/2024-07-17/aidevs3_neural_network-4a3889ef-7.png)

Ustawienia połączeń sieci początkowo są losowe, a podczas treningu dostosowują się tak, aby sieć jak najlepiej realizowała określone zadanie. To właśnie wtedy LLM "zyskuje swoje umiejętności i zdobywa wiedzę". Po zakończeniu tego procesu, sieć zostaje "`zamrożona`" i tym samym model nie może zdobywać nowych informacji i umiejętności oraz sam w sobie **nie posiada dostępu do Internetu czy narzędzi**, ale jest gotowy do przetwarzania treści.

Dane wprowadzane do modelu są przekształcane w liczby, które przechodzą przez kolejne warstwy sieci, aktywując jej wybrane obszary aż do uzyskania rezultatu, który jest z powrotem przekształcany w formę zrozumiałą dla człowieka. Pomimo tego, że struktura sieci oraz ustawień połączeń pozostaje stała po zakończeniu treningu, w trakcie generowania treści (tzw. [inferencji](glossary/Inferencja.md)) do gry wchodzą także czynniki losowe, co czyni [LLM](glossary/LLM.md) `niedeterministycznymi`. Oznacza to, że nie jesteśmy w stanie precyzyjnie określić wyniku działania modelu ani też go kontrolować, nawet w sytuacji gdy dane wejściowe pozostaną niezmienione. 

![Animacja działania sieci](https://cloud.overment.com/aidevs_net-1721668436.gif)

Główne zadanie pod kątem którego [LLM](glossary/LLM.md) są trenowane, polega na **przewidywaniu kolejnego fragmentu treści** i powtarzaniu tej aktywności do momentu podjęcia decyzji o zakończeniu wypowiedzi. Fragmenty o których mowa określa się mianem [tokenów](glossary/Token.md), będących zwykle częścią słów, pojedynczymi znakami czy nawet całymi słowami. Możesz się o tym przekonać z pomocą [Tiktokenizera](https://tiktokenizer.vercel.app/) w którym jasno widać, że sposób podziału treści na tokeny różni się w zależności od modelu czy też zastosowanego tokenizera.

![Podział treści na tokeny LLM](https://cloud.overment.com/2024-07-23/aidevs3_tokens-b4b63f7e-c.png)

Tokeny mają swoje numeryczne identyfikatory, co umożliwia ich dalsze przetwarzanie, uwzględniając określenie ich znaczenia, zrozumienie w wybranym kontekście oraz podjęcie decyzji o wyborze tokenów składających się na wypowiedź. 

![Identyfikator tokenu](https://cloud.overment.com/2024-07-23/aidevs3_ids-ad0f7ab6-7.png)

Proces ten został dość dobrze zaprezentowany na stronie [Generative AI exists because of the transformer](https://ig.ft.com/generative-ai/) natomiast on sam wykracza poza zakres naszego szkolenia. Dla nas istotna jest jedynie świadomość podziału treści na tokeny oraz to, że **LLM obecnie generuje jeden token na raz**. Oznacza to, że wypowiedź modelu wymaga **powtarzania procesu dobierania kolejnych fragmentów** co pozwala na jej stopniowe budowanie.

Widać to wyraźnie na poniższej animacji, na której ChatGPT tworzy swoją wypowiedź, wyświetlając jej kolejne tokeny.

![Strumieniowanie wypowiedzi modelu](https://cloud.overment.com/aidevs_stream-1721739919.gif)

Z technicznego punktu widzenia, podczas generowania model przetwarza dotychczasowy tekst w następujący sposób: 

Hey
Hey,
Hey, Adam
Hey, Adam!
Hey, Adam! How
Hey, Adam! How's
Hey, Adam! How's it
Hey, Adam! How's it going
Hey, Adam! How's it going?
Hey, Adam! How's it going? ☺️

Zatem każdy kolejny token jest wybierany na podstawie **całej dotychczasowej treści**, a token raz wybrany nie może zostać usunięty, a zatem mówimy tutaj o modelach `autoregresyjnych`. Podczas rozmowy na ChatGPT, Claude czy Gemini, **jako input dla modelu trafia cała treść bieżącej konwersacji** (wyłączając techniki związane z kompresją długich wątków).

Jest to istotna informacja, ponieważ mówi nam o tym, że na zachowanie modelu ma wpływ nie tylko instrukcja systemowa, ale także wiadomości użytkownika oraz wypowiedzi modelu. Choć pełna kontrola nad zachowaniem [LLM](glossary/LLM.md) jest obecnie niemożliwa, tak mamy możliwość sterowania nim z pomocą przekazywanych instrukcji, czyli [promptów](glossary/Prompt.md).

<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1002823462?h=c705414b43&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="00_tokenizer"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>
## Najnowsze możliwości i ograniczenia modeli

Od premiery ChatGPT pod koniec 2022 roku [LLM](glossary/LLM.md) nie zmieniły się znacznie u swoich podstaw, ale znacznie rozwinęły się pod kątem ogólnych umiejętności, zdolności przetwarzania różnych formatów treści, a także zwiększyły szybkość działania oraz stabilność. Temu wszystkiemu towarzyszy także większa dostępność, znaczny spadek kosztów oraz rozwój modeli [Open Source](glossary/Open%20Source%20LLM.md), które można uruchomić na własnym sprzęcie. Dodatkowo w obszar AI zaangażowały się już wszystkie największe korporacje technologiczne, a [OpenAI](services/OpenAI.md) zyskało realną konkurencję, co sprzyja rozwojowi samych modeli, związanych z nimi narzędzi czy obniżce cen. 

Najprostszym sposobem na doświadczenie postępu który miał miejsce, jest skorzystanie z trybu `Completion` dostępnego na stronie [OpenAI Playground](services/OpenAI%20Playground.md) ([platform.openai.com](https://platform.openai.com/playground/complete?model=davinci-002)) oraz modelu `davinci-002`. Jest to model, który był dostępny zaraz po premierze ChatGPT i którego jakość działania warto porównać z najnowszymi modelami OpenAI czy Anthropic. 

![Skuteczność działania modelu text-davinci-002 w Playground OpenAI](https://cloud.overment.com/2024-07-24/aidevs3_davinci-7ca2508d-6.png)

Wzrost skuteczności [LLM](glossary/LLM.md) jest widoczny także w różnego rodzaju testach i egzaminach. Modele coraz częściej osiągają wyniki w najwyższych percentylach, choć nie we wszystkich przypadkach.

![Różnice pomiędzy modelami GPT-3.5 i GPT-4. Situational Awareness, Leopold Aschenbrenner](https://cloud.overment.com/2024-07-24/aidevs3_progress-c70fc4a7-3.png)

Powyższe zestawienie pochodzi z publikacji [Situational Awareness](https://situational-awareness.ai/from-gpt-4-to-agi/), która, choć przez niektóre osoby uznawana jest za zbyt optymistyczną w kontekście przyszłości modeli, zawiera dobre podsumowanie dotychczasowych osiągnięć. Dla kontrastu można dodać, że część ekspertów z branży uważa [LLM](glossary/LLM.md) za "stochastyczne papugi" zdolne do powtarzania wyłącznie tego, co znalazło się w danych treningowych i nie posiadają możliwości rozumowania lub robią to w bardzo prymitywny sposób.

Ostateczną skuteczność modeli widać w ich codziennych zastosowaniach, zarówno przy bezpośredniej interakcji z chatbotem, copilotem, jak i ich zastosowaniu w logice aplikacji. Możemy zatem wyróżnić: 

- Ogólny wzrost możliwości modeli związany z rozumowaniem, podążaniem za instrukcjami, generowaniem kodu czy innego rodzaju treści
- **Wzrost szybkości** działania z kilku/kilkunastu tokenów na sekundę do około tysiąca w ramach usługi [Groq](https://groq.com/)
- Wzrost ilości treści możliwej do **przetworzenia** w ramach zapytania z ~2000 tokenów do nawet 2 milionów
- Wzrost ilości treści możliwej do **wygenerowania**, która obecnie sięga kilkunastu tysięcy tokenów
- **Spadki kosztów** inferencji (w przypadku [[OpenAI]] to mniej więcej 100x niższa cena), które i tak na skali produkcyjnej rosną szybko.
- **Lepsza dostępność** modeli, która obecnie uwzględnia także usługi takie jak `Microsoft Azure` czy `Amazon Bedrock`
- Rozwój możliwości modeli **[Open Source](glossary/Open%20Source%20LLM.md)**, w tym także modeli skierowanych na urządzenia mobilne
- **Rozwój narzędzi**, bibliotek oraz frameworków ułatwiających pracę z modelami

Z drugiej strony nadal obecne są problemy obejmujące:\

- [Konfabulacje](glossary/Konfabulacja.md) (określane szerzej jako halucynacje modelu) są nadal obecne i choć ich obecność jest zdecydowanie rzadsza to i tak z łatwością możemy je spotkać podczas pracy z modelem
- [Long Context Prompting](glossary/Long%20Context%20Prompting.md) czyli zdolność modelu do podążania za instrukcjami w przypadku przetwarzania obszernej treści, a także samo rozumienie jej zawartości
- Ograniczona zdolność utrzymania uwagi i podążania za instrukcjami
- [Prompt Injection](glossary/Prompt%20Injection.md) niezmiennie stanowi problem i wymusza ograniczanie kontaktu użytkownika końcowego z modelem. W jego wyniku można nadpisać instrukcje systemowe i tym samym zmieniać zachowanie systemu
- [Jailbreaking](glossary/Jailbreaking.md) także nie stanowi większego problemu w przypadku wszystkich dostępnych na rynku modeli. W jego wyniku możliwe jest omijanie zabezpieczeń wbudowanych w sam model
- [Context Window](glossary/Context%20Window.md) czyli ilość treści, którą może jednorazowo przetworzyć model. Istotny jest także limit `output token` obejmujący maksymalną długość generowanej treści
- [Knowledge Cutoff](glossary/Knowledge%20Cutoff.md) czyli ograniczenia bazowej wiedzy modelu i brak dostępu do aktualnych informacji (o ile nie połączymy go z narzędziami)

Także od premiery [ChatGPT](services/ChatGPT.md) nie doświadczyliśmy fundamentalnych zmian w samych [LLM](glossary/LLM.md), jednak zwiększyły się ich możliwości oraz ekosystem narzędzi. Rozwinęła się także społeczność osób zaangażowanych w obszar Generative AI, a także ogólny sentyment wobec technologii.

## Role LLM w programowaniu

Generatywne AI w kontekście programowania kojarzy się z możliwością tworzenia kodu, ale może również pełnić rolę w logice aplikacji dzięki możliwości połączenia się z [LLM](glossary/LLM.md) przez [API](glossary/LLM%20API.md). 

Przy bezpośredniej pracy z kodem warto sięgnąć po narzędzia z kategorii [Copilot](glossary/Copilot.md) takie jak [Cursor](https://www.cursor.com), [GitHub Copilot](https://github.com/features/copilot), [JetBrains AI Assistant](https://www.jetbrains.com/ai/) czy [Supermaven](https://supermaven.com/). Każde z nich posiada dostęp do kontekstu w postaci kodu naszego projektu i generowaniu odpowiedzi dopasowanych do nas. 

![Edycja kodu w Cursor.com](https://cloud.overment.com/2024-07-25/aidevs3_cursor-86dc7ea7-3.png)

Przy obecnej generacji modeli dobrą praktyką jest unikanie generowania dużych fragmentów kodu oraz uważne czytanie sugerowanych zmian. W przeciwnym razie korzyści wynikające z zastosowania [[LLM]] szybko okażą się niskie lub nawet kontrproduktywne. Najwięcej wartości widoczne jest wtedy, **gry poruszamy się w obszarze swojej kompetencji lub nieznacznie go przekraczamy**.

Integracja LLM z edytorami kodu lub IDE pozwala uwzględnić wybrane pliki, katalogi i dokumentację w kontekście rozmowy. To przekłada się na lepszą jakość generowanego kodu, otwiera możliwości analizy potencjalnych rozwiązań i ułatwia przegląd istniejącego kodu.

![Dodawanie plików do kontekstu w Cursor.com](https://cloud.overment.com/2024-07-29/aidevs3_cursor-8b853c75-6.png)

Pisanie kodu nie jest jedyną czynnością w której może pomóc nam generatywne AI. Planowanie, podejmowanie decyzji, burza mózgów, research, nauka nowych technologii czy praca z narzędziami do których obsługi potrzebujemy dokumentacji. W takich sytuacjach zwykle będzie zależało nam na pracy z możliwie najlepszym dostępnym na rynku modelem, który będzie podłączony do Internetu. Przykładem takiego narzędzia jest [Perplexity](https://www.perplexity.ai/) lub [Phind](https://www.phind.com/).  

![Dostęp do aktualnej wiedzy z pomocą Perplexity.ai](https://cloud.overment.com/2024-07-25/aidevs3_perplexity-20fde661-8.png)

Każdy z wymienionych przykładów wymaga naszego bezpośredniego zaangażowania w pracę z [LLM](glossary/LLM.md), ale istnieje także wspomniana możliwość połączenia przez [API](glossary/LLM%20API.md). Pozwala to na połączenie logiki aplikacji z możliwościami oferowanymi przez generatywne AI, co zwykle wykorzystywane jest na potrzeby czatbotów oraz połączenia z własną bazą wiedzy (tzw. [Retrieval-Augmented Generation](glossary/Retrieval-Augmented%20Generation.md)).

Poziom zaangażowania LLM w logice aplikacji może się różnić i obejmować zarówno pojedyncze, proste zapytania do modelu ([Completion](glossary/Completion.md)), serię zapytań ([Chain](glossary/Chain.md)) jak i złożone działania w których LLM samodzielnie lub przy współpracy z człowiekiem decyduje o sposobie realizacji zadania ([Agent](glossary/Agent.md)). Każdem z wymienionych zastosowań będziemy zajmować się w AI_devs 3.

![Completion vs Chain vs Agent](https://cloud.overment.com/2024-07-25/aidevs3_llms-38a05ffc-c.png)

Jeżeli już teraz chcesz się przekonać, jakie możliwości posiadają [Agenci](glossary/Agent.md) AI, zainstaluj narzędzie https://aider.chat i podłącz je do nowego repozytorium i wydaj jakieś stosunkowo proste polecenie związane z przygotowaniem skryptu, np. Node.js.

![Aider.chat, czyli Agent zdolny do wprowadzania zmian w repozytorium projektu](https://cloud.overment.com/2024-07-29/aidevs3_aider-324e7613-5.png)

## Tempo i kierunek rozwoju GenAI

Trudno jednoznacznie określić kierunek i tempo rozwoju sztucznej inteligencji (AI), ale dobrym punktem odniesienia wydaje się być poniższa tabela, prezentująca wizję [OpenAI](services/OpenAI.md) na kolejne etapy rozwoju. Pierwszym z nich są chatboty zdolne do generowania treści przy współpracy z człowiekiem, np. [ChatGPT](services/ChatGPT.md) czy [Claude.ai](services/Claude.ai.md).

![Poziomy rozwoju AI w kierunku AGI](https://cloud.overment.com/2024-07-29/aidevs3_levels-976a3e76-d.png)

Drugi poziom związany jest z rozszerzoną możliwością rozumowania i rozwiązywania problemów przez [LLM](glossary/LLM.md), uwzględniającego także planowanie działań. To z kolei dość szybko prowadzi do kolejnych poziomów, uwzględniających podejmowanie działań ([Agent](glossary/Agent.md)), a dalej innowacyjność, a nawet zdolność do wykonywania pracy całej organizacji.

Naturalnie nie mamy pewności, jak będzie wyglądał dalszy rozwój AI. Możemy jednak potraktować wyżej wymienione etapy jako prawdopodobne, tym bardziej, że już teraz doświadczamy ich wybranych elementów. Jeśli weźmiemy teraz pod uwagę obecne możliwości modeli oraz ekosystemu narzędzi, to można uznać, że znajdujemy się gdzieś pomiędzy pierwszym, a drugim poziomem. Przykładowo wszechstronny i w pełni autonomiczny agent AI jest poza naszym zasięgiem, ale wyspecjalizowany w konkretnym obszarze, już niekoniecznie. 
## Uprawnienia, prywatność i bezpieczeństwo

Dane są kluczowe dla procesu treningu i dalszego rozwoju generatywnego AI co stanowi wyzwanie z punktu widzenia prywatności, bo firmy tworzące [LLM](glossary/LLM.md) posuwają się coraz dalej w celu ich pozyskania. Problem ten jest dodatkowo złożony, ponieważ niesie ryzyko wycieku prywatnych informacji w odpowiedziach generowanych przez LLM. Przykładem tego jest poniższy fragment pozwu New York Times przeciwko OpenAI w którym [GPT-4](glossary/GPT-4.md) rzekomo (sprawa jest w toku) zacytował z niemal perfekcyjną precyzją treść artykułu.

![Fragment pozwu New York Times wobec OpenAI](https://cloud.overment.com/2024-07-29/aidevs3_nytimes-307747d1-e.png)

Usługi takie jak [ChatGPT](services/ChatGPT.md) czy [OpenRouter](services/OpenRouter.md) w zależności od ustawień oraz aktywnego planu mają prawo do wykorzystywania treści naszych konwersacji na potrzeby dalszego trenowania modeli. Natomiast w przypadku bezpośredniego połączenia z modelem przez API (np. [OpenAI](services/OpenAI.md) czy [Anthropic](services/Anthropic.md)), polityka prywatności wygląda lepiej z punktu widzenia użytkownika, ale może być niewystarczająca na potrzeby organizacji i tam konieczne będzie skorzystanie z usług takich jak [Azure OpenAI Service](services/Azure%20OpenAI%20Service.md) lub [Amazon Bedrock](services/Amazon%20Bedrock.md).

Poza ochroną danych przed ich przekazywaniem poza organizację, należy także pamiętać o sposobie wykorzystania generowanych odpowiedzi, czy zakresie uprawnień jaki nadajemy [LLM](glossary/LLM.md) działającemu w logice aplikacji. Ostatecznie odpowiedzialność spoczywa na nas. Przykładowo, jeśli wykorzystamy wygenerowany kod zawierający błędy lub będący niezgodny z wymaganiami biznesowymi, sami poniesiemy konsekwencje takich działań.

W związku z powyższym należy w pierwszej kolejności dobrze zrozumieć możliwości [LLM](glossary/LLM.md), i rozsądnie sięgać po nie tam, gdzie rzeczywiście mają szansę przynieść nam korzyści. Warto także wyznaczać jasne granice i standardy pracy z modelami, które pozwolą uniknąć problemów związanych z niewłaściwym zastosowaniem tej technologii.

## Dostępność modeli i wybór między nimi

W przypadku generatywnego AI mamy do dyspozycji wiele modeli o różnej skali i umiejętnościach. W codziennych zastosowaniach będzie nam jednak zależało na pracy z najlepszymi z nich (tzw. [SOTA](glossary/SOTA.md), State of The Art), których jest zaledwie kilka. Dopiero gdy ich możliwości okażą się niewystarczające, możemy rozważyć przełączenie się na mniejsze, wyspecjalizowane modele lub skorzystanie z opcji fine-tuningu czy ostatecznie trenowania modelu od podstaw. W AI_devs 3 nasza uwaga skupi się niemal w pełni na pracy z modelami SOTA.

Obecnie na rynku mamy cztery firmy oferujące najlepsze modele ogólnego zastosowania. Są to [OpenAI](services/OpenAI.md), [Anthropic](services/Anthropic.md), [Google DeepMind](services/Google%20DeepMind.md) oraz [Meta](services/Meta.md) i to na nich zwykle będzie skupiać się nasza uwaga.

W praktyce, **nie powinniśmy jednak uzależniać architektury aplikacji wyłącznie od jednego dostawcy** i dobrze obrazuje to sytuacja z połowy 2024 roku. Wówczas Anthropic oraz model [Claude 3.5 Sonnet](glossary/Claude.md) okazał się bardziej skuteczny niż [GPT-4o](glossary/GPT-4.md). Jednocześnie w niektórych przypadkach to modele [OpenAI](services/OpenAI.md) sprawdzały się lepiej. 

Choć istnieją różne benchmarki, np. [LMSYS Chatbot Arena](https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard), które mogą rysować ogólny obraz skuteczności [LLM](glossary/LLM.md), tak zawsze powinniśmy weryfikować wybrane modele na własnym przykładzie oraz swoich zastosowaniach.

![Chatbot Arena Leaderboard, LMSYS na HuggingFace](https://cloud.overment.com/2024-08-04/aidevs3_arena-7f115a20-f.png)

Przełączanie się pomiędzy modelami to nie tylko kwestia programistycznego interfejsu, ale także samych promptów. W praktyce jednak znacznie łatwiej jest dostosować prompt do modelu, niż całą aplikację do zupełnie innego [API](glossary/LLM%20API.md).

## Modele komercyjne i otwarte

Ogromną uwagę w obszarze generatywnego AI skupiają [modele Open Source](glossary/Open%20Source%20LLM.md), które można uruchomić na własnym sprzęcie, zachowując pełną prywatność. Należy jednak pamiętać, że utrzymanie konfiguracji sprzętowej pozwalającej na [inferencję](glossary/Inferencja.md) w aplikacji produkcyjnej może przekroczyć koszty związane z dostawcami chmurowymi oraz wymaga dodatkowej uwagi. Co więcej, skuteczność działania niemal wszystkich modeli open source w ogólnych zastosowaniach jest nadal bardzo niska w porównaniu do modeli [SOTA](glossary/SOTA.md). 

![ollama.ai to najprostszy sposób uruchomienia modeli Open Source na swoim sprzęcie](https://cloud.overment.com/2024-08-04/aidevs3_ollama-ce1fc460-4.png)

Jeśli chcesz już teraz sprawdzić jak działają takie modele, możesz przejść na [groq.com](https://groq.com/) i przetestować ich skuteczność na kilku pytaniach. Natomiast z pomocą narzędzi takich jak [ollama](tools/ollama.md) czy [LMStudio](https://lmstudio.ai/) możesz pobrać wybrany model na swój komputer i rozmawiać z nim bez połączenia z Internetem (polecam sprawdzić na początek [Gemma 2B](https://ollama.com/library/gemma2:2b) który można uruchomić nawet na telefonie).

## Podstawowe narzędzia i biblioteki

Niezależnie od poziomu doświadczenia w pracy z [LLM](glossary/LLM.md) warto poświęcić trochę czasu na konfigurację narzędzi oraz zapoznanie się z bibliotekami przydatnymi podczas rozwoju aplikacji. Niemal każde z nich w różnej formie pojawi się jeszcze w innych lekcjach AI_devs 3. Tymczasem zacznijmy od poniższej listy:

- [Cursor](tools/Cursor.md): IDE oparty o Visual Studio Code, oferujący natywną integrację z LLM w formie edycji inline oraz czatu z opcją wskazywania plików, katalogów czy dokumentacji na podstawie których ma zostać udzielona odpowiedź
- [Github Copilot](tools/Github%20Copilot.md): Jedno z najlepszych, dostępnych obecnie narzędzi wspierających pisanie kodu
- [Perplexity](glossary/Perplexity.md): Generatywna wyszukiwarka oferująca dostęp do odpowiedzi opartych o aktualne źródła danych
- [AnythingLLM](tools/AnythingLLM.md): Interfejs graficzny do interakcji z LLM komercyjnymi oraz Open Source
- [PromptFoo](tools/PromptFoo.md): Narzędzie do automatycznego testowania i ewaluacji promptów
- [LangFuse](tools/LangFuse.md): Narzędzie do monitorowania aplikacji wykorzystujących LLM oraz wersjonowania promptów
- [LangFlow](tools/LangFlow.md): Narzędzie do wizualnego (low-code) budowania aplikacji wykorzystujących LLM
- [OpenRouter](services/OpenRouter.md): Platforma udostępniająca wszystkie najpopularniejsze LLMy poprzez API
- [Qdrant](tools/Qdrant.md): Wyszukiwarka wektorowa
- [FireCrawl](tools/FireCrawl.md): Narzędzie do przeszukiwania sieci oraz stron www na potrzeby LLM
- [Neo4J](tools/Neo4J.md): Baza grafowa umożliwiająca przechowywanie danych
- [Vercel AI SDK](tools/Vercel%20AI%20SDK.md): Bardzo przydatna biblioteka do interakcji z LLM najpopularniejszych dostawców
- [ollama](tools/ollama.md): Narzędzie ułatwiające pobranie i uruchomienie modeli open source na własnym komputerze z opcją połączenia się z nimi poprzez localhost

Dodatkowo warto zarejestrować konta na platformach:

- https://console.anthropic.com/
- https://platform.openai.com/
- https://console.groq.com/
- https://aistudio.google.com/app/

Zanim przejdziemy dalej, warto poświęcić trochę czasu na konfigurację przynajmniej dwóch narzędzi: Copilota wbudowanego w edytor kodu oraz narzędzia umożliwiającego interakcję z LLM na komputerze i **ułatwiającego dostęp do niego, np. poprzez globalny skrót klawiszowy**.

## Praktyczne zastosowania Generative AI

Choć może się wydawać, że [LLM](glossary/LLM.md) otwierają przed nami nieograniczone możliwości, rzeczywistość pokazuje coś innego. Bariery pojawiają się nie tylko w samych modelach, lecz także w infrastrukturze, organizacji informacji, definicjach procesów, aspektach prawnych czy biznesowych. Część z nich możemy pokonać, niektóre ominąć, a inne nagiąć. Nie zmienia to jednak faktu, że mamy do czynienia z narzędziami, które sprawdzają się w wybranych sytuacjach i **nie powinny być stosowane wszędzie**. Eksplorując ich możliwości, warto wyrabiać sobie zdolność do oceny tego, co jest możliwe, z uwzględnieniem rozwoju samej technologii.

Chociaż nazwa "Generatywne AI" sugeruje, że mamy do czynienia z rozwiązaniami zdolnymi do tworzenia treści, wystarczy kilka prób wygenerowania jakościowego wpisu na jakiś temat, aby zorientować się, że coś jest nie tak. Zwykle brakuje kontekstu, konkretów, aktualnych informacji, a często widoczne są błędy lub powtarzalne schematy. Sytuacja zmienia się jednak, gdy zamiast tworzyć treść, zaczynamy ją **transformować**. Przykładowo: 

- Generowanie treści (np. artykułów, wpisów social media czy maili) daje rezultaty niskiej jakości. Jednak korekta, zwiększenie czytelności czy poprawienie formatowania, ma pozytywny wpływ na jakość. Poniżej mamy przykład w którym Claude 3.5 Sonnet poprawił kolejny punkt tego wpisu pod kątem gramatyki, a rezultat został natychmiast skopiowany do schowka

![Przykład korekty tekstu z pomocą Claude 3.5 Sonnet](https://cloud.overment.com/2024-08-20/aidevs3_correction-a13791dd-1.png)

- LLM odpisujący na maile będzie popełniać błędy i narażać wizerunek nasz i/lub firmy. Może jednak z wysoką precyzją przekierować wiadomości do właściwych osób, wspierając tym samym działy obsługi klienta czy sprzedaży
- Kod generowany przez LLM zawiera błędy, bywa niezgodny z założeniami lub nie uwzględnia dobrych praktyk. Jednak przy współpracy z doświadczoną osobą, znacznie zwiększa efektywność oraz stwarza przestrzeń do pracy nad detalami, na które normalnie nie mielibyśmy czasu
- LLM nie jest połączony z Internetem czy zewnętrznym API. Jednak dzięki możliwości transformacji treści do ustrukturyzowanego formatu (np. JSON) może wchodzić w interakcję z serwisami i urządzeniami, pełniąc rolę asystenta lub częściowo autonomicznego systemu (agenta). Wówczas LLM sam w sobie nie generuje nowych treści, lecz transformuje zapytania użytkownika lub instrukcje obecne w logice aplikacji

![Przykład agenta AI połączonego z listą zadań, kalendarzem, spotify i platformą udostępniającą informację o aktualnych cenach kryptowalut](https://cloud.overment.com/2024-08-20/aidevs3_play-fa3d49f0-d.png)

- LLM domyślnie nie wygeneruje treści dopasowanych do indywidualnego kontekstu firmy, klienta czy nas samych. Możemy jednak wyposażyć go w wiedzę dzięki której odpowiedzi będą spersonalizowane. Wówczas interakcja z LLM odbywa się poprzez `transformację` informacji dostępnych w kontekście
- LLM zwiększa możliwości interakcji z dokumentami (np. stronami www, plikami tekstowymi czy obrazami). Możemy wykorzystać ten fakt, do przetwarzania danych "w tle", bez aktywnego zaangażowania człowieka. Mowa tutaj o mechanizmach odczytywania tekstu z obrazu, opisywania plików, automatycznej organizacji czy zaawansowanymi przeszukiwaniu treści
- Choć interfejs czatu jest obecnie najbardziej popularny, to nie oznacza to, że LLM nie może wspierać klasycznych interfejsów w sposób niemal niezauważalny dla użytkownika końcowego. Przykładem może być lista zadań, która automatycznie sugeruje projekt i czas realizacji, w trakcie dodawania nowego wpisu.

Na doświadczenie wyżej wymienionych scenariuszy przyjdzie jeszcze czas w dalszych lekcjach. Jednak już teraz rysują one perspektywę patrzenia na LLM przez pryzmat nieco szerszy niż interfejs czatu. 

## Podsumowanie

Poruszone w tej lekcji zagadnienia i narzędzia będą nam towarzyszyć przez całą trzecią edycję AI_devs. Warto więc poświęcić chwilę na zapoznanie się z wymienionymi źródłami i narzędziami, aby osobiście doświadczyć możliwości i ograniczeń, które mamy przed sobą. Na szczególną uwagę zasługują: [OpenAI Playground](services/OpenAI%20Playground.md), [Cursor](tools/Cursor.md), [Perplexity](glossary/Perplexity.md) i [ollama](tools/ollama.md), a także [Tiktokenizer](tools/Tiktokenizer.md). 