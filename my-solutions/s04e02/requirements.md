The task is to create two scripts that strictly follow all of the requirements specified in this file.

<rules>
* Don't add any external dependencies.
* Use native nodejs's fetch API to make HTTP requests if needed.
* Don't run any scripts to test the functionality.
* Don't write any tests.
* Don't add any comments unless critical for the functionality.
</rules>

<technical_details>
`prepare-fine-tuning-data.ts`:
* Under the `data` directory there are two files: `correct.txt` and `incorrect.txt`.
* Map each line of them into the json file with the following structure:
    ```json
    [
        {
            "messages":[
                {"role":"system","content":"Return 0 if user prompt is correct, 1 otherwise."},
                {"role":"user","content":"<LINE_DATA>"},
                {"role":"assistant","content":"<CORRECTNESS>"}
            ]
        },
        ...
    ]
    ```
    WHERE 
    <LINE_DATA> is the line from the file
    <CORRECTNESS> is 0 or 1 - depending on whether the line is from `correct.txt` or `incorrect.txt`. 0 is for incorrect and 1 is for correct.
* The output file should be named `fine-tuning-data.json`.
</technical_details>