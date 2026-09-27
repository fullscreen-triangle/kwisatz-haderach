import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// A live d3-force graph of one agent run: command → subtasks → agents → sources → answer.
//
// One simulation lives for the component's lifetime. Each new `graph` prop is MERGED into
// it — existing nodes keep their positions and velocities, new ones enter next to the
// node they hang off — then the simulation is gently reheated. So the graph grows as the
// run proceeds instead of re-exploding on every update. Drag pins a node while held;
// wheel/pinch zooms; clicking a node calls onNodeClick(node).

export const KIND_COLOR = {
  command: '#E6EBF2', subtask: '#3FD0C9', agent: '#A78BFA', result: '#5CC98A',
  mail: '#60A5FA', attachment: '#93C5FD', note: '#FBBF24', plan: '#F59E0B', planitem: '#F59E0B',
  repo: '#FB923C', laptop: '#F472B6', source: '#94A3B8',
};
const STATUS_RING = { running: '#E0A93E', failed: '#EF6B6B', pending: '#4B5563', done: null };
const RADIUS = { command: 13, result: 12, subtask: 9, agent: 7 };
const LINK_DIST = { decomposes: 70, needs: 55, performs: 34, cites: 60, produces: 80 };

export default function ForceGraph({ graph, onNodeClick, height = 380 }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const stateRef = useRef({ nodes: new Map(), width: 600 });
  const clickRef = useRef(onNodeClick);
  clickRef.current = onNodeClick;

  // Build the scene and the simulation once.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 600;
    stateRef.current.width = width;
    svg.attr('viewBox', [0, 0, width, height]);
    const root = svg.append('g');
    root.append('g').attr('class', 'links');
    root.append('g').attr('class', 'nodes');
    svg.call(d3.zoom().scaleExtent([0.3, 4]).on('zoom', e => root.attr('transform', e.transform)));

    const sim = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(l => LINK_DIST[l.kind] || 60).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.06))
      .force('collide', d3.forceCollide(d => (RADIUS[d.kind] || 6) + 6))
      .on('tick', () => {
        root.select('.links').selectAll('line')
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        root.select('.nodes').selectAll('g.node').attr('transform', d => `translate(${d.x},${d.y})`);
      });
    simRef.current = sim;
    return () => { sim.stop(); svg.selectAll('*').remove(); };
  }, [height]);

  // Merge each new graph into the running simulation.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim || !graph) return;
    const { nodes: known, width } = stateRef.current;
    const incoming = graph.nodes || [];
    const parentOf = {};
    for (const l of graph.links || []) parentOf[l.target] = parentOf[l.target] || l.source;

    const nodes = incoming.map(n => {
      const prev = known.get(n.id);
      if (prev) return Object.assign(prev, n);           // keep x/y/vx/vy
      const parent = known.get(parentOf[n.id]);
      const seed = parent ? { x: parent.x + (Math.random() - 0.5) * 30, y: parent.y + (Math.random() - 0.5) * 30 }
        : { x: width / 2 + (Math.random() - 0.5) * 40, y: height / 2 + (Math.random() - 0.5) * 40 };
      const fresh = { ...n, ...seed };
      known.set(n.id, fresh);
      return fresh;
    });
    const ids = new Set(nodes.map(n => n.id));
    for (const id of [...known.keys()]) if (!ids.has(id)) known.delete(id);
    const links = (graph.links || []).filter(l => ids.has(l.source) && ids.has(l.target))
      .map(l => ({ ...l }));

    const svg = d3.select(svgRef.current);
    svg.select('.links').selectAll('line')
      .data(links, d => `${d.source.id ?? d.source}>${d.target.id ?? d.target}`)  // forceLink swaps ids for nodes
      .join('line')
      .attr('stroke', d => (d.kind === 'cites' ? '#334155' : d.kind === 'needs' ? '#3FD0C9' : '#475569'))
      .attr('stroke-width', d => (d.kind === 'needs' ? 1.6 : 1))
      .attr('stroke-dasharray', d => (d.kind === 'cites' ? '3 3' : null));

    const node = svg.select('.nodes').selectAll('g.node')
      .data(nodes, d => d.id)
      .join(enter => {
        const g = enter.append('g').attr('class', 'node').style('cursor', 'pointer');
        g.append('circle');
        g.append('text').attr('dy', '0.32em').attr('x', 12)
          .style('font', '11px -apple-system, "Segoe UI", sans-serif').style('pointer-events', 'none');
        g.on('click', (e, d) => { e.stopPropagation(); clickRef.current?.(d); });
        g.call(d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
        return g;
      });
    node.select('circle')
      .attr('r', d => RADIUS[d.kind] || 6)
      .attr('fill', d => KIND_COLOR[d.kind] || KIND_COLOR.source)
      .attr('stroke', d => STATUS_RING[d.status] || '#0B0E13')
      .attr('stroke-width', d => (STATUS_RING[d.status] ? 3 : 1.5));
    node.select('text')
      .text(d => (d.cite ? `[${d.cite}] ` : '') + (d.label || d.id).slice(0, 38))
      .attr('fill', d => (d.kind === 'command' ? '#E6EBF2' : '#B4BECC'));

    sim.nodes(nodes);
    sim.force('link').links(links);
    sim.alpha(Math.max(sim.alpha(), 0.35)).restart();
  }, [graph, height]);

  return (
    <svg ref={svgRef} style={{ width: '100%', height, display: 'block', background: '#0E1219', borderRadius: 10 }} />
  );
}
