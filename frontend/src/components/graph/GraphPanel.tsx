/**
 * Main graph visualization container.
 * Uses react-force-graph-2d for 2D force-directed rendering.
 *
 * Features:
 * - Professional node/link rendering with pulsing halos and animated edges
 * - Hover-highlight: dims non-connected nodes/edges
 * - Tooltip overlay (React div, not canvas-drawn)
 * - Click navigation to team/profile pages
 * - Legend panel
 * - Radial gradient background for depth
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { useNavigate } from 'react-router-dom';
import { useGraphData } from '@/hooks/useGraphData';
import type { ForceNode, ForceLink } from '@/hooks/useGraphData';
import { drawNode } from './nodeRenderer';
import { drawLink } from './linkRenderer';
import { GraphControls } from './GraphControls';
import { useEventStore } from '@/stores/eventStore';
import type { GraphFilter } from '@/types/ui';
import type { NodeObject, LinkObject } from 'react-force-graph-2d';

type GraphMethods = ForceGraphMethods<NodeObject<ForceNode>, LinkObject<ForceNode, ForceLink>>;

interface TooltipData {
  node: ForceNode;
  x: number;
  y: number;
}

export function GraphPanel() {
  const [filter, setFilter] = useState<GraphFilter>({
    showPersons: true,
    showTeams: true,
    showIdeas: true,
    showSkills: true,
  });

  const [hoveredNode, setHoveredNode] = useState<ForceNode | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const data = useGraphData(filter);
  const graphRef = useRef<GraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Configure d3 forces for better node spacing
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    // Stronger repulsion to prevent overlapping
    fg.d3Force('charge')?.strength(-500);
    // Larger collision radius so nodes don't stack
    fg.d3Force('collide')?.radius(45);
    // Longer link distance to spread things out
    fg.d3Force('link')?.distance(100);
  }, [data]);

  // Build adjacency set for hover-highlight
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of data.links) {
      const srcId = typeof link.source === 'string' ? link.source : (link.source as unknown as ForceNode).id;
      const tgtId = typeof link.target === 'string' ? link.target : (link.target as unknown as ForceNode).id;
      if (!map.has(srcId)) map.set(srcId, new Set());
      if (!map.has(tgtId)) map.set(tgtId, new Set());
      map.get(srcId)!.add(tgtId);
      map.get(tgtId)!.add(srcId);
    }
    return map;
  }, [data.links]);

  const isNodeConnected = useCallback(
    (nodeId: string): boolean => {
      if (!hoveredNode) return true;
      if (nodeId === hoveredNode.id) return true;
      return adjacency.get(hoveredNode.id)?.has(nodeId) ?? false;
    },
    [hoveredNode, adjacency],
  );

  const isLinkConnected = useCallback(
    (link: ForceLink): boolean => {
      if (!hoveredNode) return true;
      const srcId = typeof link.source === 'string' ? link.source : (link.source as unknown as ForceNode).id;
      const tgtId = typeof link.target === 'string' ? link.target : (link.target as unknown as ForceNode).id;
      return srcId === hoveredNode.id || tgtId === hoveredNode.id;
    },
    [hoveredNode],
  );

  // --- Click handler with navigation ---
  const handleNodeClick = useCallback(
    (node: ForceNode) => {
      const eventId = useEventStore.getState().currentEventId;
      if (!eventId) {
        console.log('No event selected, node clicked:', node.id, node.kind);
        return;
      }

      switch (node.kind) {
        case 'team':
          navigate(`/event/${eventId}/team/${node.id}`);
          break;
        case 'person':
          navigate(`/event/${eventId}/profile/${node.id}`);
          break;
        case 'idea':
          // Show info — no dedicated page yet. The tooltip on hover gives context.
          // For now, keep the node highlighted (hover state persists on click)
          setHoveredNode(node);
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  // --- Hover handler ---
  const handleNodeHover = useCallback(
    (node: NodeObject<ForceNode> | null) => {
      const forceNode = node as unknown as ForceNode | null;
      setHoveredNode(forceNode);

      if (forceNode && containerRef.current && graphRef.current) {
        // Convert graph coords to screen coords
        const screenCoords = graphRef.current.graph2ScreenCoords(
          forceNode.x ?? 0,
          forceNode.y ?? 0,
        );
        setTooltip({
          node: forceNode,
          x: screenCoords.x,
          y: screenCoords.y,
        });
      } else {
        setTooltip(null);
      }
    },
    [],
  );

  // --- Custom render: node ---
  const renderNode = useCallback(
    (nodeObj: NodeObject<ForceNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = nodeObj as unknown as ForceNode;
      const dimmed = hoveredNode ? !isNodeConnected(node.id) : false;
      drawNode(node, ctx, globalScale, dimmed);
    },
    [hoveredNode, isNodeConnected],
  );

  // --- Custom render: link ---
  const renderLink = useCallback(
    (linkObj: LinkObject<ForceNode, ForceLink>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const link = linkObj as unknown as ForceLink;
      const dimmed = hoveredNode ? !isLinkConnected(link) : false;
      drawLink(link, ctx, globalScale, dimmed);
    },
    [hoveredNode, isLinkConnected],
  );

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Radial gradient background for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(99,102,241,0.05), transparent 36%)',
        }}
      />

      {/* Filter controls */}
      <GraphControls filter={filter} onFilterChange={setFilter} />

      {/* Legend */}
      <GraphLegend />

      {/* Tooltip overlay */}
      {tooltip && <NodeTooltip data={tooltip} />}

      {/* Force graph */}
      <ForceGraph2D
        ref={graphRef as React.MutableRefObject<GraphMethods | undefined>}
        graphData={data}
        nodeCanvasObject={renderNode}
        linkCanvasObject={renderLink}
        onNodeClick={(node) => handleNodeClick(node as unknown as ForceNode)}
        onNodeHover={handleNodeHover}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as unknown as ForceNode;
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          // Paint a larger invisible circle for hover/click detection
          const hitRadius = n.kind === 'team' ? 30 : n.kind === 'idea' ? 25 : n.kind === 'agent' ? 25 : n.kind === 'person' ? 20 : 10;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, hitRadius, 0, 2 * Math.PI);
          ctx.fill();
        }}
        backgroundColor="#07080d"
        cooldownTicks={300}
        warmupTicks={200}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
        d3VelocityDecay={0.3}
        d3AlphaDecay={0.01}
        dagMode={undefined}
      />
    </div>
  );
}

// ─── Tooltip Component ───────────────────────────────────────────────────────

function NodeTooltip({ data }: { data: TooltipData }) {
  const { node, x, y } = data;

  const kindLabel = node.kind.toUpperCase();
  const actionHint = node.kind === 'team'
    ? 'Click to view team'
    : node.kind === 'person'
      ? 'Click to view profile'
      : null;

  return (
    <div
      className="absolute z-50 pointer-events-none px-3 py-2 rounded-lg border border-border bg-panel/95 backdrop-blur-sm shadow-xl"
      style={{
        left: x,
        top: y - 12,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
        {kindLabel}
      </div>
      <div className="text-sm font-medium text-white/90 mt-0.5">
        {node.label}
      </div>
      {node.status && (
        <div className="text-xs text-white/50 mt-0.5">{node.status}</div>
      )}
      {actionHint && (
        <div className="text-[10px] text-cyan-400/80 mt-1">{actionHint}</div>
      )}
    </div>
  );
}

// ─── Legend Component ─────────────────────────────────────────────────────────

function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 px-3 py-2 rounded-lg bg-panel/80 backdrop-blur-sm border border-border/50 text-[9px] leading-relaxed max-w-[140px]">
      <div className="flex flex-col gap-1">
        {/* Node types */}
        <LegendItem>
          <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: '#6d7aa3', backgroundColor: '#171c2a' }} />
          <span className="text-white/60">Person</span>
        </LegendItem>
        <LegendItem>
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#2dd4bf' }} />
          <span className="text-white/60">Team</span>
        </LegendItem>
        <LegendItem>
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
          <span className="text-white/60">Idea</span>
        </LegendItem>
        <LegendItem>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#64748b' }} />
          <span className="text-white/60">Skill</span>
        </LegendItem>
        <LegendItem>
          <span className="inline-block w-3 h-3 rounded-full items-center justify-center text-[8px]" style={{ backgroundColor: '#a78bfa', color: '#fff' }}>✦</span>
          <span className="text-white/60">AI Agent</span>
        </LegendItem>

        {/* Separator */}
        <div className="border-t border-white/10 my-1" />

        {/* Edge types */}
        <LegendItem>
          <span className="inline-block w-5 h-px" style={{ backgroundColor: '#4f5a85' }} />
          <span className="text-white/60">Connection</span>
        </LegendItem>
        <LegendItem>
          <span className="inline-block w-5 h-0 border-t border-dashed" style={{ borderColor: '#06b6d4' }} />
          <span className="text-cyan-400/80">AI Match</span>
        </LegendItem>
      </div>
    </div>
  );
}

function LegendItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
    </div>
  );
}
