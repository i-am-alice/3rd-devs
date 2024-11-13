![Cover](https://cloud.overment.com/S02E03-1731372201.png)

Mieliśmy okazję przekonać się o możliwościach generatywnego AI w zakresie przetwarzania tekstu i audio, a także o zdolności do interpretowania obrazu. Teraz zobaczymy jakie opcje mamy w kontekście manipulacji i generowania nowych grafik oraz zdjęć.

Projektowanie kreacji graficznych i praca ze zdjęciami do tej pory nie kojarzyły się bezpośrednio z programowaniem, z wyjątkiem rozwoju narzędzi dla tej branży czy budowania zaawansowanych interakcji z HTML Canvas i WebGL. Wydaje się zatem, że w dobie generatywnego AI, to raczej osoby zajmujące się projektowaniem, czy tworzeniem ilustracji, powinny być zainteresowane narzędziami takimi jak [Midjourney](tools/Midjourney.md) czy [Stable Diffusion](glossary/Stable%20Diffusion.md). Okazuje się jednak, że nie do końca. 

Przykładem może być narzędzie [picthing](https://pic.ping.gg/), pozwalające na skuteczne usuwanie tła ze zdjęć, zbudowane przez twórcę kanału `Theo — t3.gg`. Choć samo usuwanie tła nie jest czymś nowym, tutaj mówimy o znacznym wzroście jakości. Przede wszystkim jednak, projekt ten jest przykładem, jak generatywne AI może być wykorzystane do budowania użytecznych produktów.

![](https://cloud.overment.com/2024-09-26/aidevs3_picthing-a5ce0e6a-b.png)

Drugim przykładem jest [Pieter Levels](https://x.com/levelsio) i jego projekt [PhotoAI](https://photoai.com/) oraz [InteriorAI](https://interiorai.com). Adresują one konkretne problemy i potwierdzają swoją użyteczność poprzez statystki publikowane przez Pietera. 

![](https://cloud.overment.com/2024-09-26/aidevs3_levelsio-55df5a6e-5.png)

Powyższe projekty wymieniam, aby nakreślić potencjalne obszary, którymi możemy się zająć i które mogą nas zachęcić do zainteresowania się generatywną grafiką. Tym bardziej, że nie musimy od razu tworzyć nowych produktów, ale nawet skorzystać z wybranych modeli na potrzeby funkcjonalności aplikacji, które już teraz rozwijamy.
## Obecne możliwości generowania obrazu

Rozwój generatywnej grafiki świetnie przedstawia postęp, który dokonał się na przestrzeni 2 ostatnich lat. Poniższa grafika pochodzi z wpisu [Comparing AI-generated images two years apart — 2022 vs. 2024](https://medium.com/@junehao/comparing-ai-generated-images-two-years-apart-2022-vs-2024-6c3c4670b905) i jasno widać z niej, że w 2022 roku trudno było mówić o poważnym zastosowaniu tych modeli. Dziś wygląda to zupełnie inaczej, choć nadal mówimy jeszcze o wielu ograniczeniach.

![](https://cloud.overment.com/2024-09-26/aidevs3_midjourney-79dd9b18-9.png)

Jednym z takich ograniczeń jest zdolność modelu do generowania elementów obrazu takich jak tekst, dłonie, zęby czy lustrzane odbicie. I choć obecnie dostępne modele takie jak [Flux](glossary/Flux.md) radzą sobie z tymi zadaniami coraz lepiej, to nadal trudno jest mówić o powtarzalnych rezultatach. 

![](https://cloud.overment.com/2024-09-26/aidevs3_peace-955577e3-1.png)

Przeciętnie wypada także podążanie za instrukcjami, o czym już pisałem w lekcji [S01E03 — Limity](S01E03%20—%20Limity.md). Dlatego im bardziej złożony [prompt](glossary/Prompt.md) opisujący grafikę, tym mniejsze prawdopodobieństwo, że otrzymamy rezultat zgodny z oczekiwaniami.

Nie zmienia to jednak faktu, że jakość generowanych obrazów jest już teraz bardzo wysoka. Choć dojście do pożądanego efektu wymaga wielu prób, z pewnością jest to możliwe. Tym bardziej, że nie zawsze będzie nam zależało na tworzeniu kompleksowego obrazu, lecz pojedynczych elementów (np. tekstury czy tła) albo edycji istniejącej już grafiki czy zdjęcia. Poniżej nawet mamy prosty przykład [ComfyUI](ComfyUI), które zamienia moją twarz na zdjęciu wygenerowanym w [Midjourney](tools/Midjourney.md). 

![](https://cloud.overment.com/2024-09-26/aidevs3_swap-92e327ca-8.png)

Z programistycznego punktu widzenia, będzie nas interesowała dostępność modeli przez API lub ich samodzielny hosting. W tym pierwszym przypadku, naszą uwagę powinny zwrócić usługi takie jak wspomniana platforma [Replicate](tools/Replicate.md), a także [Leonardo.ai](https://leonardo.ai/). Z kolei w drugim, może nas zainteresować [RunPod](https://blog.runpod.io/how-to-get-stable-diffusion-set-up-with-comfyui-on-runpod/) lub podobne platformy oferujące dostęp do GPU.

Poza samą manipulacją obrazem, przydatne jest także posługiwanie się szablonami, na podstawie których będziemy generować grafiki. Jest to zwykle konieczne na potrzeby marketingowe, np. generowania kreacji reklamowych, okładek artykułów na bloga czy newslettera. Zwykle potrzebujemy tej samej kreacji w różnych formatach, których ręczne opracowanie jest bardzo czasochłonne. Poniżej mamy przykład szablonów okładek wydarzeń i kursów publikowanych na eduweb.pl. Aby wygenerować nowy zestaw, wystarczy podmienić zdjęcie i tekst w głównym komponencie, a zmiany zostaną odwzorowane na wszystkich pozostałych instancjach.

![](https://cloud.overment.com/2024-09-26/aidevs3_eduweb-b678b9a8-5.png)

Obecnie sterowność modeli generujących grafiki jest dość ograniczona, ale można opracować prompty składające się zarówno z instrukcji tekstowych, jak i grafik referencyjnych. Pozwala to na zachowanie spójności stylu, co jest często wymagane w kontekście tonu marki czy wymagań projektu. Poniżej przykład okładek, które wykorzystywałem w jednym z moich projektów. 

![](https://cloud.overment.com/2024-09-26/aidevs3_zautomatyzowani-3f6d4577-3.png)

Znacznie większą sterowność można także uzyskać w [ComfyUI](ComfyUI), natomiast faktyczny wpływ na generowaną grafikę zależy od konfiguracji samego workflow oraz naszych potrzeb. 

Podsumowując, modele z obszaru generatywnej grafiki znacznie wzbogacają możliwości manipulacji i kreacji obrazów, a które jeszcze do niedawna były niemożliwe lub bardzo ograniczone. Pozwala nam to na: 

- Zwiększanie skali obrazu z (ograniczonym) zachowaniem detali
- Zwiększanie skali obrazu z powiększeniem kadru (przykładem jest Generative Expand dostępna w Photoshopie)
- Automatyczne usuwanie tła, również w trudnych przypadkach (np. włosy, cienie, krople)
- Usuwanie wybranych elementów zdjęcia (np. tła), zamianę ich z innymi oraz łączenie wielu zdjęć
- Generowanie spójnych obrazów, zgodnych z wymaganiami marki opisanymi w brandbooku
- Wykorzystywanie istniejących grafik do automatycznego generowania wielu formatów
- Tworzenie przybliżonych wizualizacji na podstawie opisów i grafik referencyjnych
- Animacje grafik do formy wideo (np. dzięki [Runway](https://runwayml.com/) [Heygen](https://www.heygen.com/), czy [Kling AI](https://klingai.com/))
- ...i wiele innych.
## Techniki projektowania promptów dla modeli

Generowanie grafik podobnie jak w przypadku [LLM](glossary/LLM.md) wymaga napisania [promptu](glossary/Prompt.md), aczkolwiek sama ich treść znacznie się różni, ponieważ zamiast pełnych instrukcji, potrzebujemy raczej słów kluczowych oraz flag sterujących ustawieniami. Widać to na przykładzie promptu [Midjourney](tools/Midjourney.md) w publicznej galerii użytkownika `kvovoorde`. Widać w nim szczegółowy opis sceny z uwzględnieniem słów kluczowych takich jak `shiny`, `dark blue`, `warm weather`, `natural lighting`. 

![](https://cloud.overment.com/2024-09-26/aidevs3_mj-852d34e2-4.png)

Z kolei inny przykład równie świetnej grafiki, posługuje się wyłącznie słowami kluczowymi, takimi jak `vibrant colors`, `cloes-up`, `black cat`. Widać także, że model nie uwzględnił wszystkich z wymienionych słów. 

![](https://cloud.overment.com/2024-09-26/aidevs3_mj2-f541fdfa-d.png)

Ogólna rekomendacja w przypadku [Midjourney](tools/Midjourney.md) mówi, aby prompty były krótkie i zawierały minimum informacji opisujących oczekiwany wynik. Jednak przegląd publicznie dostępnej galerii użytkowników sugeruje, że nie zawsze jest to prawda i znacznie lepiej jest eksperymentować. Nikt też nie powiedział, że nie możemy łączyć ze sobą różnych strategii. 

![](https://cloud.overment.com/2024-09-26/aidevs3_flow-10bef635-8.png)

Poniżej widzimy prostą wizualizację zielonego dymu na czarnym tle, wygenerowanego modelem `niji`, który charakteryzuje styl anime. Sam prompt to zaledwie kilka słów, ale też pozornie trudno jest mówić o szczególnym dopasowaniu do moich potrzeb. 

![](https://cloud.overment.com/2024-09-27/aidevs3_smoke-2656d5ad-6.png)

Na tym etapie detale nie miały większego znaczenia. Bardziej zależało mi na uzyskaniu ogólnego stylu, który będzie stanowić referencję dla dalszych grafik. Tutaj korzystając z pomocy modelu, zamieniłem uproszczony opis na precyzyjną wizję tego, co chcę uzyskać. 

![](https://cloud.overment.com/2024-09-27/aidevs3_init-fec66d1f-8.png)

Powstała więc pierwsza wersja wizualizująca awatary w stylu, który przypadł mi do gustu. Jest to zatem dobra podstawa do generowania kolejnych grafik. Co więcej, prompt, który wykorzystałem do stworzenia pierwszej wersji, ma charakter [meta promptu](glossary/Meta%20Prompt.md). Oznacza to, że możemy wygodnie użyć go do generowania kolejnych awatarów. 

![](https://cloud.overment.com/2024-09-27/aidevs3_smokeref-66a2ba4c-7.png)

Konkretnie, prompt zawiera stałe elementy, ale też daje możliwość podmiany fragmentu opisującego samą postać. Widać to na poniższym screenie, gdzie oznaczyłem go placeholderem `[DESC]`. Tutaj ponownie miałem ogólny pomysł na to, jakich postaci potrzebuję, ale skorzystałem z pomocy modelu, aby wygenerować bogatszy w słowa kluczowe opis. Poza tym, do samej wiadomości dołączyłem także grafikę prezentującą pierwszą wersję awatarów. 

![](https://cloud.overment.com/2024-09-27/aidevs3_metaprompt-472bcf88-b.png)

Rezultat w postaci pierwszej iteracji widać poniżej i dalsze próby będą zależały już od naszych idywidualnych preferencji. Widzimy jednak, że spójny styl został zachowany w przypadku każdej z postaci, wyłączając pojedyncze grafiki, które wykraczają poza paletę kolorów. 

![](https://cloud.overment.com/2024-09-27/aidevs3_avatars-939ec7b0-3.png)

Na tym jednak nie koniec, ponieważ wypracowany styl możemy połączyć także z istniejącymi już grafikami czy nawet zdjęciami. W przypadku większości popularnych narzędzi do generatywnej grafiki mamy możliwość dołączenia postaci, która ma zostać odwzorowana przez model. Jak widać na przykładzie `Alice`, rezultaty są w porządku na tyle, że spośród nich możemy wybrać ten, który będzie odpowiadał nam najbardziej. 

![](https://cloud.overment.com/2024-09-27/aidevs3_alice-4b6dfb48-a.png)

Choć sam zdecydowałem się w tym przypadku na styl ilustracji, to nic nie stoi na przeszkodzie, aby wybrać inne, w tym także bardzo realistyczny. 

[Midjourney](tools/Midjourney.md), za pomocą którego wygenerowałem powyższe grafiki, charakteryzuje się świetną jakością, ale bardzo niską sterownością. Jednak największym problemem jest brak oficjalnego API (nieoficjalne wrappery mogą doprowadzić do zablokowania konta). Pomimo tego, **wszystkie powyższe techniki** można zastosować w połączeniu z [ComfyUI](ComfyUI) lub podobnymi narzędziami. Mam tutaj na myśli przede wszystkim: **nadawanie stylu, meta prompty oraz obrazy referencyjne**. Przykładem tego może być poniższy workflow, który pokazuje to w praktyce. Oczywiście w związku z zastosowaniem innego modelu, efekt różni się od wcześniejszego, natomiast schemat pozostaje taki sam. 

![](https://cloud.overment.com/2024-09-27/aidevs3_comfy-0886bf82-c.png)
## Generowanie grafik w oparciu o szablony

Jak widać, [ComfyUI](ComfyUI) daje ogromne możliwości wpływania na kształt generowanych grafik. Jednak w praktyce może okazać się to niewystarczające, szczególnie gdy będzie nam zależało na bardzo konkretnych szablonach. 

Tutaj z pomocą przychodzą rozwiązania takie jak [htmlcsstoimage](https://htmlcsstoimage.com), które pozwalają na generowanie grafik z pomocą API, na podstawie szablonów HTML. Mamy więc możliwość dynamicznego podmieniania tekstów oraz grafik, a nawet stylów CSS. Natomiast teraz wchodzą do gry dwa dodatkowe elementy — [Vision Language Models](glossary/Vision%20Language%20Models.md) oraz generatywna grafika.

![](https://cloud.overment.com/2024-09-27/aidevs3_htmlcsstoimage-c6f590af-a.png)

Możemy zatem: 

- Zdefiniować szablon HTML, zawierający określoną kolorystykę, fonty i ogólny układ, wliczając w to także responsywność oraz dopasowanie zachowania w zależności od rozmiaru elementów (np. ilości tekstu)
- Zbudować workflow [ComfyUI](ComfyUI) i/lub prompty do innych narzędzi generujących grafiki lub elementy szablonów poprzez API
- Stworzyć aplikację, która reaguje na zdarzenia takie jak dodanie do kolejki posta social media, wpisu na bloga czy newslettera, a następnie tworzy serię grafik i przekazuje je do weryfikacji

Taki schemat (z wyłączeniem generowanych grafik, które wtedy jeszcze nie były dostępne) stosowaliśmy przez niemal 3 lata w eduweb.pl, generując w ten sposób materiały promocyjne 5 różnych wydań newslettera. Grafiki dopasowywały się do autora lub autorki, a także specjalizacji oraz treści samego newslettera. 

![](https://cloud.overment.com/2024-09-27/aidevs3_templates-77a3823f-1.png)

Pomimo responsywności, powyższe szablony były jednak dość statyczne ze względu na potrzebę ograniczenia interwencji ze strony użytkownika. Obecnie możemy pozwolić sobie na znacznie więcej, ponieważ część błędów może automatycznie naprawić model.
## Podsumowanie

Narzędzia z obszaru generatywnej grafiki pozwalają na tworzenie automatyzacji oraz wyspecjalizowanych narzędzi zdolnych do transformacji obrazów według zdefiniowanego stylu. Z tego powodu warto zainteresować się nimi, nawet jeśli sami bezpośrednio nie jesteśmy zaangażowani w procesy związane z grafiką. 

Spośród wszystkich wymienionych dzisiaj rozwiązań, na szczególną uwagę zasługują [ComfyUI](ComfyUI) oraz [HTMLCSStoImage](https://htmlcsstoimage.com/), ponieważ mocno przecinają się one z obszarem programowania. Z ich pomocą możemy budować zaawansowane rozwiązania zdolne do wsparcia lub nawet automatyzacji elementów procesu marketingowego czy produktowego. Ostatecznie wartość wiedzy na temat budowania programistycznych rozwiązań, które wykorzystują modele generatywnej grafiki, wystarczająco dużo mówią przykłady produktów Pietera Levelsa z początku tej lekcji. W sieci można spotkać także inne zastosowania, bezpośrednio związane z procesem projektowym, tworzenia reklam, czy edycji zdjęć. 

**WAŻNE:** Jeśli nie posiadasz komputera, który pozwoli na swobodną pracę z ComfyUI i nie chcesz korzystać z płatnych narzędzi, to możesz pominąć poniższy film. 

<div style="padding:75% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1029104946?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="02_03_comfy"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

Powodzenia!