<script lang="ts">
  import { vec2 } from "gl-matrix";
  import { onMount } from "svelte";
  import setupCanvasContext from "./webgl/canvasContext";

  let canvas: HTMLCanvasElement;

  export let cursorPosition: { x: number; y: number } | undefined;
  export let cursorMovement: { x: number; y: number };

  let render: (
    time: number,
    deltaTime: number,
    cursorPosition: vec2 | undefined,
    cursorMovement: vec2
  ) => void | undefined;

  let updateResolution: () => void | undefined;
  let isRendering = true;

  void onMount(async () => {
    const canvasContext = await setupCanvasContext(canvas);

    if (!canvasContext) {
      return;
    }

    render = canvasContext.render;
    updateResolution = canvasContext.updateResolution;
  });

  const onResize = () => {
    isRendering = false;
    updateResolution?.();
  };

  let lastTimestamp = 0;
  const frame = (timestamp: number) => {
    let deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (deltaTime > 0.5) {
      deltaTime = 0.5;
    }

    render?.(
      timestamp / 1000,
      deltaTime,
      cursorPosition
        ? vec2.fromValues(cursorPosition.x, cursorPosition.y)
        : undefined,
      vec2.fromValues(cursorMovement.x, cursorMovement.y)
    );

    cursorMovement.x = 0;
    cursorMovement.y = 0;

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
</script>

<svelte:window on:resize={onResize} />

<canvas bind:this={canvas} />

<style>
  canvas {
    position: fixed;
    top: 0;
    left: 0;
    height: 100% !important;
    width: 100% !important;
    margin: none;
    border: none;
    box-sizing: content-box;
  }
</style>
