/**
 * Main graph visualization container.
 * Uses react-force-graph-2d for 2D force-directed rendering.
 */

import { useCallback, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { useGraphData } from '@/hooks/useGraphData';
import type { ForceNode, ForceLink } from '@/hooks/useGraphData';
import { drawNode } from './nodeRenderer';
import { drawLink } from './linkRenderer';
import { GraphControls } from './GraphControls';
import type { GraphFilter } from '@/types/ui';
import type { NodeObject, LinkObject } from 'react-force-graph-2d';

type GraphMethods = ForceGraphMethods<NodeObject<ForceNode>, LinkObject<ForceNode, ForceLink>>;

export function GraphPanel() {
  const [filter, setFilter] = useState<GraphFilter>({
    showPersons: true,
    showTeams: true,
    showIdeas: true,
    showSkills: true,
  });

  const data = useGraphData(filter);
  const graphRef = useRef<GraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNodeClick = useCallback((node: ForceNode) => {
    // TODO: navigate to node detail
    console.log('Node clicked:', node.id, node.kind, node.label);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <GraphControls filter={filter} onFilterChange={setFilter} />
      <ForceGraph2D
        ref={graphRef as React.MutableRefObject<GraphMethods | undefined>}
        graphData={data}
        nodeCanvasObject={(node, ctx, globalScale) =>
          drawNode(node as unknown as ForceNode, ctx, globalScale)
        }
        linkCanvasObject={(link, ctx, globalScale) =>
          drawLink(link as Parameters<typeof drawLink>[0], ctx, globalScale)
        }
        onNodeClick={(node) => handleNodeClick(node as unknown as ForceNode)}
        backgroundColor="#07080d"
        cooldownTicks={100}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
      />
    </div>
  );
}
