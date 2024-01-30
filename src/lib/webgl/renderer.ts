import type { vec2 } from "gl-matrix";
import { debounce, getImageDataFromUrl, resetUrlHash } from "../helpers";
import { createCursorObjectData } from "./cursorObject";
import { createForceVectorFramebufferData, createShaders } from "./resources";
import { setupLogoParticles, type LogoParticleData } from "./logoParticles";

const RESOURCE_REFRESH_DEBOUNCE_DELAY_MS = 300;
const LOGO_SIZE = 250;
const CLEAR_COLOR: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0];
const CURSOR_DEBUG_DRAW = false;

const setupRenderer = (canvasElement: HTMLCanvasElement) => {
  const canvasResolution = { x: 0, y: 0 };

  const refreshCanvasResolution = () => {
    canvasResolution.x = window.innerWidth * devicePixelRatio;
    canvasResolution.y = window.innerHeight * devicePixelRatio;
  };

  refreshCanvasResolution();

  const gl = canvasElement.getContext("webgl2");

  if (!gl) {
    return;
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.activeTexture(gl.TEXTURE0);

  const { cursorShader, particleShader, particleTransformShader } =
    createShaders(gl);

  let particleData: LogoParticleData | undefined = undefined;

  const cursorObject = createCursorObjectData(gl);

  const forceVectorFramebufferData = createForceVectorFramebufferData(
    gl,
    canvasResolution.x,
    canvasResolution.y
  );

  if (
    !particleTransformShader ||
    !particleShader ||
    !cursorShader ||
    !cursorObject
  ) {
    return;
  }

  let readBufferIndex = 0;
  let isRendering = true;

  const renderForceVectorFramebuffer = (
    cursorPosition: vec2 | undefined,
    cursorMovement: vec2
  ) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, forceVectorFramebufferData.framebuffer);
    // Vector components are mapped from [-1,1] to [0,1] so 0.5 means 0
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (cursorPosition) {
      gl.bindVertexArray(cursorObject.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cursorObject.vbo);

      cursorObject.updateVertices(cursorPosition, cursorMovement);

      gl.useProgram(cursorShader.program);

      gl.bindTexture(gl.TEXTURE_2D, cursorObject.texture);

      gl.uniform1i(cursorShader.uniformLocations.get("radialMask") || null, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, cursorObject.vertexCount);

      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const updateParticles = (
    deltaTime: number,
    time: number,
    writeBufferIndex: number
  ) => {
    if (!particleData || !particleTransformShader.transformFeedback) {
      return;
    }

    gl.bindTransformFeedback(
      gl.TRANSFORM_FEEDBACK,
      particleTransformShader.transformFeedback
    );

    gl.bindVertexArray(particleData.buffers[readBufferIndex].vao);
    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      0,
      particleData.buffers[writeBufferIndex].vbo
    );

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.useProgram(particleTransformShader.program);

    gl.bindTexture(gl.TEXTURE_2D, forceVectorFramebufferData.renderTexture);
    gl.uniform1i(
      particleTransformShader.uniformLocations.get("accelerationVectorMap") ||
        null,
      0
    );

    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, particleData.particleCount);
    gl.endTransformFeedback();

    gl.uniform1f(
      particleTransformShader.uniformLocations.get("deltaTime") || null,
      deltaTime
    );
    gl.uniform1f(
      particleTransformShader.uniformLocations.get("time") || null,
      time
    );
    gl.uniform2f(
      particleTransformShader.uniformLocations.get("canvasSize") || null,
      canvasResolution.x,
      canvasResolution.y
    );

    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.disable(gl.RASTERIZER_DISCARD);
  };

  const renderParticles = (writeBufferIndex: number) => {
    if (!particleData) {
      return;
    }

    gl.clearColor(...CLEAR_COLOR);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(particleData.buffers[writeBufferIndex].vao);
    gl.useProgram(particleShader.program);

    gl.uniform2f(
      particleShader.uniformLocations.get("canvasSize") || null,
      canvasResolution.x,
      canvasResolution.y
    );

    gl.drawArrays(gl.POINTS, 0, particleData.particleCount);
  };

  const debugRenderCursorForceVectors = () => {
    gl.bindVertexArray(cursorObject.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, cursorObject.vbo);

    gl.useProgram(cursorShader.program);

    gl.bindTexture(gl.TEXTURE_2D, cursorObject.texture);

    gl.uniform1i(cursorShader.uniformLocations.get("radialMask") || null, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, cursorObject.vertexCount);

    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  const render = (
    time: number,
    deltaTime: number,
    cursorPosition: vec2 | undefined,
    cursorMovement: vec2
  ) => {
    const gl = canvasElement.getContext("webgl2");

    if (!gl || !particleData) {
      return;
    }

    if (!isRendering) {
      gl.clearColor(...CLEAR_COLOR);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    const writeBufferIndex = 1 - readBufferIndex;

    renderForceVectorFramebuffer(cursorPosition, cursorMovement);
    updateParticles(deltaTime, time, writeBufferIndex);
    renderParticles(writeBufferIndex);
    if (CURSOR_DEBUG_DRAW) {
      debugRenderCursorForceVectors();
    }

    readBufferIndex = writeBufferIndex;
  };

  const refreshResources = debounce(() => {
    const gl = canvasElement.getContext("webgl2");
    if (!gl) {
      return;
    }

    forceVectorFramebufferData.recreateFramebuffer(
      gl,
      canvasResolution.x,
      canvasResolution.y
    );
    readBufferIndex = 0;
    isRendering = true;
  }, RESOURCE_REFRESH_DEBOUNCE_DELAY_MS);

  const updateResolution = () => {
    isRendering = false;
    refreshCanvasResolution();
    canvasElement.width = canvasResolution.x;
    canvasElement.height = canvasResolution.y;
    refreshResources();
    gl.viewport(0, 0, canvasResolution.x, canvasResolution.y);
  };

  updateResolution();

  let lastLogoRequestId = 0;

  const updateLogoUrl = (logoUrl: string) => {
    const requestId = ++lastLogoRequestId;

    void (async () => {
      const imageData = await getImageDataFromUrl(
        logoUrl,
        LOGO_SIZE,
        LOGO_SIZE
      );

      if (requestId !== lastLogoRequestId) {
        // No logo requested in the meantime
        return;
      }

      const gl = canvasElement.getContext("webgl2");

      if (!gl) {
        return;
      }

      if (!imageData) {
        resetUrlHash();
        return;
      }

      if (particleData) {
        particleData.update(imageData);
      } else {
        particleData = setupLogoParticles(gl, imageData);
      }
    })();
  };

  return {
    render,
    updateResolution,
    updateLogoUrl,
  };
};

export default setupRenderer;
