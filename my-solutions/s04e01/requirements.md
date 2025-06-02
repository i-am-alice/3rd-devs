The task is to create two scripts that strictly follow all of the requirements specified in this file.

<rules>
* Don't add any external dependencies
* Use OpenApiService from ./OpenAIService.ts to create embeddings or prompt LLM.
* Don't pay attention to `.env` file. It has already been added.
* Don't run any scripts to test the functionality.
* Don't write any tests.
* Don't add any comments unless critical for the functionality.
</rules>

<technical_details>
`app.ts`:
The objective of this script will be to use cloud tool for image alteration to prepare a description of the person that is supposed to be visible on one of the images provided by the API.
* Call `https://centrala.ag3nts.org/report` with the following payload:
    ```json
    {
        "task": "photos",
        "api_key": "7bc70191-381b-4d32-bab4-ae2cdbc6c2bc",
        "answer": "START"
    }
    ```
* Extract all of the filenames from the response using regeq pattern for `.PNG` files
* Then, do in the loop for every image:
    * Prompt OpenApiService to detemine whether the image is clear enough to be used for description or it has too much noise, glitches, is too dark or too bright, etc.
    * If the image is clear enough to be used for description, prompt OpenApiService to generate a description of the person that is visible on the image and end a loop with logging the response.
    * If the image isn't clear enough to tell who is visible on it, programatically call `https://centrala.ag3nts.org/report` with the following payload:
        ```json
        {
            "task": "photos",
            "api_key": "7bc70191-381b-4d32-bab4-ae2cdbc6c2bc",
            "answer": "<COMMAND> <FILENAME>"
        }
        ```
        Where <COMMAND> is `REPAIR`, `DARKEN` or `BRIGHTEN` and <FILENAME> is the name of the file that was processed.
        * Use `REPAIR` if there are visible noise, glitches or other artifacts.
        * Use `DARKEN` if the image is too dark.
        * Use `BRIGHTEN` if the image is too bright.

        In response you will receive a verbose LLM response. Extract the new filename using the previously defined regex pattern and repeat the process.
</technical_details>