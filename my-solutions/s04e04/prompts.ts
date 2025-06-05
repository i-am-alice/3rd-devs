export const decodeDirectionsPrompt = () => {
    return `Otrzymasz opis lotu, który dokonał pilot drona. Twoim zadaniem jest zdekodowanie, jakie ruchy wykonał pilot drona na podstawie wiadomości użytkownika.\n\n

    Plansza ma wymiary 4x4 a start jest zawsze w lewym górnym rogu (pozycja [0,0]).
    Zawsze pamiętaj o tym, że pilot porusza się w określonej przestrzeni i stąd:
    - NIGDY nie wystąpi sytuacja, w której pilot wychodzi poza granice planszy (4x4)
    - "Na maksa" lub "all the way" w danym kierunku ZAWSZE oznacza ruch do końca planszy, ale nie więcej niż 3 kroki
    - Z lewego górnego rogu (pozycja [0,0]) można wykonać maksymalnie 3 kroki w dół i 3 kroki w prawo
    - Z prawego dolnego rogu (pozycja [3,3]) można wykonać maksymalnie 3 kroki w górę i 3 kroki w lewo
    - W żadnym kierunku nie można wykonać więcej niż 3 kroków z jednej pozycji do krawędzi planszy
    - Jeśli użytkownik wpisze, że lecimy "do końca mapy" to należy wykonać tyle kroków, żeby znaleźć się na krawędzi mapy. A więc, jeśli:
        - jesteśmy w punkcie startowym [0,0] i użytkownik napisze "lecimy w prawo do końca mapy", to interpretujemy jako 3 ruchy w PRAWO
        - jesteśmy w punkcie [3,3] i użytkownik napisze "lecimy w lewo do końca mapy", to interpretujemy jako 3 ruchy w LEWO
        - jesteśmy w punkcie [1,2] i użytkownik napisze "lecimy w dół do końca mapy", to interpretujemy jako 2 ruchy w DÓŁ
        - jesteśmy w punkcie [2,1] i użytkownik napisze "lecimy w górę do końca mapy", to interpretujemy jako 2 ruchy w GÓRA
    - Jeśli użytkownik w trakcie podawania instrukcji zmieni zdanie, weź to pod uwagę. Jeśli napisze "Albo nie, nie idziemy" to usuń dotychczasowe kierunki.
    \n
    
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
        <przykład>
            <opis>
                lecimy jeden raz w dół, później w prawo i na maksa w dół
            </opis>
            <odpowiedź>
                DÓŁ,PRAWO,DÓŁ,DÓŁ
            </odpowiedź>
        </przykład>    
        <przykład>
            <opis>
                lecę na maksa w dół a później na maksa w prawo
            </opis>
            <odpowiedź>
                DÓŁ,DÓŁ,DÓŁ,PRAWO,PRAWO,PRAWO
            </odpowiedź>
        </przykład>
        <przykład>
            <opis>
                trzy pola w dół, a następnie jedno w prawo i wszystko w górę
            </opis>
            <odpowiedź>
                DÓŁ,DÓŁ,DÓŁ,PRAWO,GÓRA,GÓRA,GÓRA
            </odpowiedź>
        </przykład>
        <przykład>
            <opis>
                dwa razy w dół, do końca w prawo i do końca w górę
            </opis>
            <odpowiedź>
                DÓŁ,DÓŁ,PRAWO,PRAWO,PRAWO,GÓRA,GÓRA
            </odpowiedź>
        </przykład>
        <przykład>
            <opis>
                Polecimy na sam dół mapy, a później o dwa pola w prawo.
            </opis>
            <odpowiedź>
                DÓŁ,DÓŁ,DÓŁ,PRAWO,PRAWO
            </odpowiedź>
        </przykład>
    </przykłady>
    
    `
}