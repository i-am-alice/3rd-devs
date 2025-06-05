export const answerPrompt = 'Jesteś pomocnym asystentem. Odpowiedz na pytanie użytkownika, korzystając z dostarczonej treści strony internetowej. Jeśli odpowiedź nie jest dostępna, odpowiedz TYLKO "NO_ANSWER".';

export const answerPromptTemplate = (prompt: string, content: string) => `Pytanie: ${prompt}\n\nTreść strony internetowej:\n${content}`;

export const linkLabelPrompt = 'Jesteś pomocnym asystentem. Mając pytanie użytkownika i etykietę linku, odpowiedz TYLKO TAK lub NIE. Czy etykieta sugeruje, że po kliknięciu linku znajdziesz informacje, które mogą odpowiedzieć na pytanie?';

export const linkLabelPromptTemplate = (prompt: string, label: string) => `Pytanie: ${prompt}\n\nEtykieta: ${label}`;
