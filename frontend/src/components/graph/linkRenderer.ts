/**
 * Canvas rendering function for graph links/edges.
 */

import { getLinkStyle } from '@/utils/graphStyles';
import type { ForceLink } from '@/hooks/useGraphData';
import type { EdgeKind } from '@nodo/contracts';

interface LinkNode {
  x?: number;
  y?: number;
}

export function drawLink(
  link: ForceLink,
  ctx: CanvasRenderingContext2D,
  _globalScale: number,
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

  // Width varies by kind
  const widths: Partial<Record<EdgeKind, number>> = {
    suggested: 2,
    member_of: 1.5,
    has_skill: 0.8,
  };
  const lineWidth = widths[edgeKind] ?? 1;

  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = isTransient ? 0.7 : 0.4;

  if (isTransient || edgeKind === 'suggested') {
    // Animated dashed line
    const dashOffset = (performance.now() / 50) % 20;
    ctx.setLineDash([5, 5]);
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
