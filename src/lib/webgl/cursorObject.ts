import { vec2 } from "gl-matrix";
import { createRotatedRect } from "../helpers";

// const MAX_SCALE_CURSOR_SPEED = 0.3;
// const PERPENDICULAR_SPEED_WEIGHT = 0.0;
// const FORCE_SCALE_FACTOR = 3.0;

// Components per vertex attribute array
const VERTEX_ARRAY_SETUP = [2, 2, 1];

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
  absoluteCursorMovement: vec2,
  cursorSize: number
) => {
  const cursorDirection = vec2.create();
  vec2.normalize(cursorDirection, absoluteCursorMovement);

  const cursorDirectionPerp = vec2.fromValues(
    cursorDirection[1],
    -cursorDirection[0]
  );

  // Vector pointing in the direction of the mouse movement, scaled by the
  // size of the cursor object
  const scaledXAxis = vec2.fromValues(
    cursorDirection[0] * cursorSize * 0.25,
    cursorDirection[1] * cursorSize * 0.25
  );

  // Vector perpendicular to the direction of the mouse movement, scaled by
  // the size of the cursor object
  const scaledYAxis = vec2.fromValues(
    cursorDirectionPerp[0] * cursorSize * 0.25,
    cursorDirectionPerp[1] * cursorSize * 0.25
  );

  const corners = createRotatedRect(scaledXAxis, scaledYAxis);

  const cornerTextureCoordinates = createRotatedRect(
    cursorDirection,
    cursorDirectionPerp
  ).map((normal) => uvFromNormal(normal));

  // Back corners are stretched out to "smear" the cursor with motion
  vec2.sub(corners[2], corners[2], absoluteCursorMovement);
  vec2.sub(corners[3], corners[3], absoluteCursorMovement);

  const positions = [
    corners[1],
    corners[0],
    scaledYAxis,
    vec2.fromValues(-scaledYAxis[0], -scaledYAxis[1]),
    vec2.fromValues(
      -absoluteCursorMovement[0] + scaledYAxis[0],
      -absoluteCursorMovement[1] + scaledYAxis[1]
    ),
    vec2.fromValues(
      -absoluteCursorMovement[0] - scaledYAxis[0],
      -absoluteCursorMovement[1] - scaledYAxis[1]
    ),
    vec2.fromValues(
      -absoluteCursorMovement[0] + scaledYAxis[0],
      -absoluteCursorMovement[1] + scaledYAxis[1]
    ),
    vec2.fromValues(
      -absoluteCursorMovement[0] - scaledYAxis[0],
      -absoluteCursorMovement[1] - scaledYAxis[1]
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
    centerTextureCoordinates[1],
    centerTextureCoordinates[0],
    cornerTextureCoordinates[3],
    cornerTextureCoordinates[2],
  ];

  // const test = [
  //   vec2.fromValues(0, 0),
  //   vec2.fromValues(0, 0),
  //   vec2.fromValues(0, 0),
  //   vec2.fromValues(0, 0),

  //   vec2.fromValues(1, 1),
  //   vec2.fromValues(1, 1),

  //   vec2.fromValues(0, 0),
  //   vec2.fromValues(0, 0),
  //   vec2.fromValues(0, 0),
  //   vec2.fromValues(0, 0),
  // ];

  const velocityWeights = [0, 0, 0, 0, 1, 1, 0, 0, 0, 0];

  let vertexCount = 0;
  const vertexData = positions.flatMap<number>((offset, index) => {
    // const screenSpacePointerPosition = vec2.fromValues(
    //   (-0.5 + absoluteCursorPosition[0] / window.innerWidth) * 2,
    //   (-0.5 + absoluteCursorPosition[1] / window.innerHeight) * -2
    // );

    vertexCount++;
    return [
      (-0.5 + (absoluteCursorPosition[0] + offset[0]) / window.innerWidth) * 2,
      (-0.5 + (absoluteCursorPosition[1] + offset[1]) / window.innerHeight) *
        -2,
      // screenSpacePointerPosition[0] + offset[0] / window.innerWidth,
      // screenSpacePointerPosition[1] - offset[1] / window.innerHeight,
      textureCoordinates[index][0],
      textureCoordinates[index][1],
      velocityWeights[index],
    ] as number[];
  });

  return { vertexData, vertexCount };
};

export const createCursorObjectData = (
  gl: WebGL2RenderingContext,
  size: number
): CursorObjectData | undefined => {
  const cursorObjectTexture = gl.createTexture();

  // TODO: Handle failure to create resources
  gl.bindTexture(gl.TEXTURE_2D, cursorObjectTexture);

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1);

  const cursorObjectPixels = new Array<number>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const vector = vec2.fromValues(x - size / 2, y - size / 2);
      const length = Math.min(vec2.len(vector), size / 2);

      // const revVector =

      const scale = 1.0 - length / (size / 2);

      vec2.normalize(vector, vector);
      vec2.multiply(vector, vector, vec2.fromValues(scale, scale));
      vec2.multiply(vector, vector, vec2.fromValues(0.5, 0.5));

      cursorObjectPixels.push(
        (vector[0] + 0.5) * 255, // X
        (1 - (vector[1] + 0.5)) * 255, // Y
        (1 - (length / (size / 2)) ** 2) * 255 // Alpha
      );
    }
  }

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB8,
    size,
    size,
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
      cursorMovement,
      size
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
