Rozdział 3, lekcja 1 — Interakcja z dużym modelem językowym

Zdolność dużych modeli językowych do generowania ustrukturyzowanych treści umożliwia ich integrację z logiką aplikacji, co pozwala programistycznie sterować ich zachowaniem. Na obecnym etapie rozwoju pełnią one rolę narzędzi, które umożliwiają przetwarzanie i generowanie danych w sposób dotąd niemożliwy do osiągnięcia metodami programistycznymi, na przykład z pomocą wyrażeń regularnych.

W kursie AI_devs 3 skupimy się na programistycznej interakcji z dużymi modelami językowymi poprzez API, budując częściowo-autonomiczne narzędzia zwane "Agentami AI" lub "Systemami Agencyjnymi". Są to złożone rozwiązania wymagające praktycznego doświadczenia w programowaniu i dobrego zrozumienia natury dużych modeli językowych.

Te narzędzia mogą realizować najróżniejsze zadania i procesy, ale nie są uniwersalne. Dlatego skupimy się na tworzeniu ich indywidualnych komponentów oraz modułów. Dzięki temu możliwe będzie ich połączenie w różnych konfiguracjach i dopasowanie do naszych potrzeb.

Jeszcze kilka miesięcy temu wybór modelu ogólnego zastosowania zaczynał się i kończył na OpenAI. Natomiast dziś pod uwagę możemy brać:

- OpenAI: Modele z rodziny o1, GPT, w tym także TTS, Whisper i Embedding
- Anthropic: Modele z rodziny Claude, obsługujące tekst oraz obraz
- Vertex AI, czyli rozwiązanie Google: Modele Gemini oraz wybranych dostawców, na przykład Anthropic i inne
- xAI: Modele Grok, które szybko przebiły się na szczyty rankingów
- Amazon Bedrock: Modele takie jak Anthropic, Mistral czy Meta
- Azure od Microsoftu: Modele OpenAI, Meta i inne
- Groq: Modele Open Source, na przykład Llama
- a także kilka innych, takich jak OpenRouter, Perplexity, Cerebras, Databricks, Mistral AI czy Together AI

Możemy zatem wybierać między różnymi ofertami cenowymi, limitami dostępu do API, polityką prywatności i przetwarzania danych, a także samymi modelami. Jest to istotne, ponieważ agenci AI będą autonomicznie korzystać z naszych baz wiedzy lub uzyskają dostęp do narzędzi. Przełoży się to na działanie na dość dużą skalę, uwzględniające przetwarzanie nawet dziesiątek milionów tokenów, co generuje zauważalne koszty. Obrazuje to przykład zapytania z prośbą do Agenta AI o zapisanie zadań w Linear, co przełożyło się na 17,400 tokenów zapytania i 461 tokenów odpowiedzi. Warto także zwrócić uwagę na czas wykonania zapytania, który wyniósł "aż" 24 sekundy.