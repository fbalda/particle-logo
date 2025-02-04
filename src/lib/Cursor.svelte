<script lang="ts">
  import { CURSOR_SIZE_CSS_PIXELS } from "../constants";

  export let position: { x: number; y: number } | undefined;
  export let isHidden: boolean;
</script>

<div
  class:hidden={isHidden || !position}
  style:--top={`${(position?.y || 0) - CURSOR_SIZE_CSS_PIXELS / 2}px`}
  style:--left={`${(position?.x || 0) - CURSOR_SIZE_CSS_PIXELS / 2}px`}
  style:--size={`${CURSOR_SIZE_CSS_PIXELS}px`}
/>

<style>
  div {
    position: fixed;
    border: 1px solid red;
    box-sizing: border-box;
    z-index: 2;
    pointer-events: none;
    transform: scale(100%);
    height: var(--size);
    width: var(--size);
    border-radius: var(--size);
    top: var(--top);
    left: var(--left);
  }

  div.hidden {
    display: none;
  }
</style>
