import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { PanelIconButton } from "../components/ui";
import { useI18n } from "../i18n/useI18n";
import type { Bounds, DiagramNode, Point, Viewport } from "../types/diagram";
import { getSelectionBounds } from "../utils/geometry";

interface CanvasMinimapProps {
  canvasRef: RefObject<HTMLDivElement>;
  nodes: DiagramNode[];
  viewport: Viewport;
  visible: boolean;
  onViewportChange: (viewport: Viewport) => void;
  onVisibleChange: (visible: boolean) => void;
}

interface CanvasSize {
  width: number;
  height: number;
}

const MINIMAP_WORLD_PADDING_RATIO = 0.08;
const MINIMAP_WORLD_PADDING_MIN = 80;
const MINIMAP_KEYBOARD_PAN_RATIO = 0.12;

function unionBounds(first: Bounds, second: Bounds): Bounds {
  const left = Math.min(first.x, second.x);
  const top = Math.min(first.y, second.y);
  const right = Math.max(first.x + first.width, second.x + second.width);
  const bottom = Math.max(first.y + first.height, second.y + second.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function expandBounds(bounds: Bounds): Bounds {
  const padding = Math.max(MINIMAP_WORLD_PADDING_MIN, Math.max(bounds.width, bounds.height) * MINIMAP_WORLD_PADDING_RATIO);
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function viewportWorldBounds(viewport: Viewport, canvasSize: CanvasSize): Bounds {
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: canvasSize.width / viewport.zoom,
    height: canvasSize.height / viewport.zoom,
  };
}

function readCanvasSize(canvas: HTMLDivElement | null): CanvasSize {
  const rect = canvas?.getBoundingClientRect();
  return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
}

export function CanvasMinimap(props: CanvasMinimapProps) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(() => readCanvasSize(props.canvasRef.current));

  useEffect(() => {
    const canvas = props.canvasRef.current;
    if (!canvas) return;

    const update = () => setCanvasSize(readCanvasSize(canvas));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [props.canvasRef]);

  const viewportBounds = useMemo(
    () => viewportWorldBounds(props.viewport, canvasSize),
    [canvasSize, props.viewport],
  );
  const viewBounds = useMemo(() => {
    const nodeBounds = getSelectionBounds(props.nodes);
    return expandBounds(nodeBounds ? unionBounds(nodeBounds, viewportBounds) : viewportBounds);
  }, [props.nodes, viewportBounds]);

  function worldPointFromPointer(event: PointerEvent<SVGSVGElement>): Point | null {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: viewBounds.x + ((event.clientX - rect.left) / rect.width) * viewBounds.width,
      y: viewBounds.y + ((event.clientY - rect.top) / rect.height) * viewBounds.height,
    };
  }

  function centerViewport(point: Point) {
    props.onViewportChange({
      ...props.viewport,
      x: canvasSize.width / 2 - point.x * props.viewport.zoom,
      y: canvasSize.height / 2 - point.y * props.viewport.zoom,
    });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (activePointerRef.current !== event.pointerId) return;
    const point = worldPointFromPointer(event);
    if (point) {
      centerViewport({ x: point.x + dragOffsetRef.current.x, y: point.y + dragOffsetRef.current.y });
    }
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const horizontalStep = viewportBounds.width * MINIMAP_KEYBOARD_PAN_RATIO;
    const verticalStep = viewportBounds.height * MINIMAP_KEYBOARD_PAN_RATIO;
    const center = {
      x: viewportBounds.x + viewportBounds.width / 2,
      y: viewportBounds.y + viewportBounds.height / 2,
    };
    if (event.key === "ArrowLeft") center.x -= horizontalStep;
    else if (event.key === "ArrowRight") center.x += horizontalStep;
    else if (event.key === "ArrowUp") center.y -= verticalStep;
    else if (event.key === "ArrowDown") center.y += verticalStep;
    else return;
    event.preventDefault();
    event.stopPropagation();
    centerViewport(center);
  }

  if (!props.visible) {
    return (
      <div className="canvas-minimap-layer canvas-minimap-layer--collapsed">
        <PanelIconButton
          className="canvas-minimap-toggle"
          icon="minimap"
          label={t("canvas.minimap.show")}
          tooltipPosition="top"
          onClick={() => props.onVisibleChange(true)}
        />
      </div>
    );
  }

  return (
    <aside className="canvas-minimap-layer" aria-label={t("canvas.minimap.title")}>
      <div className="canvas-minimap">
        <header className="canvas-minimap__header">
          <span>{t("canvas.minimap.title")}</span>
          <PanelIconButton
            className="canvas-minimap-toggle"
            icon="viewOff"
            label={t("canvas.minimap.hide")}
            tooltipPosition="top"
            onClick={() => props.onVisibleChange(false)}
          />
        </header>
        <svg
          ref={svgRef}
          className="canvas-minimap__map"
          viewBox={`${viewBounds.x} ${viewBounds.y} ${Math.max(viewBounds.width, 1)} ${Math.max(viewBounds.height, 1)}`}
          preserveAspectRatio="none"
          role="group"
          tabIndex={0}
          aria-label={t("canvas.minimap.mapAria")}
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => {
            activePointerRef.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            const point = worldPointFromPointer(event);
            if (point) {
              const targetIsViewport = (event.target as Element).classList.contains("canvas-minimap__viewport");
              dragOffsetRef.current = targetIsViewport
                ? {
                    x: viewportBounds.x + viewportBounds.width / 2 - point.x,
                    y: viewportBounds.y + viewportBounds.height / 2 - point.y,
                  }
                : { x: 0, y: 0 };
              centerViewport({ x: point.x + dragOffsetRef.current.x, y: point.y + dragOffsetRef.current.y });
            }
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => {
            if (activePointerRef.current === event.pointerId) {
              activePointerRef.current = null;
              dragOffsetRef.current = { x: 0, y: 0 };
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={() => {
            activePointerRef.current = null;
            dragOffsetRef.current = { x: 0, y: 0 };
          }}
        >
          {props.nodes.map((node) => (
            <rect
              key={node.id}
              className={`canvas-minimap__node canvas-minimap__node--${node.type}`}
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              aria-hidden="true"
            />
          ))}
          <rect
            className="canvas-minimap__viewport"
            x={viewportBounds.x}
            y={viewportBounds.y}
            width={Math.max(viewportBounds.width, 1)}
            height={Math.max(viewportBounds.height, 1)}
            aria-hidden="true"
          />
        </svg>
        {props.nodes.length === 0 ? <span className="canvas-minimap__empty">{t("canvas.minimap.empty")}</span> : null}
      </div>
    </aside>
  );
}
