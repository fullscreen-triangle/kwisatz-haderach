# Loom-Video — KanzleiPilot / Softwarepiloten

**Empfänger:** Henning Zacher  
**Stelle:** Senior Fullstack AI-FIRST JavaScript Developer  
**Zielzeit:** 7–8 Minuten  
**Tonfall:** Ähms bleiben drin. Pausen bleiben drin. Echt, nicht poliert.

---

## Vor der Aufnahme

- [ ] Loom installiert, eingeloggt
- [ ] VSCode offen: `package.json`, `src/core/purpose/`, `src/core/proof-assistants/`, `src/utils/text-processing.ts`, `tests/utils/text-processing.test.ts`
- [ ] Terminal offen im **Projekt-Root** (nicht in `tests/`)
- [ ] Browser-Tab: github.com/fullscreen-triangle
- [ ] Probelauf erste 30 Sek → dann echter Take

---

## 0:00 – 0:45 | Wer ich bin

→ **WEBCAM**

- Hallo Henning, danke für's Loom
- Zweimal geschaut — auch beschleunigt, wie du empfohlen hast
- Kurz zu mir: PhD TUM, Computational Lipidomics
- Pivot vor drei Jahren: AI-Tooling + Fullstack
- Seitdem: drei VSCode-Extensions in TypeScript
- Plus AutoErrorResolver in zangalewa
- AI im Repair-Loop — nicht nur Vorschlagsgeber

---

## 0:45 – 1:45 | Warum KanzleiPilot

→ **WEBCAM**

- Nicht: generische SaaS-Ebene
- Sondern: echte fachliche Komplexität → klarer digitaler Prozess
- Leistungskatalog, Honorar, Spielregeln, Vertrag
- Hochkonfigurierbar, mehrmandantenfähig, dokumentenlastig
- Aus deinem Loom: AI-First = harte Anforderung, kein Marketing
- Drei-Personen-Dev-Team, Durchsatz muss stimmen
- Code-Qualität nicht verhandelbar — Fehler landen beim Mandanten
- Schnell UND belastbar — genau der Modus seit einem Jahr

---

## 1:45 – 4:30 | Projekt-Walkthrough: kwisatz-haderach

→ **SCREEN SHARE: VSCode, kwisatz-haderach**

- Vier AI-Dev-Tools in den letzten Monaten — kurzer Überblick
- **kwisatz-haderach** — Citation-Intelligence, VSCode-Extension, TypeScript
- **pugachev-cobra** — VSCode-Extension in zangalewa-Stack
- **kwasa-kwasa** — Extensions für semantisches Computing
- **AutoErrorResolver** — wichtigste für AI-First-Requirement

Kurz zum AutoErrorResolver:

- Runtime-Exception abfangen
- An LLM: Diagnose
- Patch generieren
- Git-isoliert anwenden
- Commit oder Rollback
- Multi-LLM (OpenAI, Anthropic), Token-Tracking, Caching, Diff-Viewer

Drüber liegt die metakognitive Schicht:

- Wiederkehrende Workflows automatisch erkennen
- Automation vorschlagen statt aufzwingen
- Expertise-Level des Nutzers tracken
- Produktivitäts-Multiplier für 3-Personen-Team
- AI erkennt was ich wiederhole → fragt ob ich's automatisieren will

---

→ **ÖFFNEN: `package.json`**

- TypeScript 5.1, Jest, ts-jest
- Klassische Extension-Struktur: `src/`, `tsconfig.json`, `jest.config.js`

---

→ **ZEIGEN: `src/`-Tree (Explorer-Sidebar oder `tree src` im Terminal)**

- `core/`, `services/`, `utils/`, `ui/`, `types/`, `storage/`

---

→ **ÖFFNEN: `src/core/purpose/`**

- Purpose Framework: drei Dateien
- `paper-processor.ts`, `knowledge-distillation.ts`, `mini-llm-trainer.ts`
- Paper rein → domänen-spezialisiertes Mini-LLM raus
- Analog zu KanzleiPilot: Steuerberater-Expertise → strukturierte Logik
- Selbes Pattern, andere Domäne

---

→ **ÖFFNEN: `src/core/proof-assistants/`**

- `base-proof-assistant.ts` — Abstraktion
- `coq-client.ts` + `lean4-client.ts` — zwei konkrete Adapter
- Plugin-Architektur: eine Basis, mehrere Implementierungen, austauschbar
- Bei euch: verschiedene Pricing-Engines oder Dokumenten-Backends pro Kanzlei

---

→ **ÖFFNEN: `src/utils/text-processing.ts`**

- `TextProcessor` — Pre-Processing-Pipeline
- Methoden zeigen: `normalizeWhitespace`, `normalizeQuotes`, `extractSentences`, `analyzeText`
- Pure, deterministisch, klar getypt
- Selbe Form wie eure Honorar-Engine: Regel-Engine isoliert von I/O

---

→ **ÖFFNEN: `tests/utils/text-processing.test.ts`**

- 30 Unit-Tests, zehn Gruppen
- Whitespace, Quotes, Sentences, Paragraphs, Stats, Key-Terms, Similarity, Patterns
- Positive Cases + Edge Cases + Empty-Input-Cases

---

→ **TERMINAL — im Projekt-Root: `npm test`**

- Tests aus dem Root, nicht aus `tests/`

→ **Tests laufen, alles grün**

- 30 von 30, unter einer Sekunde

Kurze Anekdote — weil Henning-passend:

- Ursprünglich 4 Tests rot
- Grund: Smart-Quotes als Literal-Glyphen im Regex
- Editor-Save → U+FFFD Replacement-Chars → Quote-Normalisierung war stiller No-Op
- Niemand hatte's gemerkt — bis die Tests es zeigten
- Fix: explizite Unicode-Escapes → grün → kann nie wieder still kaputtgehen
- Genau das, was bei euch verhindert, dass ein Encoding-Fehler in einer Vertragsklausel unbemerkt landet

---

## 4:30 – 5:30 | AI-First Workflow

→ **SCREEN SHARE bleibt oder zurück auf WEBCAM**

Mein Workflow — vier Schritte, bewusst strukturiert:

1. **Dekomposition** — AI nicht zum sofortigen Code, sondern: Edge Cases? Testfälle? Varianten?
2. **Tests zuerst** — oft mit AI für Edge-Case-Generierung
3. **Implementierung** — AI als Pairing-Partner für Drafts + Refactoring
4. **Verifikation** — grüne Tests, TypeScript kompiliert, Review-Checkliste

Bei kritischer Geschäftslogik:

- Finale Entscheidung bleibt bei mir
- AI beschleunigt — AI ersetzt keine Verantwortung
- Genau das, was du mit "Code-Qualität ist sehr wichtig" meinst

---

## 5:30 – 6:15 | Remote / Teamarbeit

→ **WEBCAM**

- Letztes Jahr: fast ausschließlich async
- Was funktioniert: präzise PR-Beschreibungen, kurze Looms statt Meetings
- Was mir fehlt und reizt: direkter Draht
- Neun Personen, drei Developer, wöchentliche Feature-Wünsche
- Enge Zusammenarbeit mit Customer Success
- Feedback-Loop: sehen ob Feature im Alltag wirklich hilft — nicht nur technisch fertig

---

## 6:15 – 7:00 | In drei Jahren

→ **WEBCAM**

- Nicht nur Features bauen
- Technische Produktentscheidungen mitprägen: Architektur, AI-Integration, Test-Strategie
- In kleinem Team ohnehin keine separate Rolle
- Der Ansprechpartner wenn schwierige Architektur-Entscheidung ansteht
- Gleichzeitig Hands-on — Codebase besser kennen als alle anderen

---

## 7:00 – 7:30 | Abschluss

→ **WEBCAM, ruhig**

- React, Node, TypeScript, Testing: zu Hause
- Apollo + GraphQL: punktuell eingesetzt, würde einwachsen
- MongoDB: hauptsächlich Postgres-Erfahrung
- Dein eigenes Zitat: "kriegt man hin, dokumentierte Open-Source-Tools"
- Wenn das passt: freue mich auf das Gespräch
- Danke Henning — Ciao

---

## Notbremse — wenn die Worte fehlen

> „Moment kurz — was ich sagen wollte ist…"

Kein Stress. Henning hat selbst Ähms drin.

---

## Vier Sätze die fallen müssen

1. „Drei VSCode-Extensions in TypeScript gebaut" *(belegt Stack konkret)*
2. „TypeScript- und Node-basierte Werkzeuge, die Sprachmodelle orchestrieren" *(positioniert dich)*
3. „AI beschleunigt — AI ersetzt keine Verantwortung" *(Hennings Sorge)*
4. „Kein 1-zu-1-Match auf den Stack, aber konzeptionell dasselbe Produkt" *(ehrlich zur Lücke)*

## Drei Dinge die NICHT fallen

1. Kein generisches „Ich liebe React" — du hast nicht hauptsächlich React gemacht
2. Keine Selbstzweifel — Henning sucht Selbstvertrauen
3. Kein akademisches Framework (S-Entropy, Membran-Architektur) — falscher Kontext

---

## Nach der Aufnahme

- Loom-Link kopieren
- Auf Nicole Krügers E-Mail antworten
- Kurz: „Hallo Henning, hier mein Loom wie besprochen. Freue mich auf deine Rückmeldung. Viele Grüße, Kundai"
- Cover-Letter separat anhängen

---

*Ein Take. Fertig. Abschicken. Fünf Takes killen die Spontaneität.*
