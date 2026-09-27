/**
 * Source adapters (paper Remark 2.2: no boundary between local, remote, and
 * learned — all are computationally uniform contents of the medium prior to
 * individuation). A `SourceAdapter` yields claims as chunks of text with a
 * stable id; the federation layer (federation.ts) unions adapters as one
 * contact graph per Def 8.1.
 */
/** A source built directly from in-memory chunks — useful for tests and for wrapping any existing index. */
export class InMemorySource {
    name;
    chunks;
    constructor(name, chunks) {
        this.name = name;
        this.chunks = chunks;
    }
    async list() {
        return this.chunks;
    }
}
//# sourceMappingURL=sourceAdapter.js.map