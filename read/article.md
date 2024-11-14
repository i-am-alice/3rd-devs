## Interakcja z dużym modelem językowym

Zdolność [dużych modeli językowych](glossary/LLM.md) do generowania ustrukturyzowanych treści umożliwia ich integrację z logiką aplikacji, co pozwala programistycznie sterować ich zachowaniem. Na obecnym etapie rozwoju pełnią rolę narzędzia, które umożliwia przetwarzanie i generowanie danych w sposób dotąd niemożliwy do osiągnięcia programistycznie (np. z pomocą wyrażeń regularnych).

W AI_devs 3 skupimy się na programistycznej interakcji z dużymi modelami językowymi poprzez [API](glossary/LLM%20API.md), budując częściowo-autonomiczne narzędzia zwane "[Agentami AI](glossary/Agent.md)" lub "Systemami Agencyjnymi". To złożone rozwiązania wymagające praktycznego doświadczenia w programowaniu i dobrego zrozumienia natury dużych modeli językowych.

Narzędzia te mogą realizować najróżniejsze zadania i procesy, ale nie są uniwersalne. Dlatego **skupimy się na tworzeniu ich indywidualnych komponentów oraz modułów.** W ten sposób możliwe będzie ich połączenie w różnych konfiguracjach i dopasowanie do naszych potrzeb. 

Jeszcze kilka miesięcy temu wybór modelu ogólnego zastosowania zaczynał się i kończył na [OpenAI](services/OpenAI.md). Natomiast dziś pod uwagę możemy brać: 

- [OpenAI](services/OpenAI.md): Modele z rodziny o1, GPT, w tym także TTS, Whisper i Embedding
- [Anthropic](services/Anthropic.md): Modele z rodziny Claude (tylko tekst + obraz)
- [Vertex AI](services/Vertex%20AI.md) (Google): Modele Gemini oraz wybranych dostawców (np. Anthropic) i inne
- [xAI](https://accounts.x.ai): Modele Grok, które dość szybko przebiły się na szczyty rankingów (top10). 
- [Amazon Bedrock](services/Amazon%20Bedrock.md) (Amazon): Modele Anthropic, Mistral czy Meta i inne
- [Azure](services/Azure%20OpenAI%20Service.md) (Microsoft): Modele OpenAI, Meta i inne
- [Groq](services/Groq.md): Modele Open Source, np. Llama
- a także kilka innych, np.: OpenRouter, Perplexity, Cerebras, Databricks, Mistral AI czy Together AI

Możemy zatem wybierać między różnymi ofertami cenowymi, limitami dostępu do API, polityką prywatności i przetwarzania danych, a także samymi modelami. Jest to istotne, ponieważ [agenci](glossary/Agent.md) AI będą autonomicznie korzystać z naszych baz wiedzy lub uzyskają dostęp do narzędzi. Przełoży się to na działanie na dość dużej skali, uwzględniającej przetwarzanie nawet dziesiątek milionów tokenów, co generuje zauważalne koszty. Obrazuje to poniższy przykład zapytania z prośbą do Agenta AI o zapisanie zadań w [Linear](https://linear.app/), co przełożyło się na 17,400 tokenów zapytania (input) i 461 tokenów odpowiedzi (output). Warto też zwrócić uwagę na czas wykonania zapytania, czyli "aż" 24 sekundy. 