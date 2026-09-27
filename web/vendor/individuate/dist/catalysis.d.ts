/**
 * Catalytic composition and coherence (paper §6, Def 6.1–6.3, Thm 6.2, 6.4).
 *
 * A catalyst is any independently-sourced retrieval/reasoning step that
 * shifts alignment toward a target claim. Composing catalysts follows a
 * multiplicative law (Thm 6.2): repeating one source saturates strictly
 * below 1 and slower than diversifying (Cor 6.3) — this is *forced* by the
 * law, not a tuning heuristic.
 *
 * Coherence (Thm 6.4): a linear chain or a 2-cycle of mutual support is
 * never robust to removing one member. Only a strongly-connected triangle
 * (>=3 catalysts, each supported by the other two at θ>1/2) survives the
 * loss of any single member. This is enforced structurally below: a claim
 * can only be marked "grounded" once a real triangle exists.
 */
export interface Catalyst {
    id: string;
    /** Independent evidentiary channel this catalyst draws from — a file, a model, a record store. */
    source: string;
    /** power ∈ [0,1]: fraction of the above-floor alignment gap this catalyst closes (Def 6.1). */
    power: number;
}
/** Thm 6.2: composite power of catalysts applied in sequence, 1 - Π(1 - power_i). */
export declare function compositePower(catalysts: readonly Catalyst[]): number;
export interface SupportEdge {
    from: string;
    to: string;
    /** Degree to which `from`'s result reinforces `to`'s alignment shift, in (0,1]. */
    degree: number;
}
export type GroundingStatus = "single-sourced" | "two-sourced" | "grounded";
export interface GroundingResult {
    status: GroundingStatus;
    /** The catalysts backing the claim (all of them, regardless of status). */
    catalysts: readonly Catalyst[];
    /** Support edges at or above threshold θ. */
    activeSupport: SupportEdge[];
    /** True only for status "grounded": a strongly-connected triangle survives single-member removal (Thm 6.4(iii)). */
    robustToSingleRemoval: boolean;
}
/**
 * Thm 6.4: never silently promote a claim to "grounded" on fewer than three
 * independently sourced, mutually supporting catalysts. Mirrors Remark 6.5 —
 * one passage is never a grounded answer, and neither are two.
 */
export declare function assessGrounding(catalysts: readonly Catalyst[], support: readonly SupportEdge[], theta?: number): GroundingResult;
//# sourceMappingURL=catalysis.d.ts.map