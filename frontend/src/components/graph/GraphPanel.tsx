/**
 * Main graph visualization container.
 * Uses react-force-graph-2d for 2D force-directed rendering.
 *
 * Features:
 * - Professional node/link rendering with pulsing halos and animated edges
 * - Hover-highlight: dims non-connected nodes/edges
 * - Tooltip overlay (React div, not canvas-drawn)
 * - Click opens node detail modal (not navigation)
 * - Legend panel
 * - Radial gradient background for depth
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { useGraphData } from '@/hooks/useGraphData';
import type { ForceNode, ForceLink } from '@/hooks/useGraphData';
import { drawNode } from './nodeRenderer';
import { drawLink } from './linkRenderer';
import type { GraphFilter } from '@/types/ui';
import type { NodeObject, LinkObject } from 'react-force-graph-2d';
import { useGraphStore } from '@/stores/graphStore';
import { NodeDetailModal } from './NodeDetailModal';

type GraphMethods = ForceGraphMethods<NodeObject<ForceNode>, LinkObject<ForceNode, ForceLink>>;

interface TooltipData {
  node: ForceNode;
  x: number;
  y: number;
}

interface GraphPanelProps {
  filter?: GraphFilter;
  searchQuery?: string;
  onNodeSelect?: (node: ForceNode) => void;
  selectedNodeId?: string | null;
}

export function GraphPanel({ filter: externalFilter, searchQuery, onNodeSelect, selectedNodeId }: GraphPanelProps) {
  const [internalFilter] = useState<GraphFilter>({
    showPersons: true,
    showTeams: true,
    showSkills: true,
  });

  const filter = externalFilter ?? internalFilter;

  const [hoveredNode, setHoveredNode] = useState<ForceNode | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selectedNode, setSelectedNode] = useState<ForceNode | null>(null);

  const data = useGraphData(filter);
  const graphRef = useRef<GraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const edgesMap = useGraphStore((s) => s.edges);
  const nodesMap = useGraphStore((s) => s.nodes);

  // Configure d3 forces for better node spacing
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-500);
    fg.d3Force('collide')?.radius(45);
    fg.d3Force('link')?.distance(100);
  }, [data]);

  // No periodic reheat needed — d3AlphaMin={0} keeps render loop alive

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

  // --- Click handler — show modal ---
  const handleNodeClick = useCallback(
    (node: ForceNode) => {
      setSelectedNode(node);
      onNodeSelect?.(node);
    },
    [onNodeSelect],
  );

  // External selection (from explorer panel)
  useEffect(() => {
    if (selectedNodeId) {
      const node = data.nodes.find((n) => n.id === selectedNodeId);
      if (node) setSelectedNode(node);
    }
  }, [selectedNodeId, data.nodes]);

  // --- Hover handler ---
  const handleNodeHover = useCallback(
    (node: NodeObject<ForceNode> | null) => {
      const forceNode = node as unknown as ForceNode | null;
      setHoveredNode(forceNode);

      if (forceNode && containerRef.current && graphRef.current) {
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

  // Get skills for a person node
  const getNodeSkills = useCallback((nodeId: string): string[] => {
    const skills: string[] = [];
    for (const [, edge] of edgesMap) {
      if (edge.kind === 'has_skill' && edge.from === nodeId) {
        const skillNode = nodesMap.get(edge.to);
        if (skillNode) skills.push(skillNode.label);
      }
    }
    return skills;
  }, [edgesMap, nodesMap]);

  // Get team members
  const getTeamMembers = useCallback((teamId: string): { id: string; label: string }[] => {
    const members: { id: string; label: string }[] = [];
    for (const [, edge] of edgesMap) {
      if (edge.kind === 'member_of' && edge.to === teamId) {
        const memberNode = nodesMap.get(edge.from);
        if (memberNode) members.push({ id: memberNode.id, label: memberNode.label });
      }
    }
    return members;
  }, [edgesMap, nodesMap]);

  // Get team needs (skills)
  const getTeamNeeds = useCallback((teamId: string): string[] => {
    const needs: string[] = [];
    for (const [, edge] of edgesMap) {
      if (edge.kind === 'needs' && edge.from === teamId) {
        const skillNode = nodesMap.get(edge.to);
        if (skillNode) needs.push(skillNode.label);
      }
    }
    return needs;
  }, [edgesMap, nodesMap]);

  // Get person's team
  const getPersonTeam = useCallback((personId: string): { id: string; label: string } | null => {
    for (const [, edge] of edgesMap) {
      if (edge.kind === 'member_of' && edge.from === personId) {
        const teamNode = nodesMap.get(edge.to);
        if (teamNode) return { id: teamNode.id, label: teamNode.label };
      }
    }
    return null;
  }, [edgesMap, nodesMap]);

  // --- Custom render: node ---
  const renderNode = useCallback(
    (nodeObj: NodeObject<ForceNode>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = nodeObj as unknown as ForceNode;
      const dimmed = hoveredNode ? !isNodeConnected(node.id) : false;
      const highlighted = searchQuery
        ? node.label.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
      drawNode(node, ctx, globalScale, dimmed, highlighted);
    },
    [hoveredNode, isNodeConnected, searchQuery],
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
      {/* Tooltip overlay */}
      {tooltip && !selectedNode && <NodeTooltip data={tooltip} />}

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
          const hitRadius = n.kind === 'team' ? 30 : n.kind === 'person' ? 20 : 10;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, hitRadius, 0, 2 * Math.PI);
          ctx.fill();
        }}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={Infinity}
        warmupTicks={200}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
        d3VelocityDecay={0.4}
        d3AlphaDecay={0.02}
        d3AlphaMin={0}
        dagMode={undefined}
      />

      {/* Node Detail Modal */}
      <NodeDetailModal
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        skills={selectedNode ? getNodeSkills(selectedNode.id) : []}
        members={selectedNode?.kind === 'team' ? getTeamMembers(selectedNode.id) : []}
        needs={selectedNode?.kind === 'team' ? getTeamNeeds(selectedNode.id) : []}
        team={selectedNode?.kind === 'person' ? getPersonTeam(selectedNode.id) : null}
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
      className="absolute z-50 pointer-events-none px-3 py-2 rounded-lg border
        border-gray-200 bg-white/95 shadow-lg
        dark:border-[#20262d] dark:bg-[#101317]/95 dark:backdrop-blur-sm dark:shadow-xl"
      style={{
        left: x,
        top: y - 12,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/50">
        {kindLabel}
      </div>
      <div className="text-sm font-medium mt-0.5 text-[#111318] dark:text-white/90">
        {node.label}
      </div>
      {node.status && (
        <div className="text-xs mt-0.5 text-gray-500 dark:text-white/50">{node.status}</div>
      )}
      {actionHint && (
        <div className="text-[10px] text-[#12c7e5] mt-1">{actionHint}</div>
      )}
    </div>
  );
}
