# 🧪 web-qa-automation-scripts
> **Skrypty automatyzacji testów webowych**  
> Autor: **Szymon Kochanowski** (QA Engineer)  
> Licencja: **MIT** (Copyright © 2026 Szymon Kochanowski)

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](./LICENSE)
[![QA Stacks](https://img.shields.io/badge/Tech_Stack-Python_|_Node.js_|_JavaScript_|_Postman-blueviolet.svg)](#technologie--technologies)
[![Tests Status](https://img.shields.io/badge/Tests-PASSING-success.svg)](#uruchamianie-skryptów-cli--running-cli-scripts)
[![SLA Threshold](https://img.shields.io/badge/SLA_Threshold-%3C_300ms-informational.svg)](#progi-sla-i-kontrakty--sla--contracts)

---

## 🇵🇱 O Projekcie (Opis z portfolio)

> *"Zestaw lekkich skryptów weryfikujących kody odpowiedzi HTTP, integralność danych JSON oraz powtarzalne scenariusze regresyjne w oparciu o 4 technologie: Python, JavaScript, Node.js oraz Postman."*

Projekt **web-qa-automation-scripts** to kompletne, produkcyjne repozytorium inżynierskie QA stworzone do kompleksowej weryfikacji interfejsów API, wykrywania regresji, egzekwowania rygorystycznych progów SLA (czas odpowiedzi < 300ms) oraz badania integralności kontraktów danych JSON i nagłówków bezpieczeństwa (`nosniff`, `frame-options`, `CSP`).

Repozytorium zawiera:
1. **Niezależne, gotowe do użycia skrypty CLI**:
   - `scripts/python/api_regression_verifier.py` (`requests`, `pytest`, `jsonschema`)
   - `scripts/nodejs/http_json_runner.mjs` (natywny Node.js, zero zależności)
   - `scripts/javascript/json_schema_validator.js` (czysty JS do walidacji kontraktów i anomalii typu `"NaN"`)
   - `postman/Web_QA_Regression_Collection.postman_collection.json` (kolekcja Postman v2.1 z asercjami `pm.test`)
2. **Interaktywny Dashboard Testowy (React + Node.js/Express + Tailwind CSS)**:
   - Wbudowane lokalne **Mock API** z symulatorem usterek chaosu (**"Inject Bug"**):
     - Wymuszenie `HTTP 500 Internal Server Error`
     - Zepsucie kontraktu JSON (`price: "NaN"`, brak wymaganych pól, uszkodzone typy)
     - Wstrzyknięcie opóźnienia `Latency > 800ms` (łamiącego SLA < 300ms)
     - Odrzucenie autoryzacji `HTTP 401 Unauthorized`
     - Usunięcie nagłówków bezpieczeństwa
   - Live Runner z natychmiastowym podglądem logów, czasów w `ms` i wizualnym podświetlaniem błędnych pól JSON.
   - Narzędzie **JSON Schema Playground** do testowania dowolnych ładunków.
   - Eksport raportów z testów do formatu **Markdown** i **JSON**.

---

## 🇬🇧 About the Project (Portfolio Summary)

> *"A lightweight suite of scripts verifying HTTP response codes, JSON data integrity, and repeatable regression test scenarios across 4 technologies: Python, JavaScript, Node.js, and Postman."*

**web-qa-automation-scripts** is a comprehensive, production-grade QA engineering repository built to automate API validation, catch regressions, enforce strict SLA response thresholds (<300ms), and inspect JSON contracts and security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Content-Security-Policy`).

---

## 📂 Struktura Repozytorium / Repository Structure

```text
web-qa-automation-scripts/
├── LICENSE                                     # Licencja MIT (Copyright 2026 Szymon Kochanowski)
├── README.md                                   # Dwujęzyczna dokumentacja inżynierska
├── package.json                                # Konfiguracja projektu Node.js / scripts
├── server.ts                                   # Serwer Express + Mock API + Fault Injection
├── vite.config.ts                              # Konfiguracja bundlera Vite
│
├── scripts/                                    # Autorskie skrypty CLI
│   ├── python/
│   │   ├── api_regression_verifier.py          # Pytest / Requests / JSONSchema verifier
│   │   └── requirements.txt                    # Zależności Pythona
│   ├── nodejs/
│   │   └── http_json_runner.mjs                # Lekki, natywny runner Node.js (fetch + assert)
│   └── javascript/
│       └── json_schema_validator.js            # Czysty moduł walidacji schematów i anomalii JSON
│
├── postman/
│   └── Web_QA_Regression_Collection.postman_collection.json # Kolekcja Postman v2.1
│
└── src/                                        # Kod źródłowy Dashboardu React / TS
    ├── App.tsx                                 # Główny widok dashboardu i orkiestrator testów
    ├── types/qa.ts                             # Typy TypeScript dla asercji i raportów
    ├── utils/jsonValidator.ts                  # Moduł walidacji kontraktów JSON
    ├── utils/jsonValidator.test.ts             # Testy jednostkowe (Node:test runner)
    ├── data/scriptSources.ts                   # Źródła skryptów do podglądu i pobierania
    └── components/
        ├── Header.tsx                          # Nagłówek i nawigacja repozytorium
        ├── FaultInjector.tsx                   # Panel wstrzykiwania usterek ("Inject Bug")
        ├── SuiteRunner.tsx                     # Live Runner z podglądem kroków i asercji
        ├── ScriptViewer.tsx                    # Przeglądarka kodu skryptów z opcją pobrania
        ├── SchemaPlayground.tsx                # Narzędzie inspekcji kontraktów JSON
        ├── ApiMockSpec.tsx                     # Dokumentacja Mock API z komendami cURL
        └── ExportReportModal.tsx               # Modal eksportu raportu (Markdown / JSON)
```

---

## 🚀 Szybki Start / Quick Start

### 1. Uruchomienie Dashboardu Webowego / Running the Web Dashboard

```bash
# Instalacja zależności / Install dependencies
npm install

# Uruchomienie aplikacji deweloperskiej na porcie 3000 / Start dev server on port 3000
npm run dev

# Uruchomienie testów jednostkowych / Run unit tests
npm test
```

Aplikacja dostępna pod adresem: `http://localhost:3000`

---

## 🛠️ Uruchamianie Skryptów CLI / Running CLI Scripts

### 1. Python (`requests`, `pytest`, `jsonschema`)

Skrypt weryfikuje statusy HTTP (200, 201, 400, 401, 404, 500), nagłówki bezpieczeństwa, czasy SLA (<300ms) i zgodność ze schematem JSON.

```bash
# Instalacja bibliotek Python
pip install -r scripts/python/requirements.txt

# Uruchomienie jako samodzielne narzędzie CLI
python scripts/python/api_regression_verifier.py --url http://localhost:3000/api/mock --sla 300

# Uruchomienie przez runner Pytest ze szczegółowym raportem
pytest scripts/python/api_regression_verifier.py -v
```

### 2. Node.js (`http_json_runner.mjs`)

Lekki skrypt w natywnym Node.js bez zewnętrznych zależności (korzysta z wbudowanego `fetch` i `node:assert`). Realizuje scenariusz E2E:
`Logowanie -> Pobranie tokenu -> Utworzenie zasobu -> Walidacja kontraktu -> Usunięcie zasobu -> Weryfikacja 404`

```bash
# Uruchomienie skryptu Node.js
node scripts/nodejs/http_json_runner.mjs --url http://localhost:3000/api/mock --sla 300
```
Skrypt generuje plik raportu `regression_report_node.json`.

### 3. JavaScript (`json_schema_validator.js`)

Czysty moduł JavaScript do walidacji kontraktów JSON i wykrywania anomalii (np. string `"NaN"`, brakujące klucze, puste referencje `null`):

```bash
node -e "
const Validator = require('./scripts/javascript/json_schema_validator.js');
const res = Validator.validate({ price: 'NaN' }, { properties: { price: { type: 'number' } } });
console.log(res);
"
```

### 4. Postman & Newman (`newman`)

Kolekcja Postman v2.1 z asercjami `pm.test` i zmiennymi sesyjnymi (`pm.environment.set`).

```bash
# Uruchomienie przez Newman CLI
npx newman run postman/Web_QA_Regression_Collection.postman_collection.json \
  --env-var "baseUrl=http://localhost:3000/api/mock"
```

---

## 🎯 Scenariusze Testowe & Progi SLA / Scenarios & SLA

| # | Nazwa Scenariusza | Endpoint | Metoda | Oczekiwany Status | Wymóg SLA | Walidowane Aspekty |
|---|---|---|---|---|---|---|
| **1** | Health & Security Check | `/api/mock/health` | `GET` | `200 OK` | `< 300ms` | Nagłówek `X-Content-Type-Options: nosniff`, struktura schematu `health` |
| **2** | Auth & Token Retrieval | `/api/mock/auth/login` | `POST` | `200 OK` | `< 300ms` | Ekstrakcja Bearer JWT, poprawność obiektu użytkownika |
| **3** | Catalog Schema Audit | `/api/mock/products` | `GET` | `200 OK` | `< 300ms` | Weryfikacja tablicy `items`, typów `price: number`, enum waluty |
| **4** | Resource Creation | `/api/mock/products` | `POST` | `201 Created` | `< 300ms` | Zwrócenie wygenerowanego `id`, zgodność typu danych |
| **5** | Deep Contract Audit | `/api/mock/products/:id`| `GET` | `200 OK` | `< 300ms` | Wykrywanie anomalii wartości (np. string `"NaN"`), brakujących kluczy |
| **6** | Negative Boundary Check | `/api/mock/products` | `POST` | `400 Bad Request`| `< 300ms` | Odrzucenie niepoprawnego typu ceny (`price: string`) |
| **7** | Teardown & Idempotency | `/api/mock/products/:id`| `DELETE` | `200/204` | `< 300ms` | Usunięcie zasobu; kolejny `GET` zwraca `404 Not Found` |

---

## ⚡ Symulacja Usterek (Chaos QA "Inject Bug")

Dashboard posiada przełączniki symulujące rzeczywiste incydenty produkcyjne:
- **Wymuś HTTP 500**: Zwraca błąd serwera `InternalServerError` i bada reakcję runnera.
- **Zepsucie Kontraktu JSON**: Wstrzykuje anomalie wartości (pole `price: "NaN"` zamiast liczby, usuwa klucz `id`, psuje formaty dat).
- **Opóźnienie Odpowiedzi (>800ms)**: Celowo przekracza próg SLA < 300ms, testując alarmy wydajnościowe.
- **Odrzucenie Autoryzacji (401)**: Blokuje tokeny i bada obsługę błędów autoryzacji.
- **Usunięcie Nagłówków Bezpieczeństwa**: Sprawdza, czy audytor bezpieczeństwa wykryje brak nagłówka `X-Content-Type-Options`.

---

## 📄 Licencja / License

Projekt udostępniany na warunkach licencji **MIT**. Szczegóły w pliku [LICENSE](./LICENSE).  
Copyright (c) 2026 Szymon Kochanowski.
