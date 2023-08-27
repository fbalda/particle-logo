<script lang="ts">
  import Canvas from "./lib/Canvas.svelte";
  import Cursor from "./lib/Cursor.svelte";
  import type { CursorState } from "./lib/cursor";

  let cursorPosition: { x: number; y: number } | undefined = undefined;
  let cursorMovement = { x: 0, y: 0 };
  let cursorState: CursorState = "standard";

  const onMouseEnter = (event: MouseEvent) => {
    cursorPosition = { x: event.clientX, y: event.clientY };
    cursorMovement = { x: 0, y: 0 };
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerType !== "touch") {
      return;
    }

    cursorPosition = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerType !== "touch") {
      return;
    }

    cursorPosition = undefined;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!event.isPrimary) {
      return;
    }

    if (cursorPosition) {
      cursorMovement = {
        x: event.clientX - cursorPosition.x,
        y: event.clientY - cursorPosition.y,
      };
    }

    cursorPosition = { x: event.clientX, y: event.clientY };
  };

  const onMouseEnterDocument = () => {
    cursorState = "standard";
  };

  const onMouseLeaveDocument = () => {
    cursorState = "hidden";
  };
</script>

<svelte:body
  on:mouseleave={onMouseLeaveDocument}
  on:mouseenter={onMouseEnterDocument}
/>

<main
  on:mouseenter={onMouseEnter}
  on:pointerdown={onPointerDown}
  on:pointerup={onPointerUp}
  on:pointermove={onPointerMove}
>
  <Canvas {cursorPosition} {cursorMovement} />
  <Cursor position={cursorPosition} state={cursorState} />
</main>

<style>
  main {
    position: fixed;
    inset: 0;
    margin: none;
    border: none;
    overflow: hidden;
    touch-action: none;
  }
</style>
