export const decodeDirectionsPrompt = () => {
    return `Otrzymasz opis lotu, który dokonał pilot drona. Twoim zadaniem jest zdekodowanie, jakie ruchy wykonał pilot drona na podstawie wiadomości użytkownika.\n\n
    
    <przykłady>
        <przykład>
            <opis>
                poleciałem jedno pole w prawo
            </opis>
            <odpowiedź>
                PRAWO
            </odpowiedź>
        </przykład>    
        <przykład>
            <opis>
                poleciałem jedno pole w lewo
            </opis>
            <odpowiedź>
                LEWO
            </odpowiedź>
        </przykład>    
        <przykład>
            <opis>
                poleciałem dwa pola w dół i jedno pole w prawo
            </opis>
            <odpowiedź>
                DÓŁ,DÓŁ,PRAWO
            </odpowiedź>
        </przykład>    
        <przykład>
            <opis>
                poleciałem jedno pole w prawo i dwa pola w górę
            </opis>
            <odpowiedź>
                PRAWO,GÓRA,GÓRA
            </odpowiedź>
        </przykład>    
    </przykłady>
    
    `
}