import particleVertexShaderSource from "@shaders/particles.vert.glsl?raw";
import particleFragmentShaderSource from "@shaders/particles.frag.glsl?raw";
import cursorVertexShaderSource from "@shaders/cursor.vert.glsl?raw";
import cursorFragmentShaderSource from "@shaders/cursor.frag.glsl?raw";
import particleTransformVertexShaderSource from "@shaders/particleTransform.vert.glsl?raw";
import particleTransformFragmentShaderSource from "@shaders/empty.frag.glsl?raw";

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
      vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) {
        throw new Error("Failed to create vertex shader");
      }
      gl.shaderSource(vertexShader, vertexShaderSource);
      shaderMap.set(vertexShaderSource, vertexShader);
    }

    if (!fragmentShader) {
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

export const createShaders = (gl: WebGL2RenderingContext) => {
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
          // "outScale",
          "outAlpha",
        ],
      },
      uniforms: ["deltaTime", "time", "accelerationVectorMap", "canvasSize"],
    },
  ];

  const shaders = compileShaders(gl, shaderSettings);

  return {
    particleShader: shaders[0],
    cursorShader: shaders[1],
    particleTransformShader: shaders[2],
  };
};

export const createForceVectorFramebufferData = (
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
