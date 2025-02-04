<script lang="ts">
  import { onMount } from "svelte";
  import Canvas from "./lib/Canvas.svelte";
  import GhostIcon from "@assets/ghost-solid.svg";
  import { resetUrlHash } from "./lib/helpers";
  import type { KeyboardEventHandler } from "svelte/elements";
  import Cursor from "./lib/Cursor.svelte";

  const logoUrlParameterName = "logo_url";

  const cursorPosition: { x: number; y: number } | undefined = undefined;

  const cursorMovement = { x: 100, y: 0 };
  const isCursorHidden = false;

  // let test = false;

  const testPhase = 0;

  let logoUrl = "";

  const onKeyDown: KeyboardEventHandler<Window> = (event) => {
    if (event.key === "a") {
      // test = !test;
      // testPhase = 3;
      // test = true;
      // cursorPosition = {
      //   x: window.innerWidth / 2 - 75,
      //   y: window.innerHeight / 2,
      // };
      // if (test) {
      //   cursorPosition = { x: 0, y: 0 };
      // } else {
      //   cursorPosition = {
      //     x: window.innerWidth / 2,
      //     y: window.innerHeight / 2,
      //   };
      // }
    }
  };

  const onMouseEnter = (event: MouseEvent) => {
    // cursorPosition = { x: event.clientX, y: event.clientY };
    // cursorMovement = { x: 0, y: 0 };
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerType !== "touch") {
      return;
    }
    // cursorPosition = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!event.isPrimary || event.pointerType !== "touch") {
      return;
    }
    // cursorPosition = undefined;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!event.isPrimary) {
      return;
    }
    // if (cursorPosition) {
    //   cursorMovement = {
    //     x: event.clientX - cursorPosition.x,
    //     y: event.clientY - cursorPosition.y,
    //   };
    // }
    // cursorPosition = { x: event.clientX, y: event.clientY };
  };

  const onMouseEnterDocument = () => {
    // isCursorHidden = false;
  };

  const onMouseLeaveDocument = () => {
    // isCursorHidden = true;
  };

  const onHashChange = () => {
    if (!location.hash) {
      logoUrl = GhostIcon;
      return;
    }

    const hash = location.hash.substring(1);
    const parts = hash.split("=");

    if (parts.length === 0 || parts[0] === logoUrlParameterName) {
      logoUrl = decodeURIComponent(parts[1]);
    }

    if (!logoUrl) {
      resetUrlHash();
    }
  };

  onMount(() => {
    onHashChange();
  });
</script>

<svelte:body
  on:mouseleave={onMouseLeaveDocument}
  on:mouseenter={onMouseEnterDocument}
/>

<svelte:window on:hashchange={onHashChange} on:keydown={onKeyDown} />

<main
  on:mouseenter={onMouseEnter}
  on:pointerdown={onPointerDown}
  on:pointerup={onPointerUp}
  on:pointermove={onPointerMove}
>
  <Canvas {cursorPosition} {cursorMovement} {logoUrl} />
  <Cursor position={cursorPosition} isHidden={isCursorHidden} />
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
