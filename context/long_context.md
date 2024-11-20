![](https://cloud.overment.com/S03E03-1728402281.png)

Lekcja [S03E02](S03E02%20—%20Wyszukiwanie%20semantyczne.md) pokazała nam, że [bazy wektorowe](glossary/Vector%20Database.md) nie wystarczają do skutecznego przeszukiwania danych. Co prawda wsparcie ze strony [modelu](glossary/LLM.md) poprawia sytuację, ale nie rozwiązuje wszystkich problemów. Pierwszym z brzegu przykładem może być poszukiwanie akronimów, numerów serii czy zamówienia, lub wyrażeń, których model nie potrafi opisać w [embeddingu](glossary/Embedding.md). 

Zatem gdy mamy gdy mamy do czynienia ze słowami kluczowymi i precyzyjnym dopasowaniem, bazy wektorowe okazują się niewystarczające, a wyszukiwanie semantyczne musi zostać uzupełnione wyszukiwaniem pełnotekstowym.

Łączenie różnych technik wyszukiwania określamy mianem [wyszukiwania hybrydowego](glossary/Hybrid%20Search.md). Może ono przybierać różne formy i konfiguracje w zależności od potrzeb. Przykładowo, czasami wystarczy użyć [PostgreSQL](tools/PostgreSQL.md) z pgvector i pgsearch do przechowywania danych oraz do wyszukiwania semantycznego i pełnotekstowego, co powinno wystarczyć nam na potrzeby małych projektów. Innym razem będzie nam zależało na rozdzieleniu tych odpowiedzialności na różne narzędzia. 

(cdn...)