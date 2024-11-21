import {JSDOM} from 'jsdom'
//import { OpenAIService } from './OpenAIService';
import type { ChatCompletionMessageParam, ChatCompletionChunk } from "openai/resources/chat/completions";
import OpenAI from "openai";
import { string } from 'zod';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY});
const fs = require('node:fs');
//const openaiService = new OpenAIService();
async function connectToServer(username = "tester", password = "574e112a") {
    try {
        // Step 1: Initial connection
        let response = await fetch('http://xyz.ag3nts.org', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Get the response data
        const data = await response.text();
        //console.log('Initial response:', data);
        const question= parseQuestion(data)
        console.log(question)
        //let answer = getAnswerToQuestion(question);
    } catch (error) {
        console.error('Connection error:', error);
    }

}

async function loginToServer(username: string, password: string, answer: string) {
    try {
        let formdata = new FormData()
        formdata.append("username", 'tester')
        formdata.append("password", '574e112a')
        formdata.append("answer", answer)
        console.log(formdata)

        const response2 = await fetch('https://xyz.ag3nts.org/', {
            method: 'POST',
            headers: {
            },
            body: formdata
            //body: "username=tester&password=574e112a&answer=" + answer 
        }
    );
        const data2 = await response2.text();
        console.log(data2)
        //console.log(response2)
        const dom = new JSDOM(data2);
        const document = dom.window.document;

        fs.writeFile('C:\\Users\\mwitke\\selfdevelop\\response.html',data2, {flag: 'w'}, (err: NodeJS.ErrnoException | null) => {
        if (err) {
            console.error(err);
        } else {
            // file written successfully
        }
        });
        
    }
    catch (error) {
        console.error('Connection error:', error);
    }
}

function parseQuestion(html: string) {
    // Step 2: Parse the HTML to extract the question using jsdom
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const questionElement = document.getElementById("human-question");
    //console.log(questionElement)
    let question = questionElement ? questionElement.textContent : '';
    return question;
}

async function getAnswerToQuestion(question: string) {
    try {
        // Step 3: Use OpenAI API tm get the answer to the question
        const question = " tell me  about most popular technics and methods used for prompting llm and give me 8"
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {role: "system",  content: "<thoughts>You are a tutor specializing in LLM prompting. Explain each concept and idea in a detailed,\
                     step-by-step manner, using examples to clarify and illustrate your points."},
                {role: "user", content: question}
            ],
            max_tokens: 2000,
        });

        let answer = await response.choices[0].message.content;
        const ans = await answer;
        console.log(await ans);
        //loginToServer("tester", "574e112a", Number(answer));
        return answer;
    } catch (error) {
        console.error('Error:', error);
        return 'default answer';
    }
}
getAnswerToQuestion("");
// Call the function
//connectToServer();