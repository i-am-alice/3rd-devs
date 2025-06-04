The task is to create two scripts that strictly follow all of the requirements specified in this file.

<rules>
* Don't add any external dependencies. You can use openai's nodejs sdk if needed.
* Don't pay attention to `.env` file. It has already been added.
* Don't run any scripts to test the functionality.
* Don't write any tests.
* DO NOT add any comments explaining the code.
* Use local firecrawl self hosted. Initialize @mendable/firecrawl-js with the apiUrl in config that will point to http://localhost:3002. It doesn't need an apiKey.
</rules>

<technical_details>
`/tools/scrape-website.ts`:
* Implement a tool that will scrape a website and return the content of the website.
* The tool will use @mendable/firecrawl-js to scrape the website.
* It will receive only one argument which is the url of the website to scrape.
* The tool will return the content of the website as a markdown string and all of the links that were found on the website along with their labels and context.

`agent.ts`:
* Implement an agent that will use the scrape-website tool to scrape a website.
* The agent will receive a prompt from the user and work in a loop until it find the answer to the question. The answser has to be short concise and not contain any other information. Just the answer.
* Agent receives a prompt from the user.
The loop of an agent is going to look this way:
* Agent uses the scrape-website tool to scrape a website.
* Agent uses the scraped content to assess whether it contains the information it needs to answer the question.
    * If YES - Then Agent returns the answer to the console.
    * If NO:
        * Agent writes the current scraped url to the state. It will use it to avoid scraping the same website multiple times.
        * Agent uses the links returned from the scrape-website tool to scrape the next website in order to find the answer. It should consider whether the website is already in the state or not. Agent should pick the link that has the most relevant label and context that suggests it is most likely to contain the answer.
</technical_details>