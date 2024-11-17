# Indie Hacker's toolstack 2024

Applications and tools are essential in my daily life. Although I monitor the market for new solutions, I don't focus on it much due to my process. In this post, I'll share this process, along with a list of tools and their configurations. While everyone's workflow varies, you'll likely find helpful inspiration here.

## Text editor(s)

Writing is a key element of my work and various processes, such as learning. Moreover, text appears in different areas: daily communication, emails, newsletters, articles, scripts, website descriptions, documentation, documents. Reports from [Rize](https://rize.io/) show that the text editor is the application where I spend the most time (23%). Therefore, I ensure that writing experiences foster the creative process.

Currently, I work with several text editors. They are:

- [iA Writer](https://ia.net/topics/category/writer): In my view, it's the top markdown syntax editor, with minimalism as its prime benefit. Yet, it's not ideal for note management, and all connected features are lacking.

![](https://cloud.overment.com/2024-05-30/tech_ia-ee9f8793-8.png)

- [Paper](https://papereditor.app/): a great candidate to replace iA Writer. The writing experience is even better than iA Writer. Unfortunately, the app has some bugs and limitations, which make me use it only for simple notes.

![](https://cloud.overment.com/2024-05-30/tech_ia-ee9f8793-8.png)

- [Obsidian](https://obsidian.md/): an app I rarely write in and usually just paste content from iA Writer or Paper. However, it excels in content organization. Moreover, combined with [Vitepress](https://vitepress.vuejs.org/), it allows me to share most of my notes online as a static website.

![](https://cloud.overment.com/2024-05-30/tech_obsidian-70b500cb-d.png)

- [Notion](https://www.notion.so/): it's the last app where I write content mainly in collaboration with others, to share with others or due to automation (Notion is the only one of the above editors that provides an API, which connects with my services).

![](https://cloud.overment.com/2024-05-30/tech_notion-8972a825-3.png)

Working with multiple text editors in practice works quite well because iA Writer is used for writing longer forms, Paper for short notes, Obsidian helps organize them, and Notion allows sharing with others. The common element for these editors, however, is the **Markdown syntax** I wrote more about in [Plain Text is What You Need](https://www.techsistence.com/p/plain-text-is-what-you-need-but-why).

When I write, GPT-4 / Claude 3 Opus continuously accompanies me, their role being **to correct and enhance readability** or similar transformations of the content I produce. LLMs also perform well during brainstorming sessions and discussions on the topic I'm currently focusing on.

![](https://cloud.overment.com/2024-05-30/tech_writing-dd3a8ec4-5.png)

While writing:

- Editor is in full-screen mode
- Typing on [Wooting 60HE](https://wooting.io/) keyboard
- Listening to music on [Spotify](https://www.spotify.com/) or [Endel](https://endel.io/)
- Taking screenshots with [Xnapper](https://xnapper.com/)
- Generating code snippets in [ray.so](https://ray.so/) via Puppeteer automation macro
- Optimizing images with a macro linked to [TinyPNG](https://tinypng.com/)
- Sharing images and files using [Dropshare](https://dropshare.app/)
- Hosting images and files on [DigitalOcean](https://www.digitalocean.com/)
- Using converters for HTML -> Markdown, Markdown -> HTML, Notion -> Markdown, and Markdown -> Notion. This allows me to write newsletters and blogs in markdown editor, then automate conversion to the target format. Uploading files to my own hosting is key here.
- Keyboard settings: \"Key repeat rate\" at maximum and \"Delay until repeat\" at minimum
- Using `text expander` for frequently repeated phrases like proper names (e.g., .tech becomes Tech•sistence), URLs, email addresses, contact details
- Navigating almost entirely with the keyboard, avoiding the mouse. Useful shortcuts include: move cursor to start/end of word (`Command + ← or →`), start/end of line (`Option + ← or →`), start/end of paragraph (`Command + ↑ or ↓`), delete next/previous word (`Option + Backspace or Option + Shift + Backspace`), select line/word/paragraph.
- Using trackpad gestures for controlling music, managing windows/desktops, switching text editor functions, or sending selected text to AI assistant.
- Utilizing keyboard shortcuts for actions related to screenshots, file optimization, and uploading.
- Using clipboard manager [Paste](https://setapp.com/apps/paste) for easier text editing and returning to previously copied content (links, snippets).

All the above activities apply to each mentioned application. Even if Notion allows pasting images directly into the document, I still upload them to my server first. Attachments uploaded directly to Notion expire and are accessible only after logging in, which is problematic for automation.

## General Workflow

Tasks, emails, and events are another area that I have quite well optimized. Unlike the tools where I write text, the priority here is the ability to connect with APIs. This allows me to leverage automation and AI in data organization. I wrote more about this in [User Interfaces may change because \"AI knows what we mean\"](https://www.techsistence.com/p/user-interfaces-may-change-because).

### Managing tasks

[Linear](https://linear.app/) is used both by our product team and myself to organize my work. All my tasks go here, and I almost never enter or edit their statuses manually. Instead, some entries appear as a result of automation (e.g., a new message with a label or a new file on Google Drive requiring my attention). Other entries I add via voice messages on Apple Watch or messages to the AI assistant on the Slack channel.  

![](https://cloud.overment.com/2024-05-30/tech_linear-6ac89e32-a.png)

Of all the task management tools, so far I’ve liked Todoist and Linear the most. In both cases, we’re talking about an API that allows almost unrestricted management of your data. Besides the API, a clear graphical interface and keyboard shortcut support are important to me, and Linear definitely performed better in this regard. Especially since, as you can see in the screenshot above, you can set views tailored to your needs or current situation.

So, on the topic of task management:

- I mainly add and edit tasks via voice or simple Slack and Alice messages. The AI then assigns new entries to the appropriate categories, priorities, and deadlines.
- The organization and updating of entries in Linear is handled by a series of GPT-4 prompts, which consider the rules I've defined once. If needed, I can override them by simply stating that a given task should be assigned to a different project than indicated by the category descriptions.
- Automation fills a large part of my tasks with various events and schedules. When possible, the AI assistant fetches additional information for the task description.
- My priority is API availability, as automation allows me to focus on executing tasks, removing most of the organizational burden, except for planning-related activities.

### E-mail

For years, I've been using Google Workspace in conjunction with Superhuman. This is no coincidence, as Gmail itself is a great service that also has rich automation capabilities, both through external services (e.g., scenarios on [make.com](make.com)) and internal settings (advanced filters).

![](https://cloud.overment.com/2024-05-30/tech_super-659802da-c.png)

Email automation for me involves responding to new messages that Gmail automatically assigns specific labels to. For example, messages containing the keyword \"Invoice\" are assigned the \"Invoices\" label. This, in turn, triggers a Make.com scenario that takes further actions with the content of that message (e.g., saving the attachment to Google Drive or adding a task to Linear).

![](https://cloud.overment.com/2024-05-30/tech_filters-9b8c5133-9.png)

Sometimes, filter rules aren't enough to correctly capture all messages. In those cases, I manually add labels in Superhuman, but I do this using keyboard shortcuts, which makes the whole process much easier.

![](https://cloud.overment.com/2024-05-30/tech_supershortcuts-a6dbf423-9.png)

Working with email also involves an account connected to an AI assistant, which can send me various messages after completing assigned tasks. I wrote more about this in the post [Personal AGI](https://www.techsistence.com/p/personal-agi-pushing-gpt-4-turbo).

Regarding email management:

- Superhuman's keyboard shortcuts and overall look & feel make working with email enjoyable and fast. Its high price is justified (though this is very subjective).
- Gmail / Google Workspace is a \"must-have.\"
- Combining automatic filters with labels and automation greatly simplifies email management, document organization, and prioritization.

### Calendar

My calendar is mostly empty, with no more than two recurring meetings in bi-weekly cycles. This allows me to work with focus, communicating asynchronously via Slack or other channels.

However, you can book a slot in my calendar through [Zencal](https://zencal.io/). These are pre-set time blocks that automatically disappear when a meeting is scheduled or another entry, such as a trip, appears in my calendar.
![](https://cloud.overment.com/2024-05-30/tech_schedule-b6fa1c16-3.png)

Similarly to a task list, I can add new calendar entries via voice message to my AI assistant. The assistant can also check my availability or retrieve events from a specific range. Ultimately, I still occasionally check the calendar myself, and then I use the [Notion Calendar](https://www.notion.so/product/calendar) app.

![](https://cloud.overment.com/2024-05-30/tech_cal-ae93f4da-8.png)

Notion Calendar in its own way resembles Superhuman and offers intuitive keyboard shortcuts and a minimalist interface.

On the topic of calendar management:

- Managing entries is done either by voice or through simple messages to an AI assistant (requires custom integrations)
- Zencal is a brilliant tool for scheduling meetings (including paid ones), which can incorporate various automations (e.g., sending forms before the meeting or notes after the meeting)
- Notion Calendar is a good, though not perfect, client.

## Searching Web

[Arc Browser](https://arc.net/) is my main browser on both macOS and iOS. Despite the ability to organize tabs or profiles, I only use its basic functionalities. Yet, the Command Bar (`Command + T`) and Little Arc (`Command + Option + N`) make a significant difference for me.

![](https://cloud.overment.com/2024-05-30/tech_arc-a98a5765-5.png)

In a situation where I come across an interesting source (e.g., article, publication, or video) that I can't review at the moment or know I'll want to return to, I use a keyboard shortcut to send the open page to the AI assistant. The assistant then fetches available information about the page and saves the link to it in Linear and Feedly (pinning it to the appropriate board).

The thread of staying up-to-date and monitoring news on topics that interest me is addressed through Feedly. Similar to previous tools, the main factor influencing the choice here is the availability of an API.

![](https://cloud.overment.com/2024-05-30/tech_feed-9961c0a1-9.png)

I've connected Feedly boards with Make.com automations, so simply pinning a post triggers additional actions. For instance, it saves the link in my assistant's long-term memory. This memory is linked with search engines (Algolia and Qdrant), allowing easy retrieval of previously saved sources without needing to specify their exact names.

![](https://cloud.overment.com/2024-05-30/tech_memory-d7413d87-2.png)

So, browsing the web for me means:

- A browser solely for Internet browsing. I don't save bookmarks or other info. Instead, I use macros and automation to organize knowledge in set places, all controlled by LLM (GPT-4-turbo and GPT-4o).
- Staying updated and exploring new topics with Feedly and sites like [Product Hunt](https://www.producthunt.com/), [daily.dev](https://app.daily.dev/onboarding), [Indie Hackers](https://www.indiehackers.com/), or [HackerNews](https://news.ycombinator.com/).
- The foundation of the whole system is my custom AI assistant and its long-term memory. Note, this isn't Alice from [heyalice.app](https://heyalice.app), but my private app, which I'm gradually making publicly available.

## Graphic Design

Designing UI and promotional materials is an integral part of my work. I mainly use [Figma](https://figma.com) and recently returned to [Adobe Photoshop Beta](https://www.adobe.com/products/photoshop.html) due to its Generative AI features, which are excellent for editing images and assets generated in Midjourney.

Below is an example of covers for one of my courses, which I generated in Midjourney with slight editing through Adobe Firefly. 

![](https://cloud.overment.com/2024-05-30/tech_covers-31b8727b-c.png)

Figma works phenomenally for UI design, especially when using components and the auto-layout feature.

![](https://cloud.overment.com/2024-05-30/tech_components-31c52ec9-8.png)

There are creations, however, that are generated according to templates, and creating new versions involves only text replacement or simple layout editing. In such cases, Webflow becomes my graphic editor.

![](https://cloud.overment.com/2024-05-30/tech_webflow-4bc4e1f1-3.png)

The AI assistant only needs information from me on how to generate the graphic (or set of graphics), along with the set of information needed to create them (e.g., text, link to background image). The assistant automates contact with Webflow to update the CMS entry, then downloads the page as a PNG and sends it to me.

![](https://cloud.overment.com/2024-05-30/tech_gen-cbce636f-e.png)

When designing creations, I always use Midjourney Alpha. I generate various graphic or asset variants there, which I often combine in Photoshop. 

![](https://cloud.overment.com/2024-05-30/tech_mid-829ce30c-9.png)

Summarizing the topic of graphic design:

- I use Generative AI, and currently, Midjourney or Stable Diffusion 3 works best.
- Figma is undeniably the best available tool for interface design or creating advertisements. It's definitely worth getting to know its more advanced features, which save a lot of time.
- Webflow combined with HTMLCSSToImage allows for automatic generation of graphics based on templates. Alternatively, you can use the latter tool directly, where you only need an HTML template in which you replace individual elements with automation.
- Combining LLM with a set of templates allows for easy generation of entire sets of advertisements in various variants.


## Programming

Programming is the second (after writing texts) activity that takes up most of my time, and therefore I also pay a lot of attention to it in the context of optimizing the entire process.

I use the following tools:

- [IntelliJ IDEA](https://www.jetbrains.com/idea/): This is my main code editor. Although I don't program in JAVA, IntelliJ works great with various programming languages (for me, it's TypeScript and Rust).
- [Supermaven](https://supermaven.com/): This is an alternative to Github Copilot that I have just started using, and it makes a great first impression by suggesting code very intelligently.
- [iTerm](https://iterm2.com/): Although I have gone through many different terminals, iTerm won with its simplicity and the fact that it performs its task perfectly.
- [TablePlus](https://tableplus.com/): This is a great database client for macOS.

![](https://cloud.overment.com/2024-05-30/tech_intelij-4283c83e-c.png)

Above you can see my IntelliJ configuration. All panels and additional options are turned off because I constantly use keyboard shortcuts. This is especially justified due to the very high customization possibilities of this IDE and the presence of a \"Command Palette\" style search.

![](https://cloud.overment.com/2024-05-30/tech_files-4268c510-0.png)

For actions that do not have a keyboard shortcut or I simply use them rarely, I use Search Menu Items, one of the options of the [Raycast](https://www.raycast.com/) application.

![](https://cloud.overment.com/2024-05-30/tech_items-0a49d7b1-6.png)

Since the release of ChatGPT, large language models have been my constant companions in programming. I'm not just talking about generating code or debugging but also discussing problems, making design decisions, and learning new technologies. Of course, the final decisions are always mine, but models like GPT-4-turbo or Claude 3 Opus are almost perfect conversation partners.

So, on the topic of programming:

- I use the best available tools that work for me. For example, despite the enormous popularity of Visual Studio Code, IntelliJ works incomparably better for me. The main argument here is that IntelliJ simply \"understands my code\" much better than VSC.
- Generative AI is another level of pair programming for me because, in this case, such a partner is available to me all the time and often has much more knowledge than I do, although it quite often makes mistakes. Despite this, the final balance of mistakes with the value I receive is definitely positive.
- Where justified, I use tools to automate working with code. A \"must-have\" is application deployment, which I always perform through Github Actions.
- As seen even in the previous points, I use programming skills not only to develop products and work but also to develop tools for my needs. 

## Macros and Automations

I'll write a separate post about macros and automation, as it's too extensive a topic to cover in a few points. I'll just note that I work with applications: [Shortcuts](https://apps.apple.com/us/app/shortcuts/id915249334), [Keyboard Maestro](https://folivora.ai/), [Better Touch Tool](https://folivora.ai/), [Raycast](https://www.raycast.com/), and of course [make.com](https://www.make.com/).

The whole system is also supplemented by my personal API, which is directly integrated with my AI assistant. As a result, macros and automations can communicate with both me and each other. The system gradually evolves with the development of large language models and entire ecosystems of tools.

So if you're interested in this topic and want to see how I've addressed it, be sure to subscribe to Tech•sistence.

## Fun

Outside of work, I'm also a fan of books and games, spending my free afternoons and evenings with them. I log all the titles I've read on my Goodreads profile, often sharing highlighted passages or notes.

![](https://cloud.overment.com/2024-05-30/tech_goodreads-9d29499c-a.png)

I always read books in the [Amazon Kindle](https://play.google.com/store/apps/details) app or listen via [Audible](https://www.audible.com). It’s very helpful that if you have both the audiobook and e-book versions, progress syncs between devices, making reading much easier.

However, in the past several months, I've spent much less time with books because my main area of interest has shifted to topics that books haven’t been written about yet, like Generative AI or new programming languages and tools. As for books, I now reach for more challenging, timeless titles that require much more time than typical bestsellers in business, psychology, or economics.

For games, my number one is currently PlayStation 5, followed by Nvidia GeForce Now, a streaming service connected to my Steam account (and more). Outside home, I also play on the Steam Deck, which is an incredibly impressive device, and the Nintendo Switch.

![](https://cloud.overment.com/2024-05-30/tech_gfn-158e7285-2.png)

Both while gaming and reading, I also listen to music, which (as you might know) is also connected to my AI assistant. Therefore, the availability of an API and cross-platform functionality is essential for the player, and Spotify excels in this regard.

![](https://cloud.overment.com/2024-05-30/tech_spotify-bc1fa329-6.png)

When I need to focus, e.g., while programming, designing, or writing longer texts, I also turn to [endel.io](https://endel.io/).

![](https://cloud.overment.com/2024-05-30/tech_endel-aad69006-1.png)

## Summary

Although I didn't manage to exhaust the topic of tools, I think I outlined the general framework of the set I currently use quite well.

If you have any questions about the selected tools or the ways I work with them, let me know in the comments. Similarly, if you want my future posts to cover specific topics, let me know as well.

Closing this post, I'll just note that the mentioned set is constantly changing. Even if some of the tools have been with me for years, the ways I work with them change. I see this as an important part of my development and daily life. The whole setup is configured not only to increase my productivity but also to make each of my days more enjoyable and simply fun.

Have fun,
Adam


#techsistence #newsletter