# AI_devs 3

To repozytorium zawiera przykłady z kursu AI_devs 3.
Więcej informacji znajdziesz na [aidevs.pl](https://aidevs.pl).

## Wymagania

- [Node.js](https://nodejs.org)
- [Bun](https://bun.sh)

## Instalacja

1. Pobierz repozytorium:
   ```bash
   git clone https://github.com/twojnazwauzytkownika/aidevs3-examples.git
   cd aidevs3-examples
   ```

2. Zainstaluj zależności:
   ```bash
   bun install
   ```

3. Uruchom dostępne przykłady z pliku `package.json`, według poniższej instrukcji.

## Dostępne skrypty

Uruchom następujące skrypty za pomocą `bun [skrypt]`:

- `completion`: `bun run completion`
- `chain`: `bun run chain`
- `sdk`: `bun run sdk` (serwer)
- `streaming`: `bun run streaming` (serwer)

Przykład:
```bash
bun run completion
```

## Przykłady działające jako serwer

Niektóre przykłady są dostępne jako serwer HTTP. Po ich uruchomieniu z pomocą:

```bash
bun run [skrypt]
```

Serwer domyślnie uruchamia się na `localhost:3000` a dostępne endpointy można znaleźć w kodzie źródłowym danego przykładu.