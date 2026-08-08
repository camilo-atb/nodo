/**
 * Canvas rendering function for graph links/edges.
 * Professional design with animated dashes for AI suggestions, dim support.
 */

import { getLinkStyle } from '@/utils/graphStyles';
import type { ForceLink } from '@/hooks/useGraphData';
import type { EdgeKind } from '@nodo/contracts';

interface LinkNode {
  x?: number;
  y?: number;
}

/**
 * Draw a single link on the canvas.
 * @param dimmed — when true, renders at very low alpha (for hover-highlight effect)
 */
export function drawLink(
  link: ForceLink,
  ctx: CanvasRenderingContext2D,
  _globalScale: number,
  dimmed?: boolean,
): void {
  const source = link.source as unknown as LinkNode;
  const target = link.target as unknown as LinkNode;

  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;

  const isTransient = link.transient ?? false;
  const edgeKind = link.kind as EdgeKind;
  const style = getLinkStyle(isTransient, edgeKind);

  ctx.save();

  // Dimmed mode for non-connected edges during hover
  if (dimmed) {
    ctx.globalAlpha = 0.06;
  } else {
    ctx.globalAlpha = style.opacity;
  }

  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;

  if (style.dashed) {
    // Animated dash offset for AI suggestion edges
    const dashOffset = (performance.now() / 40) % 22;
    ctx.setLineDash([5, 6]);
    ctx.lineDashOffset = -dashOffset;
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  ctx.restore();
}
