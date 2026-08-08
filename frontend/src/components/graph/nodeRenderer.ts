/**
 * Canvas rendering function for graph nodes.
 * Professional design with pulsing halos, gradients, and glow effects.
 */

import { getNodeVisual } from '@/utils/graphStyles';
import type { ForceNode } from '@/hooks/useGraphData';

/**
 * Draw a single node on the canvas.
 * @param dimmed — when true, renders at very low alpha (for hover-highlight effect)
 */
export function drawNode(
  node: ForceNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  dimmed?: boolean,
): void {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const visual = getNodeVisual(node.kind);
  const time = performance.now();

  ctx.save();

  if (dimmed) {
    ctx.globalAlpha = 0.12;
  }

  // --- Pulsing halo (skip for skill) ---
  if (node.kind !== 'skill') {
    const pulsePhase = Math.sin(time / 1500) * 0.5 + 0.5; // 0..1 slow pulse
    const haloOpacity = 0.08 + pulsePhase * 0.07; // 0.08 to 0.15
    const haloRadius = visual.haloRadius + pulsePhase * 3;

    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, 2 * Math.PI);
    ctx.fillStyle = hexToRgba(visual.haloColor, haloOpacity);
    ctx.fill();
  }

  // --- Glow filter for team/idea/agent ---
  if (visual.glow) {
    ctx.shadowColor = visual.fill;
    ctx.shadowBlur = 12;
  }

  // --- Draw main body ---
  switch (node.kind) {
    case 'person':
      drawPersonNode(ctx, x, y, visual.radius, visual.fill, visual.stroke);
      break;

    case 'team':
      drawGradientCircle(ctx, x, y, visual.radius, '#5eead4', '#118e82');
      break;

    case 'idea':
      drawGradientCircle(ctx, x, y, visual.radius, '#c4b5fd', '#6d4de6');
      break;

    case 'agent':
      drawGradientCircle(ctx, x, y, visual.radius, '#c4b5fd', '#6d4de6');
      // Draw ✦ character inside
      drawAgentSymbol(ctx, x, y, visual.radius);
      break;

    case 'skill':
      ctx.beginPath();
      ctx.arc(x, y, visual.radius, 0, 2 * Math.PI);
      ctx.fillStyle = visual.fill;
      ctx.fill();
      break;
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.restore();

  // --- Draw label ---
  if (dimmed) {
    ctx.save();
    ctx.globalAlpha = 0.12;
  }

  const shouldShowLabel =
    node.kind !== 'skill' || globalScale > 2.5;

  if (shouldShowLabel && globalScale > 0.5) {
    const fontSize = Math.max(11 / globalScale, 3.5);
    ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelY = y + visual.radius + 3;

    // Dark background stroke for contrast
    ctx.strokeStyle = 'rgba(7, 8, 13, 0.95)';
    ctx.lineWidth = 3.5 / globalScale;
    ctx.lineJoin = 'round';
    ctx.strokeText(node.label, x, labelY);

    // Fill with soft white
    ctx.fillStyle = 'rgba(240, 240, 255, 0.92)';
    ctx.fillText(node.label, x, labelY);
  }

  if (dimmed) {
    ctx.restore();
  }
}

/** Person: dark filled circle with colored stroke ring */
function drawPersonNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  stroke: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

/** Team/Idea/Agent: filled circle with radial gradient simulation */
function drawGradientCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colorInner: string,
  colorOuter: string,
): void {
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.3,
    0,
    x,
    y,
    radius,
  );
  gradient.addColorStop(0, colorInner);
  gradient.addColorStop(1, colorOuter);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = gradient;
  ctx.fill();
}

/** Agent: ✦ symbol drawn inside */
function drawAgentSymbol(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  const fontSize = radius * 0.9;
  ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText('✦', x, y + 1);
}

/** Utility: convert hex color to rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
