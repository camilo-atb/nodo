/**
 * Canvas rendering function for graph nodes.
 */

import { getNodeColor, getNodeSize } from '@/utils/graphStyles';
import type { ForceNode } from '@/hooks/useGraphData';

export function drawNode(
  node: ForceNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const size = getNodeSize(node.kind);
  const color = getNodeColor(node.kind);

  ctx.save();

  // Glow effect for team and agent nodes
  if (node.kind === 'team' || node.kind === 'agent') {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }

  ctx.fillStyle = color;
  ctx.beginPath();

  switch (node.kind) {
    case 'person':
      // Filled circle
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 'team':
      // Rounded square
      drawRoundedRect(ctx, x - size, y - size, size * 2, size * 2, 2);
      ctx.fill();
      break;

    case 'idea':
      // Diamond
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      break;

    case 'skill':
      // Small dot
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
      break;

    case 'agent':
      // Star shape
      drawStar(ctx, x, y, 5, size, size * 0.5);
      ctx.fill();
      break;
  }

  ctx.restore();

  // Draw label (skip for skill nodes and when zoomed out)
  if (node.kind !== 'skill' && globalScale > 0.7) {
    const fontSize = Math.max(10 / globalScale, 3);
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Dark stroke for readability
    ctx.strokeStyle = 'rgba(7, 8, 13, 0.9)';
    ctx.lineWidth = 3 / globalScale;
    ctx.strokeText(node.label, x, y + size + 2);

    // White fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(node.label, x, y + size + 2);
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      cx + Math.cos(rot) * outerRadius,
      cy + Math.sin(rot) * outerRadius,
    );
    rot += step;
    ctx.lineTo(
      cx + Math.cos(rot) * innerRadius,
      cy + Math.sin(rot) * innerRadius,
    );
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}
