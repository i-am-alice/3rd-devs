# Wyszukiwanie hybrydowe

![](https://cloud.overment.com/S03E03-1728402281.png)

Lekcja [S03E02](S03E02%20—%20Wyszukiwanie%20semantyczne.md) pokazała nam, że [bazy wektorowe](glossary/Vector%20Database.md) nie wystarczają do skutecznego przeszukiwania danych. Co prawda wsparcie ze strony [modelu](glossary/LLM.md) poprawia sytuację, ale nie rozwiązuje wszystkich problemów. Pierwszym z brzegu przykładem może być poszukiwanie akronimów, numerów serii czy zamówienia, lub wyrażeń, których model nie potrafi opisać w [embeddingu](glossary/Embedding.md). 

Zatem gdy mamy gdy mamy do czynienia ze słowami kluczowymi i precyzyjnym dopasowaniem, bazy wektorowe okazują się niewystarczające, a wyszukiwanie semantyczne musi zostać uzupełnione wyszukiwaniem pełnotekstowym.

Łączenie różnych technik wyszukiwania określamy mianem [wyszukiwania hybrydowego](glossary/Hybrid%20Search.md). Może ono przybierać różne formy i konfiguracje w zależności od potrzeb. Przykładowo, czasami wystarczy użyć [PostgreSQL](tools/PostgreSQL.md) z pgvector i pgsearch do przechowywania danych oraz do wyszukiwania semantycznego i pełnotekstowego, co powinno wystarczyć nam na potrzeby małych projektów. Innym razem będzie nam zależało na rozdzieleniu tych odpowiedzialności na różne narzędzia. 

W tej lekcji zajmiemy się więc wyszukiwaniem hybrydowym, które umożliwi nam budowanie zaawansowanych systemów [Retrieval-Augmented Generation](glossary/Retrieval-Augmented%20Generation.md), w tym także pamięci dla [agenta AI](glossary/Agent.md).
## Klasyczne silniki wyszukiwania

Silniki wyszukiwania, takie jak [Algolia](tools/Algolia.md) czy ElasticSearch, umożliwiają zaawansowane przeszukiwanie z uwzględnieniem dopasowania pełnotekstowego (full-text search), dopasowania 'rozmytego' (fuzzy search), zawężania obszaru przeszukiwania (faceted search), filtrowania oraz oceny zwróconych rezultatów.

Podstawowa interakcja odbywa się na podobnej zasadzie jak w przypadku baz wektorowych. Mamy więc indeks, a w nim dokumenty posiadające swoje właściwości. Można to zobaczyć, zakładając konto na [algolia.com](https://algolia.com), z którego możemy pobrać identyfikator aplikacji oraz klucz API (administrator). Następnie, po uruchomieniu przykładu `algolia`, na naszym koncie utworzony zostanie indeks `dev_comments` i pojawią się w nim trzy rekordy.

![](https://cloud.overment.com/2024-10-08/aidevs3_index-2614602e-4.png)

No i testowe zapytanie zwraca dopasowanie do dwóch z trzech dokumentów. 

![](https://cloud.overment.com/2024-10-08/aidevs3_algolia-3991529f-f.png)

Jeśli chcielibyśmy przeszukiwać wpisy tylko jednego z autorów, to w pierwszej kolejności w ustawieniach indeksu potrzebujemy wskazać pola, względem których będziemy chcieli filtrować. W naszym przypadku będzie to pole `author`.

![](https://cloud.overment.com/2024-10-08/aidevs3_facets-f4fad0d3-f.png)

Tym razem wyszukiwanie zwraca nam tylko jeden wpis, dopasowany do autora wskazanego w filtrze. 

![](https://cloud.overment.com/2024-10-08/aidevs3_limited-0a64152f-9.png)

Mamy więc w tym momencie już zupełne podstawy pracy z klasycznym silnikiem wyszukiwania i tym samym jesteśmy praktycznie gotowi na wdrożenie logiki dla [wyszukiwania hybrydowego](glossary/Hybrid%20Search.md). 
## Synchronizacja danych

Już teraz widzimy, że w [Algolia](tools/Algolia.md) dokumenty mają swoje identyfikatory. To samo dotyczy [Qdrant](tools/Qdrant.md) oraz bazy [SQLite](glossary/SQLite.md). Oznacza to, że wszystkie rekordy mogą być ze sobą powiązane, a całość opracowana tak, aby **baza danych stanowiła źródło prawdy.**

W przykładzie `sync` przygotowałem logikę odpowiedzialną za synchronizowanie informacji pomiędzy trzema źródłami: baza danych, baza wektorowa i indeks silnika wyszukiwania. Dzięki temu jakiekolwiek zmiany wprowadzane w bazie danych, będą odwzorowane w pozostałych źródłach. 

![](https://cloud.overment.com/2024-10-09/aidevs3_interface-10b75a3c-c.png)

W indeksie [Algolia](tools/Algolia.md) znajdują się wszystkie właściwości dokumentu, wliczając w to także unikatowy identyfikator.

![](https://cloud.overment.com/2024-10-09/aidevs3_algolia_doc-f69dd56b-b.png)

Podobnie wygląda to w [Qdrant](tools/Qdrant.md) i tam również mamy komplet informacji, w tym także ten sam identyfikator. 

![](https://cloud.overment.com/2024-10-09/aidevs3_qdrant_doc-eb5e613c-3.png)

No i ostatecznie mamy nasze źródło prawdy, czyli bazę danych [SQLite](glossary/SQLite.md) na którym pracuje nasza aplikacja. 

![](https://cloud.overment.com/2024-10-09/aidevs3_database_document-cf9e1e96-8.png)

Zatem nawet w przypadku aplikacji działających na nieco większej skali, skorzystanie z trzech różnych narzędzi nie jest trudne, a daje nam duże możliwości, o czym już niebawem się przekonamy. 

Także w temacie synchronizacji danych: 

- Możemy skorzystać jedynie z [PostgreSQL](tools/PostgreSQL.md) i dostępnych rozszerzeń, aby przechowywać dane oraz przeszukiwać je na różne sposoby. Takie podejście może być wygodne, ale ograniczone. Tutaj można także rozważyć skorzystanie z [Supabase](https://supabase.com/).
- Możemy stworzyć **wspólny interfejs**, który pozwoli nam na automatyczne synchronizowanie danych pomiędzy różnymi źródłami wiedzy. Tutaj liczy się przede wszystkim utrzymanie **wspólnego identyfikatora**
- Nie zawsze synchronizacja będzie opierać się o dokładnie te same dane dla wszystkich źródeł. Już nawet w naszym przypadku, dane zapisane w [Qdrant](tools/Qdrant.md) zawierają dodatkowo [embedding](glossary/Embedding.md), który nie występuje w pozostałych miejscach.
## Wybór indeksowanych treści

Dość zasadne pytanie dotyczy tego, co przechowywać w oryginalnej bazie danych, a co w silnikach wyszukiwania. Odpowiedź zawsze będzie uzależniona od naszych indywidualnych potrzeb, ale możemy odpowiedzieć sobie na kilka ogólnych pytań, a także **uwzględnić zaangażowanie modelu w transformację treści**. 

Zatem: 

- **Jakich danych wymaga nasza aplikacja po stronie interfejsu** oraz w jaki sposób będziemy je wyświetlać? Odpowiedź na to pytanie determinuje strukturę informacji przechowywanych w bazie danych lub przynajmniej wskazuje kierunki.
- **Które z fragmentów danych będą wykorzystywane do przeszukiwania** oraz jak chcemy je filtrować lub ograniczać dostęp do nich? Odpowiedź na to pytanie wskazuje nam treść, która powinna trafić do silników wyszukiwania.
- **Jakich danych brakuje nam w oryginalnych dokumentach, a w ich utworzeniu może pomóc nam LLM?** Mowa tutaj głównie o klasyfikacji, tytułach, opisach, streszczeniach lub innej formie transformacji. 
- **Czy duża liczba danych utrudni wyszukiwanie i jeśli tak, to co możemy z tym zrobić?** To wspierające pytanie pozwala zidentyfikować potrzebę dodatkowych filtrów i kategorii, które zostaną uwzględnione na etapie indeksowania oraz [odzyskiwania / przeszukiwania](glossary/Retrieval.md) 
- **Które dane są stałe, a które tymczasowe?** Przykładowo w bazie mogą być zapisane wpisy tylko na potrzeby bieżącej konwersacji lub nawet jednego zadania, realizowanego w trakcie rozmowy. Musimy więc zadbać o możliwość ich łatwego wczytania, a także wykluczenia ich z głównych wyników wyszukiwania o ile nie wchodzi to w konflikt z logiką aplikacji. 

Refleksja nad powyższymi pytaniami pozwoli nam zarysować kształt struktury, którą możemy przełożyć na wszystkie źródła danych. Jakość tych odpowiedzi będzie także przekładać się na skuteczność działania całego systemu. 
## Wyszukiwanie hybrydowe

W przykładzie `hybrid` znajduje się rozszerzenie przykładu `sync`, jednak w tym przypadku na nieco innym zestawie danych przeprowadzamy przeszukiwanie dokumentów. Rzecz w tym, że wykorzystujemy tutaj dwa silniki wyszukiwania, a więc rezultatem są **dwie listy dokumentów, które musimy ze sobą połączyć** korzystając z Rank Fusion. Konkretnie dokumenty otrzymują ranking liczony na podstawie sumy odwrotności ich pozycji z każdej listy. Chodzi dokładnie o ten fragment kodu:

![](https://cloud.overment.com/2024-10-09/aidevs3_rrf-7c378bd6-0.png)

Ujmując to prościej: 

- Zapisujemy rezultaty obu wyszukiwań w formie **jednej listy**
- Liczymy dla nich `score` na podstawie wzoru `(1 / vector rank) + (1 / full text rank)`
- Sortujemy według tego rankingu

Oczywiście możemy zmieniać wagi dla poszczególnej listy, aby zmienić jej wpływ na ranking, zwiększając znaczenie wyszukiwania wektorowego lub pełnotekstowego.

Samo policzenie rankingu nie jest wszystkim, ponieważ gdy zajrzymy w kod, to przede wszystkim rzuci się w oczy fakt, że korzystamy **z dwóch zapytań**. Jedno zapisane językiem naturalnym jest kierowane do [Qdrant](tools/Qdrant.md), a drugie zawiera wyłącznie słowa kluczowe i jest kierowane do [Algolia](tools/Algolia.md). 

![](https://cloud.overment.com/2024-10-09/aidevs3_search-b091fa01-7.png)

W testowym zestawie danych znajduje się lista książek Simona Sineka oraz Jima Collinsa. Tylko trzy z nich bezpośrednio zawierają frazę "people", natomiast pośrednio ten temat porusza większość z nich.

Dla zapytania `Find me everything about people` Qdrant zwraca tytuły w których opisach pojawiła się fraza `people` na miejscach 1, 2 i 5. Z kolei Aloglia zwraca tylko trzy rekordy, ale słowo `people` pada w każdym z nich. 

![](https://cloud.overment.com/2024-10-09/aidevs3_search_results-8d444b64-7.png)

Nie można jednoznacznie powiedzieć, że wyniki Algolia są lepsze, ponieważ Qdrant na trzeciej i czwartej pozycji zwrócił książkę na temat przywództwa, co jest bezpośrednio powiązane z naszym zapytaniem. 

Jeśli więc zastosujemy RRF do uporządkowania wyników, otrzymamy TOP3 z książkami zawierającymi frazę `people`, a wspomniane tytuły mówiące o przywództwie wylądują zaraz obok. 

![](https://cloud.overment.com/2024-10-09/aidevs3_ranked-d3e6fc8c-3.png)

Bez wątpienia jest to najlepszy wynik, jaki mogliśmy uzyskać i był on możliwy tylko ze względu na zastosowanie [wyszukiwania hybrydowego](glossary/Hybrid%20Search.md). 

Są również sytuacje, gdzie skuteczność wyszukiwania nie będzie porównywalna dla obu strategii. Na przykład, jeśli zapytanie koncentruje się na akronimach, numerach seryjnych czy literówkach, to wyszukiwanie pełnotekstowe ma znacznie większą wartość.

Poniżej mamy przykład przeszukiwania za pomocą numeru ISBN (wygenerowałem losowe wartości). W tym przypadku baza wektorowa zwróciła dokument, ale dopiero na 8 z 9 pozycji. Z kolei Algolia zwróciła tylko jeden dokument. W rezultacie poszukiwana książka trafiła na 1 pozycję. 

![](https://cloud.overment.com/2024-10-09/aidevs3_isbn-92f982dc-b.png)

No i oczywiście będziemy mieć też odwrotne sytuacje, w których dopasowanie słów kluczowych w ogóle nie będzie występować. Wówczas Algolia nie zwróci nam żadnych rezultatów, a Qdrant z dużym prawdopodobieństwem odnajdzie właściwe dokumenty.
## Wzbogacanie zapytań i self-query

Co jeśli jednak problem z dotarciem do pożądanych treści nie będzie leżał po stronie silnika wyszukiwania, lecz pojawi się już na etapie samego zapytania? W takiej sytuacji możemy zaangażować LLM, aby zmodyfikował oryginalne zapytanie, lub aby na jego podstawie wygenerował serię nowych zapytań. 

Przykładem może być tak prosta interakcja, jak zadanie Agentowi AI pytania "Cześć, co tam?". Jest to ogólne zapytanie w przypadku którego trudno zarówno z pomocą wyszukiwarki odnaleźć potencjalnie istotne dokumenty. 

Jeśli jednak model w prompcie weźmie pod uwagę np. porę dnia, bieżącą lokalizację czy bardzo ogólne informacje na swój temat, to możliwe jest wygenerowanie kilku pytań kierowanych 'do samego siebie'. W ten sposób otrzymujemy treść, która może już być wykorzystana do przeszukania bazy danych. 

![](https://cloud.overment.com/2024-10-09/aidevs3_self-query-3c21e763-0.png)

Patrząc na powyższe zapytania, widzimy, że są one **spersonalizowane** i wynika to zastosowania początkowego kontekstu, który w tym przypadku jest opisem osobowości i najważniejszych informacji [agenta](glossary/Agent.md). Uwzględnione są tam również ogólne zasady, takie jak: 

- Zadaj pytania na temat wspomnianych osób, projektów czy narzędzi
- Gdy odpowiedź może dotyczyć Ciebie, wczytaj swój profil, wspominając swoje imię "Alice"
- Gdy pytanie dotyczy użytkownika, zawsze wymień jego imię (Adam)
- W przypadku ogólnych wiadomości, przeskanuj listę dostępnych kategorii w poszukiwaniu potencjalnego tematu, który może pomóc Ci kontynuować rozmowę i uczynić ją angażującą.

Podobne zasady znacznie wzbogacają interakcję z agentem zdolnym do adaptacji do różnych sytuacji. Warto też wspomnieć, że użycie słów kluczowych, takich jak imiona, jest celowe, ponieważ generowana lista ma służyć silnikom wyszukiwania.
## Filtrowanie i przetwarzanie wyników wyszukiwania

W poprzedniej lekcji widzieliśmy już przykład [re-rank](glossary/Re-rank.md) realizowany przez model oceniający poszczególne wyniki pod kątem przydatności dla bieżącej interakcji. Oczywiście nic nie stoi na przeszkodzie, aby nadal korzystać z tej metody w połączeniu z wyszukiwaniem hybrydowym.

Natomiast mogą zdarzyć się także sytuacje w których nie będzie interesować nas precyzyjne wyszukanie kilku/kilkunastu dokumentów, ale pobranie wszystkich z danej kategorii. Wówczas do takiego zadania będziemy chcieli zaangażować albo wyłącznie bazę danych, albo silnik wyszukiwania taki jak [algolia](tools/Algolia.md). Wówczas rolą [LLM](glossary/LLM.md) będzie zwrócenie np. identyfikatorów bądź nazw kategorii i filtrów, które mają być zastosowane. 

Sytuacja, w której może być to potrzebne, dotyczy zapytań takich jak: "wypisz wszystkie książki autorów urodzonych w XXXX roku" lub "podsumuj wyniki raportów z lat 2010-2024". Wówczas wyszukiwarka zwraca dużą liczbę dokumentów, które zawierają także mnóstwo treści nieistotnej z punktu widzenia aktualnego zadania. Zamiast więc wczytywać je do kontekstu konwersacji, możemy skorzystać z logiki tworzącej podsumowanie skupiające się tylko na jednym zagadnieniu. Dodatkowo wynik takiego podsumowania, może zostać zachowany na potrzeby przyszłych interakcji, aby powtarzanie tego procesu nie było konieczne.

Zatem: 

- [LLM](glossary/LLM.md) może decydować o tym, które obszary bazy danych **przefiltrować** w celu pobrania zestawu dokumentów pasujących do filtra, a nie konkretnego zapytania
- Listę pobranych dokumentów możemy przekazać do kontekstu bezpośrednio, lub przeprocesować w celu precyzyjnej ekstrakcji tylko wybranych danych
- Rezultat z przeprocesowanych dokumentów możemy zapisać w bazie jako **nowy dokument** w celu ograniczenia konieczności wykonywania tej samej akcji wielokrotnie

Implementacja powyższych punktów może obyć się na podstawie przykładów, które już zrealizowaliśmy (np. `summary`). 

## Dostarczanie wyników wyszukiwania do kontekstu

Metadane są przydatne nie tylko w celu filtrów na etapie wyszukiwania, ale przede wszystkim na etapie dostarczania treści dokumentu do kontekstu. Jego główna treść zwykle będzie niewystarczająca, aby [LLM](glossary/LLM.md) był w stanie skutecznie się nią posługiwać. 

Poniższy prompt pokazuje w praktyce, jak ważna jest taka forma dostarczania dokumentów. Gdybyśmy nie uwzględnili daty utworzenia "created_at", model odpowiedziałby na pytanie użytkownika pozytywnie, a tak odmówił zgodnie z prawdą.

![](https://cloud.overment.com/2024-10-10/aidevs3_context-6013fb1b-e.png)

Podobnie, możemy oddzielać informacje pochodzące z różnych narzędzi, z których korzysta [agent](glossary/Agent.md). Jednak nie warto tego nadużywać i zawsze powinniśmy dążyć do tego, aby w danym kontekście znajdowały się tylko najważniejsze dokumenty.

W formatowaniu kontekstu w taki sposób, przydatne okazuje się stosowanie składni zbliżonej do `xml`, ponieważ wyraźnie oddzielamy od siebie nie tylko poszczególne konteksty, ale także fragmenty treści znajdujące się wewnątrz nich. Przykładem może być lista wyników wyszukiwania, zawierająca rezultaty dla więcej niż jednego zapytania.

![](https://cloud.overment.com/2024-10-10/aidevs3_results-8847e013-6.png)

## Podsumowanie

Budowanie [Retrieval-Augmented Generation](glossary/Retrieval-Augmented%20Generation.md) bez zastosowania [wyszukiwania hybrydowego](glossary/Hybrid%20Search.md) od tej chwili praktycznie nie powinno być brane pod uwagę. Tym bardziej że skonfigurowanie wyszukiwania pełnotekstowego i późniejsza ocena wyników są dość proste.

Jednocześnie jasne powinno być to, że nawet najlepsze systemy wyszukiwania nie wystarczą, aby zaadresować możliwie dużą część zapytań i ich kategorii. To wszystko prowadzi więc do wniosku, że **uniwersalne systemy RAG** próbujące dopasować się do dowolnego rodzaju danych, są jeszcze poza naszym zasięgiem o ile zależy nam na bardzo wysokiej skuteczności. 

Ogromną rolę pełnią także elementy wspierające proces wyszukiwania, takie jak wzbogacanie zapytania (np. [Self-Querying](glossary/Self-Querying.md)), czy ocenianie rezultatów przez model. 

Jeśli z tej lekcji masz zabrać ze sobą tylko jedną rzecz, to zapoznaj się bliżej z przykładem `hybrid` i spróbuj uruchomić go na własnych, bezpłatnych kontach [Algolia](tools/Algolia.md) i [Qdrant](tools/Qdrant.md) w połączeniu z zestawem danych wygenerowanym przez Ciebie (możesz użyć do tego [LLM](glossary/LLM.md)).

Powodzenia!

