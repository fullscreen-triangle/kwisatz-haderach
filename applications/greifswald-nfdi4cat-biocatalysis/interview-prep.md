# Greifswald / NFDI4Cat Interview Prep
**Role:** Wiss. Mitarbeiter, Biotechnologie & Enzymkatalyse (Job-ID 16133)
**Contact:** Dr. Mark Dörr — Institut für Biochemie, Universität Greifswald
**Prep by studying the 4 repos he sent + mapping your artifacts to them.**

---

## WHO YOU'RE TALKING TO (know this cold)
- **Dr. Mark Dörr** — built **LARAsuite** (the RDM/lab-automation suite whose repo he sent). It's his baby.
- **Core member of the SiLA2 standards team** — wrote the **Python implementation of SiLA2**. This is his professional identity.
- Senior scientist in **Uwe Bornscheuer's group** — one of the world's top enzyme-engineering / directed-evolution labs. Runs a Fanuc-robot high-throughput protein-screening platform.
- So: a chemist-turned-automation-engineer who values **standards, interoperability, and real instruments**. He'll spot buzzword pattern-matching instantly. Good news: you genuinely live in this space.

---

## THE ONE RULE THAT DECIDES THE INTERVIEW
His unspoken question: **"Will this person adopt our standards, or show up with a rival framework?"**
- Every answer signals **adopter, not competitor.**
- Your depth is an asset ONLY when framed as "this is why I'll master your standards fast" — never as "I have a better version."
- Say **"two-tier language system / orchestration layer"** — NEVER "an operating system that replaces the application layer."
- Hard line: **SHIP** (lavoisier, the DSLs+compilers, orchestration arch) vs **DIRECTION** (bloodhound, pylon, Buhera-as-full-OS). Never quote 10^N / machine-precision numbers to experimentalists.

---

## THE FOUR REPOS — DEFINED + YOUR CONTRIBUTION

### 1. LARA / LARAsuite (his own system)
His RDM suite + 2nd-gen electronic lab notebook. Terms:
- **Process vs Procedure** — the "what" vs the "how"; separated so a process runs on different hardware.
- **pythonLab** — device-independent language for lab processes; loops/conditions → closed-loop experiments.
- **Lab Orchestrator / scheduler** — decides step order.
- **SiLA server** — standardized interface a device (instrument, robot, ML algo, or a human) exposes so software commands it uniformly.
- **Triple store / SPARQL / JSON-LD** — auto-generated RDF for every DB entry; the semantic layer.

**Your contribution:**
> "I've independently built the same architecture LARA has: an orchestration layer over domain-specific backends, each addressed in its own small language. kwasa-kwasa is the orchestrator; my modules (mass-spec, search, ML, testing) are the backends — structurally the same as pythonLab orchestrating SiLA servers. I've written the full compiler toolchains, in TypeScript and Rust. I understand pythonLab and the orchestrator/scheduler design from the inside because I've built that class of system."

*(Bonus if he goes deep on scheduling: you have a residue-driven scheduler — ranks work by measured progress, releases a subtask once it's good enough for the parent. LARA's orchestrator problem, formalized.)*

### 2. opensourcelab (Greifswald group; SiLA drivers)
Home of SiLA2 device drivers. Terms:
- **SiLA2** — the standard: common protocol so any software talks to any instrument without per-device code. USB for lab robots.
- **Device driver** — makes a specific instrument speak SiLA.
- **gRPC** — the transport SiLA runs on (typed RPC).

**Your contribution:**
> "SiLA is a device-interface standard — decouple software above from instrument below through one typed interface. That's the discipline of a compiler IR or a good API — my core skill. I haven't written SiLA drivers, but I've built typed interfaces and codegen against protocols repeatedly, and I work daily in Python, gRPC-adjacent tooling, Docker/Kubernetes."

### 3. dcat-ap-plus (THE NFDI4Cat deliverable — probably your day-to-day)
Learn this best. Terms:
- **DCAT-AP** — European standard application profile for describing datasets in catalogs.
- **DCAT-AP+** — their extension: describes *how* a dataset was generated (activity, instrument, agent).
- **PROV-O** — W3C provenance ontology; DCAT-AP+ makes `prov:wasGeneratedBy` **mandatory**.
- **LinkML** — YAML-based modeling language; compiles to RDF, OWL, SHACL, JSON-Schema, Python.
- **SHACL** — validates that RDF conforms to a shape.
- **FAIR** — Findable, Accessible, Interoperable, Reusable.

**Your contribution (THE important one):**
> "dcat-ap-plus is mechanically a *typed source that compiles to multiple targets* — LinkML YAML generating RDF, SHACL validation, a Python datamodel, docs. That schema-to-many-targets pattern is exactly what a compiler does, and building compilers with type systems is my core skill. I'm not coming to this cold — I've built this class of generator toolchain from scratch. I'm fluent in OWL/RDF and ontology design, and I'd be productive on the LinkML pipeline fast because I understand what it's doing underneath. On provenance — `wasGeneratedBy` — I've thought a lot about representing *how* a result was produced, the load-bearing part of DCAT-AP+."

*(RULE: "I'd adopt and extend this," NEVER "I have a better version." It's a community standard — building to it IS the job.)*

### 4. EMMO (foundational ontology)
Top-level ontology for materials/chemistry; domain ontologies build on it. Terms:
- **Ontology** — formal, machine-readable definition of concepts/relations.
- **Top-level / foundational ontology** — shared base everything specific inherits from.
- **OWL / Turtle (.ttl)** — Web Ontology Language + its text form.
- **Reasoner (HermiT, FaCT++)** — infers facts, checks consistency.
- **Mereocausality** — EMMO's philosophical foundation (parts + causation).

**Your contribution + caution:**
> "EMMO is a foundational ontology built on an explicit philosophical foundation. I've done foundational work in that register myself — reasoning about identity, structure, and provenance from first principles — which is exactly why I understand why EMMO is built the way it is, and I'd take to it fast. I'd be aligning catalysis data *to* EMMO, contributing domain extensions, not reinventing a base."

*(CAUTION: engage EMMO as a tool you'd ADOPT, never as a rival to your framework. Your foundational instinct is an asset because it means you'll master EMMO fast — full stop.)*

---

## THE SYNTHESIS SENTENCE (proves you read all four + saw the fit)
> "The four repos are one stack: **SiLA** at the instrument layer, **LARA** orchestrating and auto-generating provenance triples, **DCAT-AP+** standardizing dataset metadata with mandatory provenance, and **EMMO** grounding the vocabulary. I want to work on the semantic-data layer — DCAT-AP+ and its EMMO alignment — and I bring two usually-separate things: I build the DSL/compiler and ontology tooling that layer *is*, and I have real enzyme-kinetics and mass-spectrometry background, so I can keep the data models honest to the chemistry they describe."

---

## YOUR THREE DIFFERENTIATORS (all defensible, zero framework needed)
1. **Compiler/DSL engineering** — you build typed languages with multi-target codegen. That IS what LinkML/DCAT-AP+ is. Rare in a biochem-institute pool.
2. **Real chemistry background** — MS, enzyme kinetics, P450 mechanism (in TEXTBOOK language only). Most informatics candidates can't speak the chemistry; you can.
3. **lavoisier** — a *shipping, NIST-validated mass-spectrometry pipeline*. Your single best "here's running code" artifact, directly in a biocatalysis institute's wheelhouse.

---

## OPENING (when he says "tell me about yourself")
> "I'm a computational scientist and software engineer. Background is bioinformatics — doctoral research in computational lipidomics at TUM, mass-spec-heavy, before the funding ran out and I left the programme. Since then I've worked independently, and what I've built sits right at this role's intersection: I design domain-specific languages and their compilers, I build FAIR-aligned scientific tooling, and I've done a lot of orchestration work — one language coordinating several analysis modules. And because my own background is wet-lab-adjacent — enzyme kinetics, mass spectrometry — I care that the data models actually match the chemistry they describe."

---

## THE PhD QUESTION (handle in ONE sentence, then pivot)
> "The funding ran out, so I left the programme. I kept working on the same problems independently after that — most of what I'd show you today was built in that period."
Then STOP. Silence signals it's a non-issue. Blameless, ordinary. Do not over-explain.

---

## LIKELY HARD QUESTIONS + ANSWERS

**"How does your work relate to FAIR / EMMO / DCAT-AP?"** (THE question)
> "I've done foundational work in this direction myself, and I'm happy to show it — but the point isn't that I have a competitor to EMMO, it's the opposite. Doing that work is exactly why I understand why an upper ontology is built the way it is, and why provenance is load-bearing in DCAT-AP+. I'd be adopting these and contributing to them, already fluent in the kind of reasoning they're made of. My own framework is where my intuitions come from; your standards are what I'd build in."

**"Could you set your framework aside and work in ours?"**
> "Yes — and I'd want to. In a consortium you build to the standard the group chose. I'd implement EMMO and DCAT-AP+ as they are. My framework isn't something I'd smuggle into deliverables — if it's ever useful it's there to test, but the job is the shared infrastructure and I'd treat it that way."

**"What have you actually built that runs?"**
> "Two categories, and I keep them separate. What runs and is validated: lavoisier, a mass-spec pipeline benchmarked against NIST reference libraries, distributed processing, large mzML datasets. And the language toolchains — full lexer/parser/compiler/runtime stacks in TypeScript-to-WASM and Rust. Then there's design/prototype-stage work I'd represent honestly as direction, not finished systems. If I tell you something works, it works."

**"Why this role, not pure CS or a pure research post?"**
> "Two honest reasons. Everything I've built independently orchestrates *analysis* — software over software. I've started extending it toward coordination across nodes and eventually instruments, but in the abstract that has limits. LARA and SiLA are the mature, real-hardware version of that direction — I'd rather ground it in actual instruments. Second, I've worked alone a while; NFDI4Cat is a consortium building shared infrastructure with real users. That's what I want now."

**Deep-dive: "walk me through one thing you built" → pick lavoisier**
> "lavoisier — my mass-spec pipeline. Platform-invariant feature extraction: raw mzML in, reproducible features out, benchmarked against NIST at high accuracy. Built for scale — memory-mapped I/O, distributed processing. It's not a one-off script: structured, documented, reproducible, with its own small DSL for specifying the analysis. That's the discipline I'd bring to catalysis data — tooling validated against a reference and reproducible by someone who isn't me."

---

## YOUR QUESTIONS FOR HIM (ask 2–3)
1. "How much of the Greifswald subproject is DCAT-AP+ / metadata schema work vs. LARA integration and the process side? Where would I actually spend my time?"
2. "How does pythonLab relate to the semantic layer — are lab *processes* themselves represented in RDF and queryable, or only the resulting datasets?"
3. "Where's the current friction between NFDI4Chem and NFDI4Cat on the shared DCAT-AP+ base — what's contested?"
4. "Coming from the informatics side, how do you keep the data models honest to the underlying chemistry? Is domain review built into the process?"

---

## THREE RULES FOR THE ROOM
1. **"Two-tier language system" / "orchestration layer,"** never "operating system."
2. **Never quote a 10^N or machine-precision number.** Lives in papers, not this conversation.
3. **When unsure how deep to go on the framework: stop, let him pull.** Depth-on-demand = rigor. Depth-unprompted = evangelism.

---

## LAST THING
The fear was never about substance. You have typed-language-with-compiler skill next to real enzyme + MS knowledge — a thin intersection in this applicant pool. The only job tomorrow is **sequencing**: lead with the reformulation + running code (lavoisier, the DSL/compiler skill, the orchestration match), keep the framework in the back room, adopt their standards out loud. Go in as an engineer who thinks deeply, not a theorist seeking admission.
