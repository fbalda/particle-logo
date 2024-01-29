// Components per vertex attribute array
const VERTEX_ARRAY_SETUP = [2, 2, 2, 1];

export interface LogoParticleData {
  particleCount: number;
  buffers: {
    vao: WebGLVertexArrayObject;
    vbo: WebGLBuffer;
  }[];
  update: (imageData: ImageData) => void;
  stride: number;
}

export const setupLogoParticles = (
  gl: WebGL2RenderingContext,
  imageData: ImageData
): LogoParticleData | undefined => {
  const particleVAOs = [gl.createVertexArray(), gl.createVertexArray()];

  if (!particleVAOs[0] || !particleVAOs[1]) {
    return;
  }

  const particleBuffers = [gl.createBuffer(), gl.createBuffer()];

  if (!particleBuffers[0] || !particleBuffers[1]) {
    return;
  }

  const stride = VERTEX_ARRAY_SETUP.reduce<number>(
    (current, componentCount) => current + componentCount * 4,
    0
  );

  const particleData: LogoParticleData = {
    particleCount: 0,
    buffers: [
      { vao: particleVAOs[0], vbo: particleBuffers[0] },
      { vao: particleVAOs[1], vbo: particleBuffers[1] },
    ],
    update: () => {},
    stride,
  };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    // TODO: Handle
    return;
  }

  const setImage = (imageData: ImageData) => {
    const particleVertexData: number[] = [];

    particleData.particleCount = 0;

    const startX = -imageData.width / 2;
    const startY = -imageData.height / 2;

    for (let i = 0; i < imageData.width; i++) {
      for (let j = 0; j < imageData.height; j++) {
        const pixelX = startX + i;
        const pixelY = startY + j;

        const pixelIndex =
          (i + (imageData.height - j - 1) * imageData.width) * 4 + 3;

        if (imageData.data[pixelIndex] > 0) {
          particleVertexData.push(
            pixelX, // Position X
            pixelY, // Position Y
            0, // Velocity X
            0, // Velocity Y
            pixelX, // Origin X
            pixelY, // Origin Y
            imageData.data[pixelIndex] / 255 // Alpha
          );

          particleData.particleCount++;
        }
      }
    }

    const setupBuffers = (index: number) => {
      gl.bindVertexArray(particleVAOs[index]);
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffers[index]);

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(particleVertexData),
        gl.STATIC_DRAW
      );

      VERTEX_ARRAY_SETUP.reduce<number>((offset, componentCount, index) => {
        gl.vertexAttribPointer(
          index,
          componentCount,
          gl.FLOAT,
          false,
          stride,
          offset * 4
        );
        gl.enableVertexAttribArray(index);
        return offset + componentCount;
      }, 0);
    };

    setupBuffers(1);
    setupBuffers(0);
  };

  setImage(imageData);

  particleData.update = setImage;

  return particleData;
};
