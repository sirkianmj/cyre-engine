import type { GpuEmphasis, GpuProjectionMode, GpuRenderOptions, GpuSceneCamera } from '@cyre/engine';

import type { SceneGraph } from '@cyre/engine';

import { projectHosts } from './viewportInteraction';

/**
 * Host label layer.
 *
 * WebGL text needs a glyph atlas, so labels are composited onto a 2D canvas
 * stacked above the 3D surface. This module is shared by both renderers so a
 * label lands in the same place whichever renderer is drawing underneath.
 *
 * Labels are placed from `projectHosts` — the same projection the geometry and
 * the hit testing use — and offset by the host's measured on-screen radius, so
 * a label sits just above the host it names at any zoom and in any mode.
 */
export function drawLabels(
  canvas: HTMLCanvasElement | null,
  scene: SceneGraph | null,
  camera: GpuSceneCamera,
  mode: GpuProjectionMode,
  options: GpuRenderOptions,
  emphasis: GpuEmphasis,
  overrides?: ReadonlyMap<string, readonly [number, number, number]> | null,
): void {
  if (!canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const ratio = (typeof window === 'undefined' ? 1 : window.devicePixelRatio) || 1;
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  if (!options.showLabels || !scene) return;

  const nodes = scene.getNodes();
  if (nodes.length === 0) return;

  const projections = projectHosts(nodes, camera, mode, { width, height }, overrides);
  const selected = new Set(emphasis.selectedIds);

  context.font = '11px -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  nodes.forEach((node, index) => {
    const projection = projections[index];
    if (!projection || !projection.visible) return;
    if (projection.x < -60 || projection.x > width + 60) return;
    if (projection.y < -24 || projection.y > height + 24) return;

    const metadata = (node.metadata ?? {}) as Record<string, unknown>;
    const isSelected = selected.has(node.id);
    const isHovered = emphasis.hoveredId === node.id;

    // Anchored to the measured on-screen radius, so the label clears the host
    // whether the camera is zoomed right in or pulled right out.
    const lift = Math.max(11, projection.radiusPx * 1.15 + 9);

    const label = node.name;
    const measured = context.measureText(label).width;

    context.fillStyle = isSelected
      ? 'rgba(96,168,255,0.22)'
      : isHovered
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(11,13,16,0.62)';
    context.beginPath();
    context.roundRect(
      projection.x - measured / 2 - 5,
      projection.y - lift - 8,
      measured + 10,
      16,
      4,
    );
    context.fill();

    if (isSelected) {
      context.strokeStyle = 'rgba(120,190,255,0.7)';
      context.lineWidth = 1;
      context.stroke();
    }

    context.fillStyle = isSelected ? '#ffffff' : 'rgba(232,234,237,0.92)';
    context.fillText(label, projection.x, projection.y - lift);

    if (metadata.isAttackerPosition === true) {
      context.fillStyle = 'rgba(255,191,77,0.95)';
      context.fillText('attacker', projection.x, projection.y - lift + 14);
    }
  });
}
