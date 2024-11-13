# AI_devs 3, Lekcja 1, Moduł 1 — Interakcja z dużym modelem językowym

![Okładka](https://cloud.overment.com/S02E03-1731372201.png)

## Wprowadzenie do generatywnego AI w tworzeniu i manipulacji grafikami

Generatywne AI otwiera nowe możliwości w projektowaniu graficznym i edycji zdjęć. Narzędzia takie jak [Midjourney](tools/Midjourney.md) i [Stable Diffusion](glossary/Stable%20Diffusion.md) są coraz częściej wykorzystywane nie tylko przez projektantów, ale również przez programistów.

### Praktyczne zastosowanie generatywnego AI

[picthing](https://pic.ping.gg/) to narzędzie stworzone przez Theo z `t3.gg`, umożliwiające wysokiej jakości usuwanie tła ze zdjęć.

![Przykład usuwania tła za pomocą Picthing](https://cloud.overment.com/2024-09-26/aidevs3_picthing-a5ce0e6a-b.png)

Pieter Levels w projektach [PhotoAI](https://photoai.com/) i [InteriorAI](https://interiorai.com) pokazuje, jak AI może rozwiązywać konkretne problemy w różnych dziedzinach.

![Projekty Pietera Levelsa](https://cloud.overment.com/2024-09-26/aidevs3_levelsio-55df5a6e-5.png)

## Obecne możliwości generowania obrazu

W ciągu ostatnich dwóch lat nastąpił znaczący postęp w jakości generowanych obrazów przez AI. Modele takie jak [Flux](glossary/Flux.md) coraz lepiej radzą sobie z generowaniem elementów takich jak tekst czy lustrzane odbicia, choć powtarzalność wyników bywa różna.

![Porównanie obrazów generowanych przez AI w latach 2022 i 2024](https://cloud.overment.com/2024-09-26/aidevs3_midjourney-79dd9b18-9.png)

Generowanie obrazów na podstawie złożonych promptów nadal stanowi wyzwanie, często prowadząc do niejednoznacznych rezultatów. Mimo to, jakość generowanych grafik pozwala na tworzenie pojedynczych elementów i edycję istniejących obrazów.

Przykładem jest użycie [ComfyUI](ComfyUI) do zastępowania elementów na zdjęciach, jak na poniższym przykładzie, gdzie moja twarz została zastąpiona twarzą wygenerowaną w [Midjourney](tools/Midjourney.md).

![Przykład zamiany twarzy za pomocą ComfyUI](https://cloud.overment.com/2024-09-26/aidevs3_swap-92e327ca-8.png)

## Dostęp do modeli obrazowych przez API i hosting

Dla programistów istotny jest dostęp do modeli przez API oraz możliwość ich hostowania. Platformy takie jak [Replicate](tools/Replicate.md) i [Leonardo.ai](https://leonardo.ai/) oferują dostęp do modeli przez API, a [RunPod](https://blog.runpod.io/how-to-get-stable-diffusion-set-up-with-comfyui-on-runpod/) zapewnia infrastrukturę GPU.

W marketingu korzysta się z szablonów do generowania grafik w różnych formatach. Przykładem jest eduweb.pl, które używa szablonów do automatycznego tworzenia okładek dla wydarzeń i kursów.

![Przykład szablonu używanego przez eduweb.pl](https://cloud.overment.com/2024-09-26/aidevs3_eduweb-b678b9a8-5.png)

## Techniki tworzenia promptów dla modeli

Efektywne generowanie grafik zależy od umiejętnego tworzenia promptów, wykorzystujących słowa kluczowe i odniesienia graficzne. Przykłady promptów z galerii [Midjourney](tools/Midjourney.md) pokazują, jak różnorodne efekty można uzyskać dzięki precyzyjnym opisom.

Stosowanie meta promptów, zawierających stałe fragmenty, pozwala na powtarzalne generowanie grafik w spójnym stylu. Dzięki temu można tworzyć serie avatarów zachowujących jednolity charakter.

![Przykład avatarów wygenerowanych z użyciem meta promptów](https://cloud.overment.com/2024-09-27/aidevs3_smoke-2656d5ad-6.png)

## Generowanie grafik na podstawie szablonów

Choć [ComfyUI](ComfyUI) umożliwia zaawansowane dostosowywanie grafik, generowanie ich na podstawie szablonów HTML daje większą precyzję. Narzędzie [htmlcsstoimage](https://htmlcsstoimage.com) pozwala na tworzenie grafik z szablonów HTML przez API, umożliwiając dynamiczną wymianę tekstów i elementów wizualnych.

Połączenie tego z modelami [Vision Language Models](glossary/Vision%20Language%20Models.md) otwiera nowe możliwości w automatyzacji marketingu i personalizacji treści.

![Przykład generowania grafiki z HTML](https://cloud.overment.com/2024-09-27/aidevs3_htmlcsstoimage-c6f590af-a.png)

## Podsumowanie

Generatywne AI wprowadza innowacje w projektowaniu graficznym, oferując narzędzia do automatyzacji i tworzenia specjalistycznych rozwiązań. [ComfyUI](ComfyUI) i [htmlcsstoimage](https://htmlcsstoimage.com) są kluczowymi narzędziami integrującymi AI z programowaniem, umożliwiając tworzenie zaawansowanych rozwiązań wspierających procesy marketingowe i produktowe.

Warto eksplorować te technologie, nawet jeśli nie zajmujemy się grafiką na co dzień, ponieważ oferują one istotne korzyści w automatyzacji i usprawnianiu procesów produkcyjnych, czego przykładem jest eduweb.pl.

Dla zainteresowanych pogłębieniem wiedzy na temat generatywnej grafiki, poniżej zamieszczamy film instruktażowy dotyczący użycia narzędzia ComfyUI:

<div style="padding:75% 0 0 0;position:relative;"><iframe src="https://player.vimeo.com/video/1029104946?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" style="position:absolute;top:0;left:0;width:100%;height:100%;" title="02_03_comfy"></iframe></div><script src="https://player.vimeo.com/api/player.js"></script>

Powodzenia!