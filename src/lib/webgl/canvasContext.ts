import type { vec2 } from "gl-matrix";
import { debounce } from "../helpers/functionHelpers";
import generateCursorVertices from "./cursorObject";
import {
  setupLogoParticles,
  createCursorObjectData,
  createFramebufferData,
  createShaders,
} from "./resources";

const DEBUG = false;

const setupCanvasContext = async (canvasElement: HTMLCanvasElement) => {
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

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.cullFace(gl.BACK);

  // Resources
  const timeBeforeLoad = Date.now();

  const {
    cursorShader: spriteShader,
    particleShader,
    particleTransformShader,
  } = await createShaders(gl);

  const timeAfterLoad = Date.now();

  console.log(`Load time: ${(timeAfterLoad - timeBeforeLoad) / 1000} seconds`);

  const particleData = await setupLogoParticles(gl);

  const cursorObject = createCursorObjectData(gl);

  const framebufferData = createFramebufferData(
    gl,
    canvasResolution.x,
    canvasResolution.y
  );

  if (
    !particleTransformShader ||
    !particleShader ||
    !spriteShader ||
    !particleData ||
    !cursorObject
  ) {
    return;
  }

  let readBufferIndex = 0;
  let rendering = true;

  const render = (
    time: number,
    deltaTime: number,
    cursorPosition: vec2 | undefined,
    cursorMovement: vec2
  ) => {
    const gl = canvasElement.getContext("webgl2");

    if (!gl) {
      return;
    }

    if (!rendering) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    gl.viewport(0, 0, canvasResolution.x, canvasResolution.y);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebufferData.framebuffer);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let cursorObjectVertexCount = 0;

    if (cursorPosition) {
      gl.bindVertexArray(cursorObject.vao);

      const vertexData = generateCursorVertices(cursorPosition, cursorMovement);

      cursorObjectVertexCount = vertexData.length / 8;

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertexData),
        gl.DYNAMIC_DRAW
      );

      gl.useProgram(spriteShader.program);

      // TODO: Bind all textures once, as we only have a few
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cursorObject.texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, cursorObject.texture);

      gl.uniform1i(spriteShader.uniformLocations.get("radialMask") || null, 0);
      gl.uniform1i(spriteShader.uniformLocations.get("forceMap") || null, 1);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, cursorObjectVertexCount);

      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_STENCIL_ATTACHMENT]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.clearColor(0, 0, 0, 0);

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Update particles
    const writeBufferIndex = 1 - readBufferIndex;

    gl.bindTransformFeedback(
      gl.TRANSFORM_FEEDBACK,
      particleTransformShader.transformFeedback || null
    );

    gl.bindVertexArray(particleData.buffers[readBufferIndex].vao);
    gl.bindBufferBase(
      gl.TRANSFORM_FEEDBACK_BUFFER,
      0,
      particleData.buffers[writeBufferIndex].vbo
    );

    gl.enable(gl.RASTERIZER_DISCARD);

    gl.useProgram(particleTransformShader.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, framebufferData.renderTexture);
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

    readBufferIndex = writeBufferIndex;

    gl.bindVertexArray(particleData.buffers[writeBufferIndex].vao);
    gl.useProgram(particleShader.program);

    gl.uniform2f(
      particleShader.uniformLocations.get("canvasSize") || null,
      canvasResolution.x,
      canvasResolution.y
    );

    gl.drawArrays(gl.POINTS, 0, particleData.particleCount);

    // Debug draw
    if (DEBUG) {
      gl.bindVertexArray(cursorObject.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, cursorObject.vbo);

      gl.useProgram(spriteShader.program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, cursorObject.texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, cursorObject.texture);

      gl.uniform1i(spriteShader.uniformLocations.get("radialMask") || null, 0);
      gl.uniform1i(spriteShader.uniformLocations.get("forceMap") || null, 1);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, cursorObjectVertexCount);

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindVertexArray(null);
    }
  };

  const refreshResources = debounce(() => {
    const gl = canvasElement.getContext("webgl2");
    if (!gl) {
      return;
    }

    framebufferData.recreateFramebuffer(
      gl,
      canvasResolution.x,
      canvasResolution.y
    );
    readBufferIndex = 0;
    rendering = true;
  }, 300);

  const updateResolution = () => {
    rendering = false;
    refreshCanvasResolution();
    canvasElement.width = canvasResolution.x;
    canvasElement.height = canvasResolution.y;
    refreshResources();
  };

  updateResolution();

  return {
    render,
    updateResolution,
  };
};

export default setupCanvasContext;
