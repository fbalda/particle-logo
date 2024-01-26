<script lang="ts">
  export let position: { x: number; y: number } | undefined;
  export let isHidden: boolean;

  const SIZE = 20;
</script>

<div
  class:hidden={isHidden || !position}
  style:--top={`${(position?.y || 0) - SIZE / 2}px`}
  style:--left={`${(position?.x || 0) - SIZE / 2}px`}
  style:--size={`${SIZE}px`}
/>

<style>
  div {
    position: fixed;
    border: 1px solid white;
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
