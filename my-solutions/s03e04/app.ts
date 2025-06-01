import * as dotenv from 'dotenv';
dotenv.config();

import { OpenAiService } from '../lib/OpenAiService';

const peopleInfoUrl = 'https://centrala.ag3nts.org/people';
const placesInfoUrl = 'https://centrala.ag3nts.org/places';

const apiKey = process.env.AIDEVS_API_KEY;

if (!apiKey) {
    throw new Error('AIDEVS_API_KEY not found in .env file');
}

/**
 * Sends a POST request to the given URL with the provided query, using the API key from .env.
 */
export async function postWithQuery(url: string, query: string) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            apikey: apiKey,
            query,
        }),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
}

/**
 * Example: Sends a POST request to peopleInfoUrl with the given name.
 */
export async function queryPerson(name: string) {
    return postWithQuery(peopleInfoUrl, name);
}

/**
 * Example: Sends a POST request to placesInfoUrl with the given city.
 */
export async function queryPlace(city: string) {
    return postWithQuery(placesInfoUrl, city);
}

import * as fs from 'fs/promises';
import * as path from 'path';

// Helper to remove Polish diacritics and normalize to uppercase nominative
function normalizeName(str: string): string {
    // Remove Polish diacritics
    const noDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[ąĄ]/g, 'A').replace(/[ćĆ]/g, 'C').replace(/[ęĘ]/g, 'E')
        .replace(/[łŁ]/g, 'L').replace(/[ńŃ]/g, 'N').replace(/[óÓ]/g, 'O')
        .replace(/[śŚ]/g, 'S').replace(/[źŹżŻ]/g, 'Z');
    return noDiacritics.toUpperCase();
}

const openAiService = new OpenAiService();

// Extract names and cities from note using GPT (logic in this file)
async function extractNamesAndCities(notePath: string) {
    const note = await fs.readFile(notePath, 'utf-8');
    const systemPrompt = `You are an assistant that extracts all unique person names (only first names) and city names from a Polish note. Return the result as a JSON object with two arrays: {\n  \"names\": [list of unique person names in uppercase],\n  \"cities\": [list of unique city names in uppercase]\n}. Only include names and cities that actually appear in the note. Do not invent new ones. Use uppercase for all names and cities. All names should be in nominative form. If none found, return empty arrays.`;
    const question = `Note:\n${note}\n\nExtract all person names and city names.`;
    const result = await openAiService.askGptO4Mini(systemPrompt, question, 256, undefined, 'jpeg', 'json');
    let names: string[] = [], cities: string[] = [];
    if (result && typeof result === 'object') {
        names = Array.isArray((result as any).names) ? (result as any).names : [];
        cities = Array.isArray((result as any).cities) ? (result as any).cities : [];
    }
    return { names: new Set(names), cities: new Set(cities) };
}


// API response types
interface ApiResponse {
    code: number;
    message: string;
}

async function main() {
    const notePath = path.join(__dirname, 'barbara.txt');
    // 1. Wyciągnij imiona, miasta i miasta Barbary z notatki
    const note = await fs.readFile(notePath, 'utf-8');
    // Prompt zgodny z Pythonem
    const systemPrompt = `Z podanego tekstu wyodrębnij trzy listy:\n\nimiona osób,\n\nnazwy miast,\n\nnazwy miast, w których była Barbara.\nZwróć wynik jako listę trzech list w takim formacie: [['IMIE1','IMIE2'],['MIASTO1','MIASTO2'],['MIASTO1']]\nWszystko zapisz DUŻYMI LITERAMI, BEZ POLSKICH ZNAKÓW, w mianowniku, po polsku.\nBez żadnych wyjaśnień – tylko lista.`;
    const question = note;
    let people: string[] = [], cities: string[] = [], barbaraCities: string[] = [];
    try {
        const result = await openAiService.askGptO4Mini(systemPrompt, question, 256, undefined, 'jpeg', 'json');
        if (Array.isArray(result) && result.length === 3) {
            people = Array.isArray(result[0]) ? result[0].map(normalizeName) : [];
            cities = Array.isArray(result[1]) ? result[1].map(normalizeName) : [];
            barbaraCities = Array.isArray(result[2]) ? result[2].map(normalizeName) : [];
        } else {
            throw new Error('Nieprawidłowy format odpowiedzi GPT.');
        }
    } catch (e) {
        console.error('Błąd podczas ekstrakcji z notatki:', e);
        return;
    }
    // 2. Iteracyjnie wzbogacaj listy aż do stabilizacji
    let prevPeople: string[] = [], prevCities: string[] = [];
    let currPeople = [...people], currCities = [...cities];
    let iter = 0;
    while (
        (currPeople.sort().join(',') !== prevPeople.sort().join(',')) ||
        (currCities.sort().join(',') !== prevCities.sort().join(','))
    ) {
        iter++;
        prevPeople = [...currPeople];
        prevCities = [...currCities];
        // Wyciągnij miasta dla osób
        let newCities: string[] = [];
        for (const person of currPeople) {
            try {
                const res = await queryPerson(person) as ApiResponse;
                if (res && res.code === 0 && res.message && res.message !== '[**RESTRICTED DATA**]') {
                    newCities.push(...res.message.split(' ').filter(Boolean).map(normalizeName));
                }
            } catch (e) {
                console.error(`Błąd przy osobie ${person}:`, e);
            }
        }
        // Wyciągnij osoby dla miast
        let newPeople: string[] = [];
        for (const city of currCities) {
            try {
                const res = await queryPlace(city) as ApiResponse;
                if (res && res.code === 0 && res.message && res.message !== '[**RESTRICTED DATA**]') {
                    newPeople.push(...res.message.split(' ').filter(Boolean).map(normalizeName));
                }
            } catch (e) {
                console.error(`Błąd przy mieście ${city}:`, e);
            }
        }
        // Dodaj nowe elementy i usuń duplikaty
        currPeople = Array.from(new Set([...currPeople, ...newPeople]));
        currCities = Array.from(new Set([...currCities, ...newCities]));
        currPeople.sort();
        currCities.sort();
        if (iter > 20) { // zabezpieczenie przed nieskończoną pętlą
            console.error('Za dużo iteracji, przerywam.');
            break;
        }
    }
    console.log('Finalna lista imion:', currPeople);
    console.log('Finalna lista miast:', currCities);
    // 3. Wyklucz miasta, w których była Barbara
    const miastaGdzieNieBylaBarbara = currCities.filter(city => !barbaraCities.includes(city));
    console.log('Miasta gdzie nie była Barbara:', miastaGdzieNieBylaBarbara);
    // 4. Znajdź docelowe miasto
    let doceloweMiasto = '';
    for (const city of miastaGdzieNieBylaBarbara) {
        try {
            const res = await queryPlace(city) as ApiResponse;
            if (res && res.code === 0 && res.message && res.message.split(' ').map(normalizeName).includes('BARBARA')) {
                doceloweMiasto = city;
                break;
            }
        } catch (e) {
            console.error(`Błąd przy sprawdzaniu miasta ${city}:`, e);
        }
    }
    if (doceloweMiasto) {
        console.log('Docelowe miasto:', doceloweMiasto);
        // 5. Wyślij odpowiedź do centrali
        const reportUrl = 'https://c3ntrala.ag3nts.org/report';
        const body = {
            task: 'loop',
            apikey: apiKey,
            answer: doceloweMiasto
        };
        try {
            const res = await fetch(reportUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const json = await res.json();
            console.log('Odpowiedź centrali:', json);
        } catch (e) {
            console.error('Błąd przy wysyłaniu odpowiedzi do centrali:', e);
        }
    } else {
        console.log('Nie znaleziono docelowego miasta.');
    }
}


main();
