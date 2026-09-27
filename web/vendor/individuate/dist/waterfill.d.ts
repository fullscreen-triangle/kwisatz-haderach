/**
 * Water-filling attention allocation (paper §8.2, Def 8.6, Thm 8.10). Under
 * the diminishing-returns axiom (Ax 8.7: every gain profile is concave), the
 * value-maximising split of a finite attention budget across competing
 * scenes is characterised by a single price p*: marginal gain is equalised
 * across every attended scene, and a scene is dropped if its first unit of
 * attention already returns less than p* (KKT stationarity of the
 * Lagrangian, solved here by bisection on the price).
 *
 * Remark 8.11: this is exactly as strong as Ax 8.7 and no stronger — a
 * non-concave (increasing-returns) gain profile breaks the guarantee, and
 * the true optimum there concentrates the whole budget on one scene instead
 * of dividing it. Callers with such a scene should not use this solver
 * (Experiment 9's second case in the paper demonstrates the >40x gap).
 */
export interface Scene {
    id: string;
    /** Concave, nondecreasing gain profile γ(a), γ(0)=0. Caller's responsibility to keep it concave (Ax 8.7). */
    gain: (attention: number) => number;
    /** Derivative γ'(a) — required for the KKT / bisection solve. */
    marginalGain: (attention: number) => number;
    /** Upper bound on attention this scene can usefully absorb (optional; default: unbounded by budget alone). */
    maxAttention?: number;
}
export interface WaterfillResult {
    allocation: Map<string, number>;
    price: number;
    value: number;
}
/**
 * Thm 8.10: solves max Σ γ_i(a_i) s.t. Σ a_i <= budget, a_i >= 0, by
 * bisecting on the shared price p until Σ a_i(p) matches the budget (or the
 * budget is slack because every scene saturates its own maxAttention first).
 */
export declare function waterfill(scenes: readonly Scene[], budget: number, tolerance?: number, maxIterations?: number): WaterfillResult;
/** Convenience constructor for a concave power-law-ish gain profile, γ(a) = scale * sqrt(a), used widely in tests/examples. */
export declare function sqrtGainScene(id: string, scale: number, maxAttention?: number): Scene;
//# sourceMappingURL=waterfill.d.ts.map