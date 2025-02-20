import { assertExists } from '@blocksuite/global/utils';
import { getBrushBoundFromPoints } from '@blocksuite/phasor';

import type {
  BrushMouseMode,
  SelectionEvent,
} from '../../../__internal__/index.js';
import { noop } from '../../../__internal__/index.js';
import { DEFAULT_SELECTED_COLOR } from '../components/color-panel.js';
import { MouseModeController } from './index.js';

export class BrushModeController extends MouseModeController<BrushMouseMode> {
  readonly mouseMode = <BrushMouseMode>{
    type: 'brush',
    color: DEFAULT_SELECTED_COLOR,
    lineWidth: 4,
  };

  private _draggingElementId: string | null = null;

  protected _draggingTopLeftPoint: [number, number] | null = null;
  protected _draggingPathPoints: number[][] | null = null;

  onContainerClick(e: SelectionEvent): void {
    noop();
  }

  onContainerContextMenu(e: SelectionEvent): void {
    noop();
  }

  onContainerDblClick(e: SelectionEvent): void {
    noop();
  }

  onContainerTripleClick(e: SelectionEvent) {
    noop();
  }

  onContainerDragStart(e: SelectionEvent) {
    if (!this._page.awarenessStore.getFlag('enable_surface')) return;

    this._page.captureSync();
    const { viewport } = this._edgeless.surface;

    // create a shape block when drag start
    const [modelX, modelY] = viewport.toModelCoord(e.x, e.y);
    const { color, lineWidth } = this.mouseMode;
    const points = [[0, 0]];

    const id = this._surface.addBrushElement(
      {
        x: modelX,
        y: modelY,
        w: lineWidth,
        h: lineWidth,
      },
      points,
      {
        color,
        lineWidth,
      }
    );

    this._draggingElementId = id;
    this._draggingPathPoints = points;
    this._draggingTopLeftPoint = [modelX, modelY];

    this._edgeless.slots.surfaceUpdated.emit();
  }

  onContainerDragMove(e: SelectionEvent) {
    if (!this._page.awarenessStore.getFlag('enable_surface')) return;
    if (!this._draggingElementId) return;

    assertExists(this._draggingElementId);
    assertExists(this._draggingPathPoints);
    assertExists(this._draggingTopLeftPoint);

    const { lineWidth } = this.mouseMode;

    const [topLeftX, topLeftY] = this._draggingTopLeftPoint;
    const [modelX, modelY] = this._edgeless.surface.toModelCoord(e.x, e.y);

    const points = [
      ...this._draggingPathPoints,
      [modelX - topLeftX, modelY - topLeftY],
    ];

    const newBound = getBrushBoundFromPoints(points, lineWidth);

    const newTopLeft = [
      Math.min(topLeftX, modelX),
      Math.min(topLeftY, modelY),
    ] as [number, number];

    const deltaX = newTopLeft[0] - topLeftX;
    const deltaY = newTopLeft[1] - topLeftY;
    this._draggingTopLeftPoint = newTopLeft;
    this._draggingPathPoints = points.map(([x, y]) => [x - deltaX, y - deltaY]);

    this._surface.updateBrushElementPoints(
      this._draggingElementId,
      {
        // During rendering in the brush-element, it actively offsets by half of the stroke width
        // to ensure that the rectangular area formed by the brush remains consistent.
        x: this._draggingTopLeftPoint[0] - lineWidth / 2,
        y: this._draggingTopLeftPoint[1] - lineWidth / 2,
        w: newBound.w,
        h: newBound.h,
      },
      this._draggingPathPoints
    );

    this._edgeless.slots.surfaceUpdated.emit();
  }

  onContainerDragEnd(e: SelectionEvent) {
    this._draggingElementId = null;
    this._draggingPathPoints = null;
    this._draggingTopLeftPoint = null;
    this._page.captureSync();
    this._edgeless.slots.surfaceUpdated.emit();
  }

  onContainerMouseMove(e: SelectionEvent) {
    noop();
  }

  onContainerMouseOut(e: SelectionEvent) {
    noop();
  }

  clearSelection() {
    noop();
  }
}
