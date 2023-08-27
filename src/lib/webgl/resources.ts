import particleVertexShaderSource from "@shaders/particles.vert.glsl?raw";
import particleFragmentShaderSource from "@shaders/particles.frag.glsl?raw";
import cursorVertexShaderSource from "@shaders/cursor.vert.glsl?raw";
import cursorFragmentShaderSource from "@shaders/cursor.frag.glsl?raw";
import particleTransformVertexShaderSource from "@shaders/particleTransform.vert.glsl?raw";
import particleTransformFragmentShaderSource from "@shaders/empty.frag.glsl?raw";
import { vec2 } from "gl-matrix";

const LOGO_URL =
  "https://icons.getbootstrap.com/assets/icons/emoji-sunglasses-fill.svg";

const LOGO_SIZE = [500, 500];

interface ShaderSettings {
  fragmentShaderSource: string;
  vertexShaderSource: string;
  transformFeedbackConfig?: {
    transformFeedbackVaryings: string[];
  };
  uniforms?: string[];
}

type ShaderInfo = {
  program: WebGLProgram;
  uniformLocations: Map<string, WebGLUniformLocation | undefined>;
  transformFeedback?: WebGLTransformFeedback;
};

type IntermediateShaderData = Omit<
  ShaderSettings,
  "fragmentShaderSource" | "vertexShaderSource"
> &
  ShaderInfo & {
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;
  };

const compileShaders = (
  gl: WebGL2RenderingContext,
  shaderSettings: ShaderSettings[]
): ShaderInfo[] => {
  const shaderMap = new Map<string, WebGLProgram>();
  const intermediateShaderData: IntermediateShaderData[] = [];

  // Create all stage shaders
  shaderSettings.forEach((singleShaderSettings) => {
    const {
      vertexShaderSource,
      fragmentShaderSource,
      ...restSingleShaderSettings
    } = singleShaderSettings;

    let vertexShader = shaderMap.get(vertexShaderSource) || null;
    let fragmentShader = shaderMap.get(fragmentShaderSource) || null;

    if (!vertexShader) {
      console.log("Created new vertex shader");
      vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) {
        throw new Error("Failed to create vertex shader");
      }
      gl.shaderSource(vertexShader, vertexShaderSource);
      shaderMap.set(vertexShaderSource, vertexShader);
    }

    if (!fragmentShader) {
      console.log("Created new fragment shader");
      fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fragmentShader) {
        throw new Error("Failed to create fragment shader");
      }
      gl.shaderSource(fragmentShader, fragmentShaderSource);

      shaderMap.set(fragmentShaderSource, fragmentShader);
    }

    const program = gl.createProgram();

    if (!program) {
      throw new Error("Failed to create shader program");
    }

    intermediateShaderData.push({
      ...restSingleShaderSettings,
      vertexShader,
      fragmentShader,
      program,
      uniformLocations: new Map<string, WebGLUniformLocation>(),
    });
  });

  // Compile all shaders
  shaderMap.forEach((shader) => {
    gl.compileShader(shader);
  });

  // Link all shaders (and create transform feedback if needed)
  intermediateShaderData.forEach((shaderData) => {
    gl.attachShader(shaderData.program, shaderData.vertexShader);
    gl.attachShader(shaderData.program, shaderData.fragmentShader);

    if (shaderData.transformFeedbackConfig) {
      const transformFeedback = gl.createTransformFeedback();

      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);

      gl.transformFeedbackVaryings(
        shaderData.program,
        shaderData.transformFeedbackConfig.transformFeedbackVaryings,
        gl.INTERLEAVED_ATTRIBS
      );

      shaderData.transformFeedback = transformFeedback || undefined;
    }

    gl.linkProgram(shaderData.program);
  });

  // Delete all shaders (not needed anymore)
  shaderMap.forEach((shader) => {
    gl.deleteShader(shader);
  });

  // Check for errors and get uniforms
  intermediateShaderData.forEach((shaderData) => {
    if (!gl.getProgramParameter(shaderData.program, gl.LINK_STATUS)) {
      throw new Error(`Shader compile/link error: ${gl.getError()}`);
    }

    shaderData.uniforms?.forEach((uniform) => {
      console.log("Setting uniform location for " + uniform);
      shaderData.uniformLocations.set(
        uniform,
        gl.getUniformLocation(shaderData.program, uniform) || undefined
      );
    });
  });

  return intermediateShaderData.map((shaderData) => {
    return {
      program: shaderData.program,
      uniformLocations: shaderData.uniformLocations,
      transformFeedback: shaderData.transformFeedback,
    };
  });
};

export const createShaders = async (gl: WebGL2RenderingContext) => {
  const shaderSettings: ShaderSettings[] = [
    // Particle Shader
    {
      vertexShaderSource: particleVertexShaderSource,
      fragmentShaderSource: particleFragmentShaderSource,
      uniforms: ["canvasSize"],
    },
    // Cursor Shader
    {
      vertexShaderSource: cursorVertexShaderSource,
      fragmentShaderSource: cursorFragmentShaderSource,
      uniforms: ["radialMask", "forceMap"],
    },
    // Particle Transform Shader
    {
      vertexShaderSource: particleTransformVertexShaderSource,
      fragmentShaderSource: particleTransformFragmentShaderSource,
      transformFeedbackConfig: {
        transformFeedbackVaryings: [
          "outPosition",
          "outVelocity",
          "outOrigin",
          "outScale",
          "outAlpha",
        ],
      },
      uniforms: ["deltaTime", "time", "accelerationVectorMap", "canvasSize"],
    },
  ];

  const shaders = await compileShaders(gl, shaderSettings);

  return {
    particleShader: shaders[0],
    cursorShader: shaders[1],
    particleTransformShader: shaders[2],
  };
};

export const setupLogoParticles = async (gl: WebGL2RenderingContext) => {
  const particleVAOs = [gl.createVertexArray(), gl.createVertexArray()];

  if (!particleVAOs[0] || !particleVAOs[1]) {
    return;
  }

  const particleBuffers = [gl.createBuffer(), gl.createBuffer()];

  if (!particleBuffers[0] || !particleBuffers[1]) {
    return;
  }

  const attributeSizes = [2, 2, 2, 1, 1];

  const attributeStride =
    attributeSizes.reduce((prev, current) => prev + current) * 4;

  const particleData = {
    particleCount: 0,
    buffers: [
      { vao: particleVAOs[0], vbo: particleBuffers[0] },
      { vao: particleVAOs[1], vbo: particleBuffers[1] },
    ],
    recompute: () => {},
  };

  const particles: { alpha: number; pixelOrigin: number[] }[] = [];

  const image = new Image();

  image.src = LOGO_URL;
  image.height = LOGO_SIZE[0];
  image.width = LOGO_SIZE[1];

  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    // TODO: Handle
    return;
  }

  const logoScale = 0.5;

  canvas.width = image.width * logoScale;
  canvas.height = image.height * logoScale;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixelData = context.getImageData(0, 0, canvas.width, canvas.height);

  for (let j = 0; j < pixelData.height; j++) {
    for (let i = 0; i < pixelData.width; i++) {
      const pixelIndex =
        (i + (pixelData.height - j - 1) * pixelData.width) * 4 + 3;

      if (pixelData.data[pixelIndex] > 0) {
        particles.push({
          alpha: pixelData.data[pixelIndex] / 255,
          pixelOrigin: [i, j],
        });
        particleData.particleCount++;
      }
    }
  }

  const setupBuffers = (index: number) => {
    gl.bindVertexArray(particleVAOs[index]);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffers[index]);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      particleData.particleCount * attributeStride,
      gl.STATIC_DRAW
    );

    let currentOffset = 0;
    attributeSizes.forEach((size, index) => {
      gl.vertexAttribPointer(
        index,
        size,
        gl.FLOAT,
        false,
        attributeStride,
        currentOffset
      );
      gl.enableVertexAttribArray(index);
      currentOffset += size * 4;
    });
  };

  setupBuffers(1);
  setupBuffers(0);

  const compute = () => {
    const initParticleData: number[] = [];

    const startX = -pixelData.width / 2;
    const startY = -pixelData.height / 2;

    particles.forEach((particle, index) => {
      const pixelX = startX + particle.pixelOrigin[0];
      const pixelY = startY + particle.pixelOrigin[1];

      const pixelVec = vec2.fromValues(pixelX, pixelY);

      initParticleData.push(
        pixelVec[0],
        pixelVec[1],
        0,
        0,
        pixelX,
        pixelY,
        1,
        particle.alpha
      );
    });

    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffers[0]);

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(initParticleData),
      gl.STATIC_DRAW
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  };

  particleData.recompute = compute;

  compute();

  return particleData;
};

export const createCursorObjectData = (gl: WebGL2RenderingContext) => {
  const cursorObjectTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, cursorObjectTexture);

  const cursorObjectTextureSize = 128;
  const cursorObjectPixels = new Array<number>();

  for (let x = 0; x < cursorObjectTextureSize; x++) {
    for (let y = 0; y < cursorObjectTextureSize; y++) {
      const vector = vec2.fromValues(
        x - cursorObjectTextureSize / 2,
        y - cursorObjectTextureSize / 2
      );

      const length = Math.min(vec2.len(vector), cursorObjectTextureSize / 2);

      vec2.normalize(vector, vector);
      vec2.multiply(vector, vector, vec2.fromValues(0.5, 0.5));

      cursorObjectPixels.push(
        (vector[1] + 0.5) * 255, // R
        (1 - (vector[0] + 0.5)) * 255, // G
        (1 - (length / (cursorObjectTextureSize / 2)) ** 2) * 255 // Alpha
      );
    }
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB8,
    cursorObjectTextureSize,
    cursorObjectTextureSize,
    0,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    new Uint8Array(cursorObjectPixels)
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  const cursorObjectVAO = gl.createVertexArray();
  const cursorObjectVBO = gl.createBuffer();

  gl.bindVertexArray(cursorObjectVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, cursorObjectVBO);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * 4, 0);
  gl.enableVertexAttribArray(0);

  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * 4, 4 * 2);
  gl.enableVertexAttribArray(1);

  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8 * 4, 4 * 4);
  gl.enableVertexAttribArray(2);

  gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 8 * 4, 4 * 6);
  gl.enableVertexAttribArray(3);

  gl.bindVertexArray(null);

  return {
    texture: cursorObjectTexture,
    vao: cursorObjectVAO,
    vbo: cursorObjectVBO,
  };
};

export const createFramebufferData = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number
) => {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  const renderTexture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, renderTexture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // const framebufferDimensions = [1024, 1024];

  const recreateFramebuffer = (
    gl: WebGL2RenderingContext,
    width: number,
    height: number
  ) => {
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  recreateFramebuffer(gl, width, height);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    renderTexture,
    0
  );

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {
    framebuffer,
    renderTexture,
    recreateFramebuffer,
  };
};
