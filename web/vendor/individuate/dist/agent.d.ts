/**
 * Split-attention agent (paper §8.2, Def 8.6). A bounded agent divides a
 * fixed attention budget across the scenes (sources) currently competing
 * for it, by water-filling (Thm 8.10). Each pipeline stage in a consuming
 * application is one of these, not a stateless function call (Remark 8.9):
 * it carries a conserved self-graph identity across calls.
 */
import { type Scene, type WaterfillResult } from "./waterfill.js";
export declare class SplitAttentionAgent {
    readonly id: string;
    private readonly selfGraph;
    constructor(id: string);
    /** Record an internal distinction this agent draws — grows its self-graph, never resets it. */
    drawDistinction(name: string, weight?: number): void;
    /** Character invariant lower bound: the self-graph's own floor (Thm 8.9 references the underlying identity theorem). */
    characterFloor(): number;
    /** Divide `budget` across the scenes currently competing for this agent's attention (Thm 8.10). */
    allocate(scenes: readonly Scene[], budget: number): WaterfillResult;
}
//# sourceMappingURL=agent.d.ts.map