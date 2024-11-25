In the examples included in previous lessons, we often connected the model with external tools. These were usually simple interactions that allowed for providing external context or performing uncomplicated tasks. Moreover, the way of using these tools was only slightly the responsibility of the LLM, and we mostly described it with code, creating so-called chains.

Now we will take this to a higher level by preparing tools that will shift more responsibility onto the language model while maintaining as much control and support for the model from the code side. In other words:

- The LLM will not only be responsible for generating input data and controlling function parameters.
- Instead, the LLM will receive a tool (set of functions), a user manual, and a complete set of information enabling almost completely autonomous operation.

We first presented examples of integrating language models (LLMs) with external tools in lesson S01E01. Now we will delve into this topic more comprehensively, increasing the precision of operation and resistance to potential errors.

As an introduction, I will also note the presence of Function Calling (or Tool Use) - functionalities offered by OpenAI and Anthropic. Their assumption is to facilitate interaction with the model when external source information appears. However, I will deliberately limit their application because they impose a series of restrictions without offering value that justifies their choice. I will only note that the concepts we will discuss will also apply to these functionalities, so there will be no obstacles to reaching for them.

Instead, we will use techniques for conducting interactions with the model we have talked about before, supporting ourselves with JSON Mode and Structured Output. The main advantage of this approach is the flexibility that allows even switching between models of different providers. This is particularly important due to the dynamic development of the industry and the potential need for quickly transitioning between models.

## Assumptions for agents' tools

By an AI agent's "tool," we mean a set of functions and prompts. They enable the LLM (usually) to autonomously use external services, applications, or devices. This includes both managing a task list in Linear and performing actions on Internet-connected devices. A tool can also be another generative application specialized in a specified task — in other words: another AI agent.

So far, we have repeatedly found that model operation predictability is limited. We are never sure if we will get the expected result. Instead, we move within a **probability** area, aiming to increase the chance of acting according to assumptions.

This clearly suggests that **tools for agents should not perform critical processes**; their contact with the external world should be as limited as possible, and the actions taken should be reversible. On the other hand, we open up a space before us for performing processes that until now remained out of reach of code.

A tool for LLM must therefore meet the following requirements:

- Its name must be obvious, concise, unique, and distinctive, so the model can certainly determine which tool to choose from the available skill list.
- Each tool should contain a **concise description**. Such a description will not only make it easier for the model to choose the right tool but also present its capabilities and limitations.
- The tool must also have a user manual, which can take the form of one or more prompts. The result of their operation will be a JSON/YAML object containing properties needed to launch the function.
- The tool must have defined **input data structure**, **dependencies**, **output data structure**, and **available action list**. In other words, each of the tools must be built so that it is possible to use them **in various configurations**.

Additionally, we must take care of aspects related to the logic of using tools, which include, among others:

- Sets of test data and automatic tests for all prompts
- Saving the history of actions taken, allowing for loading the query and outcome for
- Error handling with an automatic repair option
- An asynchronous action execution system (queue, event response, or acting according to a schedule)

Thus, the concept of a 'tool' takes shape as an independently operating application module that an LLM can use. Let's try to gather it all into a cohesive whole.

## Structure of the tool interface

Let's start by outlining the general perspective of what range of possibilities tools for agents may offer. Some examples:

- Managing a task list, even in the context of the entire project
- Managing calendars and communication related to them (email drafts, summaries, reports)
- Transformation of extensive documents (e.g., translation)
- Generating complex forms (e.g., tests, audio, images)
- Advanced Internet searches
- Managing schedules for cyclical tasks
- Notification and messaging systems (Slack, Email, SMS)
- ...and others

These tools will be able to be launched by the model individually but also in combination. As a result, the agent will be able to receive a command like: "Every morning, visit the pages `...`, summarize their content, and send it to me via email," based on which it will establish an action plan and execute it.

Let's try to build the first tool from the list that will comprehensively take care of our task list and do so in a manner good enough that we will want to use it daily. What's more, the developed scheme should open the way for us to build subsequent tools that will eventually cooperate with each other. For simplicity, we will use the tool [Todoist](https://todoist.com/) due to its popularity, but we will establish an interface allowing for an easy switch to another solution.

The actions of the tool for managing the to-do application include:

- Fetching the list of projects
- Fetching the task list
- Adding, modifying, and removing tasks
- Observing the task list

While the tool interface looks like this:

- **Input:** A list of messages from the conversation, optional context in the form of a document, meeting notes, photo description, or current location
- **Output:** An XML list containing details of actions taken, along with their status and feedback

And the individual actions as follows:

- **Project List**
  - Input: none
  - Output: array of objects with ID, name, description, and number of active tasks **or error information**
- **Task List (list):**
  - Input: project IDs, task IDs, date range, status
  - Output: array of objects with ID, project ID, name, description, status, start date, update date **or error information**
- **Task (get):**
  - Input: task ID
  - Output: object with ID, project ID, name, description, status, start date, update date **or error information**
- **Add Task (add):**
  - Input: project ID, name, description, status, start date
  - Output: object with ID, project ID, name, description, status, start date, update date **or error information**
- **Update Task (update):**
  - Input: task ID, at least one of the optional task fields
  - Output: object with ID, project ID, name, description, status, start date, update date **or error information**
- **Understand Query:**
  - Input: original user query
  - Output: object containing queries of type "add," "update," "delete," "list," "get."

In the case of these actions, we aim to provide **a complete set of input information** needed to take action and output data needed for the LLM to determine what to do next.

## Instructions for the model

Now we need a series of prompts for the model, along with a set of test data and automated tests, that will allow us to achieve a possibly high success rate.

Let's start by defining the name and description of the tool we are building:

- **name:** manage_todo
- **description**: Use this tool to access & manage Todoist tasks and projects. Available actions: **listing projects, retrieving tasks, adding, modifying, and deleting tasks, and monitoring for task updates.**

There is no room for doubts about what this tool is and what actions are available.

The first action, "Project List," does not require any input data, so no prompt is needed. However, the result returned by it will be in the form of a JSON object, which we will map to text with `XML-like` tags.

The second action, "Task List," already requires model instruction because we need to narrow the search concerning date and selected projects. The content of such a prompt is in the file `todo/prompts/list_tasks.ts`, and it was generated using the meta prompt that we discussed in lesson S00E02 — Prompt Engineering, and several iterations shaping its behavior.

![Image 1 with result](https://cloud.overment.com/2024-10-15/aidevs3_list_tasks-40bd7275-c.png)

In addition to the instruction, the file also contains a set of sample data and a series of tests verifying the prompt's operation. The test can be run with the command `bun todo/prompts/list_tasks.ts`, which after a few/more seconds will return a result in the form of a table with PromptFoo results. The tests themselves were also generated by the LLM under my supervision (although there may be individual inaccuracies).

![Image 2 with output](https://cloud.overment.com/2024-10-15/aidevs3_list_tasks_test-d08b7d63-4.png)

All remaining prompts are prepared more or less according to the same rules. Specifically:

- Prompt structure follows the scheme: "Role | Objective | Response Format | Rules | Examples | Call to Action."
- Prompts contain the **minimum necessary context** to operate and focus on **one step.**
- Prompts generate JSON objects whose first property is always "`_thinking`," to extend the model's response time.
- Prompts contain context in the form of **a list of projects** and (some of them) **a list of tasks.** Additionally, where possible, dates in the prompt are generated **dynamically,** because LLM has the most issues with them.
- Test data sets aim to check typical issues with prompt operation and, where possible, verify the model's response using code (JavaScript), looking for keywords.
- Only two prompts handle original user messages. The others work on queries generated by the model to reduce the range of data that must be considered.

The next prompt `get_task.ts` is quite optional because in this case, we are not working with additional task information such as comments, labels, or subtasks. However, I include it for illustrative purposes.

The last prompts responsible for actions: `add_tasks` and `update_tasks` have one crucial feature — they allow **processing multiple records simultaneously**. This way, the model can decide, for example, to split the user's query into several tasks or exchange information between different records. This detail makes it more valuable for the user to send one message describing a series of tasks than to enter them manually. If the model worked on individual records, in most cases, it would be more convenient to add tasks themselves.

Finally, we have a prompt that can be described as the 'brain' of our tool. It is responsible for **interpreting the conversation with the user**, creating an action plan, and generating queries for each action. The effect of its operation is visible below. It reflects on what the user said and describes the actions (in this case, updating a task that was already on the list).

![Image 3 of augmented conversation](https://cloud.overment.com/2024-10-15/aidevs3_tool_plan-634e98fe-0.png)

Ultimately, the structure of the entire tool looks as follows:

- The user's query is received by the server
- The model plans actions related to the user's query
- Then, **parallel** query execution occurs, and responses are gathered (or this step is skipped if the conversation does not concern managing the task list)
- The last step is generating a response and returning it to the user

![Image 4 of tool workflow](https://cloud.overment.com/2024-10-15/aidevs3_tasks_tool-0e187ff2-a.png)

Before we move on, it's worth looking at the content of the prompts themselves, the examples presented in them, and the project categories, and the task list usually does not exceed a dozen records. All these data are adjusted **to my style of work** and with a high probability, they will not work in every situation.
Regardless of preferences, it is important here to **match this information to the model itself**, following the guidelines we discussed earlier. Even the list of projects itself contains **names and descriptions**, allowing for easy task matching.

It may turn out that the above descriptions **will not be sufficient**, and it will be necessary to add **general context** containing information about us, which will also help increase matching effectiveness. Example: **Completing the AI_devs course lesson 3** is, from my perspective, a task for the "Act" category, not "Learn". On the other hand, from your perspective, it will be the opposite.

Once again, we are convinced that **context matters**.

## Data interface structure and error handling

In classical applications, there are two main categories of errors: unforeseen (e.g., lack of access to service) and those caused by user actions (e.g., incorrect password). In such a case, the user receives information about possible next steps. This information can be quite general, but even so, the user is able to take further action, including contacting technical support.

In the case of LLM, it is slightly different because, besides the error, we will usually need to also convey context describing possible further steps. Additionally, the reaction to such scenarios must be described in the code.

Below we have a situation where I request changes to a task **that does not exist**. Despite this, the assistant correctly finds itself in this situation and suggests further steps.

On the other hand, there are situations where our assistant does not fully find itself due to limited access to information. The following request to 'move all tasks to project X' was indeed completed correctly, but the message about its execution is incorrect. This results from the fact that **already updated tasks** are in the context, and there is no trace of actions performed on them.

Already at the tool planning stage, we must consider the flow of information between prompts to avoid discrepancies between what happened and what the assistant knows. For comparison, we see that adding simple information about the "ID of the previous project" was enough for the assistant to correctly understand the situation and respond appropriately.

This all leads us to the following observations and conclusions:

- The tool accepts **commands in natural language** and responds in the same way.
- Actions are planned to be able to **reject requests that do not comply with guidelines**.
- Actions **are relatively flexible** and do not rely on specific commands or keywords.
- The most sensitive elements of actions are **programmatically controlled**.
- The tool can operate **independently**. This means it can be used by a person, background automation, or an AI agent.

## Assistant API and proxy access to external services

The `todo` example offers integration with Todoist, but the model **does not communicate directly with its API**, but uses a set of functions defined in `TaskService.ts`. This is something I mentioned earlier, but now we see it in practice.

Even the aforementioned example of "moving projects" and additional context in the form of the "ID of the previous project" shows that usually, we will want to **match API interaction** to the model.

I emphasize this because I have come across examples of integration connecting to the API without additional layers on the application side. It is not only limiting but also poses a challenge from a security perspective.

## Dependencies and relationships between tools

I mentioned at the beginning of the lesson that tools like the `todo` example can work together. Now I will present what I meant through a few examples (we will learn more about these in upcoming lessons).

First and foremost, even screenshots from this lesson show that I connected the `todo` example with an interface in the form of the Alice application. However, various services, applications, and scripts can play the role of such an interface.

First and foremost, using the knowledge from lesson S01E05 — Production, I configured a VPS server, thanks to which the `todo` example is available to me remotely. I can then create an automation scenario on the [make.com](https://www.make.com/) platform and, with literally just a few clicks, build a mechanism that monitors selected labels in Gmail. All emails that receive them will be added to my list, and the LLM will decide how to describe them and to which project to assign them.

Analogous automations can be created for other tools: messengers, RSS feeds, or YouTube videos. This allows for connecting many sources, for which it is enough to send their content. Moreover, **besides the content, we can also send an instruction requesting a DECISION** on whether a given entry should even go on our task list or the learning list.

Connecting to the `todo` example can also be done through the Siri Shortcuts application in the Apple ecosystem. The created macro can record a voice message and then send its content as task content. Depending on needs, we can also connect there with the Whisper model or a model processing a photo we took.

Such integrations do not have to be exclusively in the form of "entry" but also reading. After all, nothing prevents automation from downloading tasks on our list and preparing notes that can help us complete them. For example, we add a task about fixing an error with a specific content, and the task description contains a suggestion of its solution.

## Summary

Looking at the `todo` example, it is quite apparent that it can be an independently functioning application with which communication can be achieved through natural language. Thanks to automatic prompt tests (it would also be advisable to test the code itself), we can introduce changes in logic with relatively great freedom.

In this way, we can 'surround ourselves' with such modules, which ultimately will be able to communicate with each other and perform various tasks for us (or for each other).

And that is exactly what the concept of 'tools for AI agents' is about.

If you want to take away just one thing from this lesson, it will require a little more attention from you. It's about the ability to create independent tools, where refined prompts enable operation with a very low error rate or even with 100% effectiveness.

The tools you create in this way do not need to be particularly developed. It is enough that they are good at doing even one little thing. Little things have the quality that their value adds up quickly.

Good luck!