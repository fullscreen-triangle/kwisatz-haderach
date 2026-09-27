/**
 * Reference SourceAdapter: local filesystem, plain text + optional PDF.
 * Chunks by paragraph (blank-line-delimited) with a minimum size, so a
 * claim is a genuine passage rather than a single sentence fragment or an
 * entire document (both of which would blur what "the passage" individuates).
 */
import type { SourceAdapter, SourceChunk } from "../sourceAdapter.js";
export interface LocalFileSourceOptions {
    root: string;
    /** File extensions to include, e.g. [".md", ".txt", ".pdf"]. Default: text + pdf. */
    extensions?: string[];
    /** Minimum characters for a chunk to be kept as a claim (avoids noise fragments). */
    minChunkChars?: number;
    /** Maximum characters per chunk before it's split further. */
    maxChunkChars?: number;
}
export declare class LocalFileSource implements SourceAdapter {
    readonly name = "local-file";
    private readonly opts;
    constructor(options: LocalFileSourceOptions);
    list(): Promise<SourceChunk[]>;
    private walk;
    private readAsText;
    private readPdf;
    private chunkParagraphs;
}
//# sourceMappingURL=localFile.d.ts.map