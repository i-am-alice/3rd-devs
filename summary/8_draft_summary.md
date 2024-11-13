# AI_devs 3, Lekcja 1, Moduł 1 — Interakcja z dużym modelem językowym

![Cover Image](https://cloud.overment.com/S02E03-1731372201.png)

## Wprowadzenie do generatywnego AI w tworzeniu i manipulacji grafikami

Obecnie generatywne AI otwiera nowe możliwości w dziedzinie projektowania graficznego i edycji zdjęć. To, co kiedyś było domeną jedynie grafików, teraz znajduje zastosowanie w programowaniu dzięki narzędziom takim jak [Midjourney](tools/Midjourney.md) i [Stable Diffusion](glossary/Stable%20Diffusion.md). Choć intuicyjnie wydawać by się mogło, że to projektanci powinni być głównymi użytkownikami tych narzędzi, AI wkracza również do świata programistów.

### Praktyczne zastosowanie generatywnego AI

Narzędzie [picthing](https://pic.ping.gg/), stworzone przez Theo z kanału `t3.gg`, jest przykładem wykorzystania generatywnego AI do wysokiej jakości usuwania tła z zdjęć. Chociaż usuwanie tła nie jest niczym nowym, narzędzie pokazuje, jak AI może podnieść jakość tego procesu.

![Example of background removal using Picthing](https://cloud.overment.com/2024-09-26/aidevs3_picthing-a5ce0e6a-b.png)

Innym przykładem praktycznych zastosowań AI jest praca Pietera Levelsa, który w swoich projektach [PhotoAI](https://photoai.com/) i [InteriorAI](https://interiorai.com) rozwiązuje konkretne problemy, pokazując, jak AI może wspierać różnorodne dziedziny.

![Pieter Levels Projects](https://cloud.overment.com/2024-09-26/aidevs3_levelsio-55df5a6e-5.png)

## Obecne możliwości generowania obrazu

Rozwój technologii generatywnej obrazuje istotne postępy dokonane w ciągu ostatnich dwóch lat w jakości generowanych obrazów. Mimo znaczących ulepszeń, istnieją jeszcze pewne ograniczenia. Modele jak [Flux](glossary/Flux.md) radzą sobie coraz lepiej z generowaniem takich elementów jak tekst czy lustrzane odbicia, jednak powtarzalność wyników bywa różna.

![Comparison of AI-generated images from 2022 to 2024](https://cloud.overment.com/2024-09-26/aidevs3_midjourney-79dd9b18-9.png)

Generowanie obrazów według złożonych promptów jest nadal wyzwaniem, a bardziej kompleksowe opisy często prowadzą do niejednoznacznych rezultatów. Mimo to, jakość generowanych grafik nadal pozostaje na wysokim poziomie, co pozwala na tworzenie pojedynczych elementów lub na edycję istniejących już grafik.

Dobrym przykładem jest wykorzystanie [ComfyUI](ComfyUI) do zamiany elementów zdjęć, jak pokazuje poniższa ilustracja, gdzie moja twarz została wymieniona na twarz wygenerowaną w [Midjourney](tools/Midjourney.md).

![ComfyUI Face Swap Example](https://cloud.overment.com/2024-09-26/aidevs3_swap-92e327ca-8.png)

## Dostęp i użycie modeli obrazowych przez API i hosting

Dla programistów istotnym aspektem jest dostęp do modeli przez API oraz ich hosting. Platformy takie jak [Replicate](tools/Replicate.md) i [Leonardo.ai](https://leonardo.ai/) oferują dostęp do modeli przez API, podczas gdy [RunPod](https://blog.runpod.io/how-to-get-stable-diffusion-set-up-with-comfyui-on-runpod/) zapewnia odpowiednią infrastrukturę dla GPU.

Posługiwanie się szablonami staje się kluczowe w marketingu, gdzie potrzeba generowania grafik w różnych formatach jest niemal nieodłączna. Eduweb.pl stosuje szablony do generowania okładek dla wydarzeń i kursów, automatycznie dostosowując formaty bez potrzeby ręcznych przeróbek.

![Eduweb.pl Template Example](https://cloud.overment.com/2024-09-26/aidevs3_eduweb-b678b9a8-5.png)

## Techniki projektowania promptów dla modeli

Podobnie jak w przypadku modeli językowych, w generowaniu grafik kluczowe jest tworzenie efektywnych promptów. Wymaga to precyzyjnego użycia słów kluczowych oraz odniesień graficznych. Przykłady promptów z galerii [Midjourney](tools/Midjourney.md) pokazują, jak szczegółowe opisy mogą prowadzić do różnorodnych efektów wizualnych.

Jednym ze sposobów zwiększania sterowności modeli jest stosowanie meta promptów, które zawierają stałe fragmenty do powtarzalnego generowania wizualizacji. Przykładem jest tworzenie serii avatarów, gdzie każdy z nich zachowuje spójny styl, co pokazano na ilustracji poniżej.

![Example of Meta Prompt Avatars](https://cloud.overment.com/2024-09-27/aidevs3_smoke-2656d5ad-6.png)

## Generowanie grafik w oparciu o szablony

Choć [ComfyUI](ComfyUI) pozwala na dalekie dostosowywanie grafik, generowanie ich w oparciu o HTML-owe szablony oferuje większą precyzję. Narzędzie [htmlcsstoimage](https://htmlcsstoimage.com) umożliwia tworzenie grafik z szablonów HTML przez API, co pozwala na dynamiczną wymianę tekstów i elementów wizualnych. Połączenie tego z modelami [Vision Language Models](glossary/Vision%20Language%Models.md) poszerza możliwości w kontekście automatyzacji marketingu i personalizacji treści na dużą skalę.

![HTML to Image Example](https://cloud.overment.com/2024-09-27/aidevs3_htmlcsstoimage-c6f590af-a.png)

## Podsumowanie

Generatywne AI wprowadza do świata projektowania graficznego nowe możliwości dla automatyzacji i tworzenia specjalistycznych narzędzi. [ComfyUI](ComfyUI) i [HTMLCSStoImage](https://htmlcsstoimage.com) to kluczowe narzędzia w integracji AI do programowania, umożliwiające budowanie zaawansowanych rozwiązań do wsparcia procesów marketingowych i produktowych.

Warto zainteresować się tymi technologiami, nawet jeśli bezpośrednio nie pracujemy z grafiką, ponieważ oferują one znaczną wartość dla automatyzacji i wzbogacania procesów produkcyjnych, tak jak pokazano na przykładzie edukacyjnej platformy eduweb.pl.

Dla osób pragnących pogłębić wiedzę na temat generatywnej grafiki, poniżej zamieszczamy film instruktażowy dotyczący użycia narzędzia ComfyUI:

<div style="padding:75% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1029104946?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="02_03_comfy"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

Powodzenia!