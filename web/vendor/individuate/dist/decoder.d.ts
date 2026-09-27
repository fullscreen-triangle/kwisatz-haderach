/**
 * Decoder / Projector (paper §4.2, Def 4.4) and the recognition/search
 * identity (Thm 4.5): Dec(q) = v  <=>  q ∈ Proj(v). Recognition (computing
 * Dec(q) for a query) and search (computing a representative of Proj(v) for
 * a target claim) are inverse readings of one relation — neither is
 * definable without the other, and no third, privileged place ("the
 * answer") exists outside this joint fact (Remark 4.6).
 */
export type Decoder<Q, V> = (query: Q) => V;
/** Builds Proj from Dec over a finite, explicitly enumerated query domain. */
export declare class Projector<Q, V> {
    private readonly fibers;
    constructor(decode: Decoder<Q, V>, domain: Iterable<Q>);
    /** Proj(v) = Dec⁻¹({v}) — every query that decodes to this claim. */
    project(v: V): readonly Q[];
    /** The claims this projector has registered as reachable at all. */
    range(): V[];
}
/**
 * Recovers Dec from a fiber map {Proj(v)}, per the proof of Thm 4.5: a
 * decoder and its fibre map determine each other on a finite domain.
 */
export declare function decoderFromFibers<Q, V>(fibers: Map<V, readonly Q[]>, queryKey: (q: Q) => unknown): Decoder<Q, V>;
//# sourceMappingURL=decoder.d.ts.map