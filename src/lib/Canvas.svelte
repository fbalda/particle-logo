<script lang="ts">
  import { vec2 } from "gl-matrix";
  import { onMount } from "svelte";
  import setupRenderer from "./webgl/renderer";
  import type { KeyboardEventHandler } from "svelte/elements";

  let canvas: HTMLCanvasElement;

  export let cursorPosition: { x: number; y: number } | undefined;
  export let cursorMovement: { x: number; y: number };
  export let logoUrl: string;

  let render: (
    time: number,
    deltaTime: number,
    cursorPosition: vec2 | undefined,
    cursorMovement: vec2
  ) => void | undefined;

  let updateResolution: (() => void) | undefined;
  let updateLogoUrl: ((logoUrl: string) => void) | undefined;

  onMount(() => {
    const canvasContext = setupRenderer(canvas);

    if (!canvasContext) {
      return;
    }

    render = canvasContext.render;
    updateResolution = canvasContext.updateResolution;
    updateLogoUrl = canvasContext.updateLogoUrl;
  });

  $: if (logoUrl) {
    updateLogoUrl?.(logoUrl);
  }

  let testPhase = 0;

  const onKeyDown: KeyboardEventHandler<Window> = (event) => {
    if (event.key === "a") {
      testPhase = 3;

      cursorPosition = {
        x: window.innerWidth / 2 + 250,
        y: window.innerHeight / 2,
      };

      cursorMovement = { x: 0, y: 0 };

      // if (test) {
      //   cursorPosition = { x: 0, y: 0 };
      // } else {
      //   cursorPosition = {
      //     x: window.innerWidth / 2,
      //     y: window.innerHeight / 2,
      //   };
      // }
    } else if (event.key === "b") {
      testPhase = 5;
      cursorMovement = { x: 0.01, y: 0 };
      cursorPosition = {
        x: window.innerWidth / 2 + 20,
        y: window.innerHeight / 2,
      };
    }
  };

  const moveCursor = (newPos: { x: number; y: number }) => {
    if (cursorPosition) {
      cursorMovement = {
        x: newPos.x - cursorPosition.x,
        y: newPos.y - cursorPosition.y,
      };
    } else {
      cursorMovement = {
        x: 0,
        y: 0,
      };
    }

    cursorPosition = { ...newPos };
  };

  const updateTest = () => {
    // switch (testPhase) {
    //   case 3:
    //     moveCursor({
    //       x: window.innerWidth / 2,
    //       y: window.innerHeight / 2,
    //     });
    //     break;

    //   case 2:
    //     moveCursor({
    //       x: window.innerWidth / 2 - 150,
    //       y: window.innerHeight / 2 - 50,
    //     });
    //     break;

    //   case 1:
    //     moveCursor({
    //       x: window.innerWidth / 2 - 500,
    //       y: window.innerHeight / 2 - 70,
    //     });

    //     break;

    //   case 0:
    //     cursorMovement = {
    //       x: 0,
    //       y: 0,
    //     };
    // }

    switch (testPhase) {
      case 5:
        {
          cursorPosition = {
            x: 0,
            y: 0,
          };
          testPhase = 1;
        }
        break;
      case 3:
        moveCursor({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        break;

      case 2:
        moveCursor({
          x: window.innerWidth / 2 - 250,
          y: window.innerHeight / 2,
        });
        break;

      case 1:
        moveCursor({
          x: window.innerWidth / 2 - 250,
          y: window.innerHeight / 2,
        });

        break;

      case 0:
        cursorMovement = {
          x: 0,
          y: 0,
        };
    }

    testPhase--;
  };

  const onResize = () => {
    updateResolution?.();
  };

  let lastTimestamp = 0;
  const frame = (timestamp: number) => {
    let deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (deltaTime > 0.5) {
      deltaTime = 0.5;
    }

    // cursorMovement.x = 0;
    // cursorMovement.y = 0;

    // console.log(cursorPosition);

    render?.(
      timestamp / 1000,
      deltaTime,
      cursorPosition
        ? vec2.fromValues(cursorPosition.x, cursorPosition.y)
        : undefined,
      vec2.fromValues(cursorMovement.x, cursorMovement.y)
    );

    updateTest();

    // cursorMovement.x = 0;
    // cursorMovement.y = 0;

    // if (cursorPosition) {
    //   cursorPosition.x = 0;
    //   cursorPosition.y = 0;
    // }

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
</script>

<svelte:window on:resize={onResize} on:keydown={onKeyDown} />

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
