import { vec2 } from "gl-matrix";
import { createRotatedRect } from "../helpers";

const SIZE_PIXELS = 150;
const MAX_SCALE_CURSOR_SPEED = 0.3;
const PERPENDICULAR_SPEED_WEIGHT = 0.0;
const FORCE_SCALE_FACTOR = 3.0;
const TEXTURE_SIZE = 128;

// Components per vertex attribute array
const VERTEX_ARRAY_SETUP = [2, 2, 2];

export interface CursorObjectData {
  texture: WebGLTexture | null;
  vao: WebGLVertexArrayObject | null;
  vbo: WebGLBuffer | null;
  vertexCount: number;
  updateVertices: (cursorPosition: vec2, cursorMovement: vec2) => void;
}

const uvFromNormal = (v: vec2) => {
  const u = vec2.create();
  vec2.normalize(u, vec2.fromValues(v[0], v[1]));
  vec2.multiply(u, u, vec2.fromValues(1.414213, 1.414213));
  vec2.add(u, u, vec2.fromValues(1, 1));
  vec2.multiply(u, u, vec2.fromValues(0.5, 0.5));
  return u;
};

const generateCursorVertices = (
  absoluteCursorPosition: vec2,
  absoluteCursorMovement: vec2
) => {
  const screenSpacePointerPosition = vec2.fromValues(
    (-0.5 + absoluteCursorPosition[0] / window.innerWidth) * 2,
    (-0.5 + absoluteCursorPosition[1] / window.innerHeight) * -2
  );
  const screenSpacePointerMovement = vec2.fromValues(
    (absoluteCursorMovement[0] / window.innerWidth) * 2,
    -(absoluteCursorMovement[1] / window.innerHeight) * 2
  );

  const halfSize = vec2.fromValues(
    (SIZE_PIXELS / window.innerWidth) * 0.5,
    (SIZE_PIXELS / window.innerHeight) * 0.5
  );

  const vertexData: number[] = [];

  let vertexCount = 0;

  const pushVertexData = (offset: vec2, uv: vec2, force: vec2) => {
    vertexCount++;
    vertexData.push(
      screenSpacePointerPosition[0] + offset[0],
      screenSpacePointerPosition[1] + offset[1],
      uv[0],
      uv[1],
      force[0],
      force[1]
    );
  };

  const generateStationaryCursorVertices = () => {
    // Stationary, set to none (0.5 maps to 0 in shader)
    const movementForce = vec2.fromValues(0.5, 0.5);

    const cornersOffsets = [
      vec2.fromValues(-halfSize[0], -halfSize[1]),
      vec2.fromValues(halfSize[0], -halfSize[1]),
      vec2.fromValues(-halfSize[0], halfSize[1]),
      vec2.fromValues(halfSize[0], halfSize[1]),
    ];

    const cornerTextureCoordinates = [
      vec2.fromValues(0, 0),
      vec2.fromValues(1, 0),
      vec2.fromValues(0, 1),
      vec2.fromValues(1, 1),
    ];

    cornersOffsets.forEach((offset, index) => {
      pushVertexData(offset, cornerTextureCoordinates[index], movementForce);
    });
  };

  const generateMovingCursorVertices = () => {
    const cursorVelocity = vec2.length(screenSpacePointerMovement);

    const cursorDirection = vec2.create();
    vec2.normalize(cursorDirection, screenSpacePointerMovement);

    const cursorDirectionPerp = vec2.fromValues(
      cursorDirection[1],
      -cursorDirection[0]
    );

    // Vector pointing in the direction of the mouse movement, scaled by the
    // size of the cursor object
    const scaledXAxis = vec2.fromValues(
      cursorDirection[0] * halfSize[0],
      cursorDirection[1] * halfSize[1]
    );

    // Vector perpendicular to the direction of the mouse movement, scaled by
    // the size of the cursor object
    const scaledYAxis = vec2.fromValues(
      cursorDirectionPerp[0] * halfSize[0],
      cursorDirectionPerp[1] * halfSize[1]
    );

    const forceScale =
      (Math.min(MAX_SCALE_CURSOR_SPEED, cursorVelocity) /
        MAX_SCALE_CURSOR_SPEED) *
      FORCE_SCALE_FACTOR;

    // Lateral push forces
    const lateralForces = [
      vec2.fromValues(
        ((cursorDirection[0] -
          cursorDirectionPerp[0] * PERPENDICULAR_SPEED_WEIGHT) *
          forceScale +
          1) /
          2,
        ((cursorDirection[1] -
          cursorDirectionPerp[1] * PERPENDICULAR_SPEED_WEIGHT) *
          -forceScale +
          1) /
          2
      ),
      vec2.fromValues(
        ((cursorDirection[0] +
          cursorDirectionPerp[0] * PERPENDICULAR_SPEED_WEIGHT) *
          forceScale +
          1) /
          2,
        ((cursorDirection[1] +
          cursorDirectionPerp[1] * PERPENDICULAR_SPEED_WEIGHT) *
          -forceScale +
          1) /
          2
      ),
    ];

    const corners = createRotatedRect(scaledXAxis, scaledYAxis);

    const cornerTextureCoordinates = createRotatedRect(
      cursorDirection,
      cursorDirectionPerp
    ).map((normal) => uvFromNormal(normal));

    // Back corners are stretched out to "smear" the cursor with motion
    vec2.sub(corners[2], corners[2], screenSpacePointerMovement);
    vec2.sub(corners[3], corners[3], screenSpacePointerMovement);

    const vertices = [
      corners[1],
      corners[0],
      vec2.fromValues(scaledYAxis[0], scaledYAxis[1]),
      vec2.fromValues(-scaledYAxis[0], -scaledYAxis[1]),
      vec2.fromValues(
        -screenSpacePointerMovement[0] + scaledYAxis[0],
        -screenSpacePointerMovement[1] + scaledYAxis[1]
      ),
      vec2.fromValues(
        -(scaledYAxis[0] + screenSpacePointerMovement[0]),
        -(scaledYAxis[1] + screenSpacePointerMovement[1])
      ),
      corners[3],
      corners[2],
    ];

    const centerTextureCoordinates = [vec2.create(), vec2.create()];

    vec2.lerp(
      centerTextureCoordinates[0],
      cornerTextureCoordinates[0],
      cornerTextureCoordinates[2],
      0.5
    );

    vec2.lerp(
      centerTextureCoordinates[1],
      cornerTextureCoordinates[1],
      cornerTextureCoordinates[3],
      0.5
    );

    const textureCoordinates = [
      cornerTextureCoordinates[1],
      cornerTextureCoordinates[0],
      centerTextureCoordinates[1],
      centerTextureCoordinates[0],
      centerTextureCoordinates[1],
      centerTextureCoordinates[0],
      cornerTextureCoordinates[3],
      cornerTextureCoordinates[2],
    ];

    vertices.forEach((position, index) => {
      pushVertexData(
        position,
        textureCoordinates[index],
        lateralForces[index % 2]
      );
    });
  };

  if (
    screenSpacePointerMovement[0] !== 0 ||
    screenSpacePointerMovement[1] !== 0
  ) {
    generateMovingCursorVertices();
  } else {
    generateStationaryCursorVertices();
  }

  return { vertexData, vertexCount };
};

export const createCursorObjectData = (
  gl: WebGL2RenderingContext
): CursorObjectData | undefined => {
  const cursorObjectTexture = gl.createTexture();

  // TODO: Handle failure to create resources

  gl.bindTexture(gl.TEXTURE_2D, cursorObjectTexture);

  const cursorObjectPixels = new Array<number>();

  for (let x = 0; x < TEXTURE_SIZE; x++) {
    for (let y = 0; y < TEXTURE_SIZE; y++) {
      const vector = vec2.fromValues(
        x - TEXTURE_SIZE / 2,
        y - TEXTURE_SIZE / 2
      );

      const length = Math.min(vec2.len(vector), TEXTURE_SIZE / 2);

      vec2.normalize(vector, vector);
      vec2.multiply(vector, vector, vec2.fromValues(0.5, 0.5));

      cursorObjectPixels.push(
        (1 - (vector[0] + 0.5)) * 255, // X
        (vector[1] + 0.5) * 255, // Y
        (1 - (length / (TEXTURE_SIZE / 2)) ** 2) * 255 // Alpha
      );
    }
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB8,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
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

  const stride = VERTEX_ARRAY_SETUP.reduce<number>(
    (current, componentCount) => current + componentCount * 4,
    0
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

  gl.bindVertexArray(null);

  const cursorObjectData: CursorObjectData = {
    texture: cursorObjectTexture,
    vao: cursorObjectVAO,
    vbo: cursorObjectVBO,
    vertexCount: 0,
    updateVertices: () => {},
  };

  const updateVertices = (cursorPosition: vec2, cursorMovement: vec2) => {
    const { vertexData, vertexCount } = generateCursorVertices(
      cursorPosition,
      cursorMovement
    );
    cursorObjectData.vertexCount = vertexCount;

    gl.bindBuffer(gl.ARRAY_BUFFER, cursorObjectVBO);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(vertexData),
      gl.DYNAMIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  };

  cursorObjectData.updateVertices = updateVertices;

  return cursorObjectData;
};
