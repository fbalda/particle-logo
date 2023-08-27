<script lang="ts">
  import type { CursorState } from "./cursor";

  export let position: { x: number; y: number } | undefined;
  export let state: CursorState;

  const SIZE = 20;
</script>

<div
  style="height:{SIZE}px; width: {SIZE}px; border-radius: {SIZE}px; left: {(position?.x ||
    0) -
    SIZE / 2}px; top: {(position?.y || 0) - SIZE / 2}px; {!position &&
    'visibility: hidden;'}"
  class:hidden={state === "hidden"}
/>

<style>
  div {
    position: fixed;
    border: 1px solid white;
    z-index: 2;
    pointer-events: none;
    transform: scale(100%);
  }

  div.hidden {
    display: none;
  }
</style>
