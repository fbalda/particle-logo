import { vec2 } from "gl-matrix";

const CURSOR_OBJECT_SIZE_PIXELS = 150;
const MAX_SCALE_CURSOR_SPEED = 0.3;
const PERPENDICULAR_SPEED_WEIGHT = 0.0;
const FORCE_SCALE = 3.0;

const generateCursorVertices = (cursorPosition: vec2, cursorMovement: vec2) => {
  const screenSpacePointerPosition = {
    x: (-0.5 + cursorPosition[0] / window.innerWidth) * 2,
    y: (-0.5 + cursorPosition[1] / window.innerHeight) * 2,
  };
  const screenSpacePointerMovement = {
    x: (cursorMovement[0] / window.innerWidth) * 2,
    y: -(cursorMovement[1] / window.innerHeight) * 2,
  };

  const scaledCursorObjectSize = [
    CURSOR_OBJECT_SIZE_PIXELS / window.innerWidth,
    CURSOR_OBJECT_SIZE_PIXELS / window.innerHeight,
  ];

  let posFront1 = vec2.create();
  let posBack1 = vec2.create();
  let posFront2 = vec2.create();
  let posBack2 = vec2.create();

  let uf1 = vec2.fromValues(0, 0);
  let ub1 = vec2.fromValues(0, 0);
  let uf2 = vec2.fromValues(0, 0);
  let ub2 = vec2.fromValues(0, 0);

  let s1 = vec2.fromValues(0.5, 0.5);
  let s2 = vec2.fromValues(0.5, 0.5);

  const vertexData: number[] = [];

  const pushVertexData = (
    offset: vec2,
    uv: vec2,
    force: vec2,
    normal: vec2
  ) => {
    vertexData.push(
      screenSpacePointerPosition.x + offset[0],
      -screenSpacePointerPosition.y + offset[1],
      uv[0],
      uv[1],
      force[0],
      force[1],
      normal[0],
      normal[1]
    );
  };

  if (
    screenSpacePointerMovement.x !== 0 ||
    screenSpacePointerMovement.y !== 0
  ) {
    const normalizedCursorMovementVector = vec2.fromValues(
      screenSpacePointerMovement.x,
      screenSpacePointerMovement.y
    );

    const cursorSpeed = vec2.length(normalizedCursorMovementVector);

    vec2.normalize(
      normalizedCursorMovementVector,
      normalizedCursorMovementVector
    );

    const cursorDirectionPerpVector = vec2.fromValues(
      normalizedCursorMovementVector[1],
      -normalizedCursorMovementVector[0]
    );

    const v1Norm = vec2.fromValues(
      normalizedCursorMovementVector[0],
      normalizedCursorMovementVector[1]
    );

    const v2Norm = vec2.fromValues(
      cursorDirectionPerpVector[0],
      cursorDirectionPerpVector[1]
    );

    // Vector pointing in the direction of the mouse movement, scaled by the
    // size of the cursor object
    const v1 = vec2.fromValues(
      normalizedCursorMovementVector[0] * scaledCursorObjectSize[0] * 0.5,
      normalizedCursorMovementVector[1] * scaledCursorObjectSize[1] * 0.5
    );

    // Vector perpendicular to the direction of the mouse movement, scaled by
    // the size of the cursor object
    const v2 = vec2.fromValues(
      cursorDirectionPerpVector[0] * scaledCursorObjectSize[0] * 0.5,
      cursorDirectionPerpVector[1] * scaledCursorObjectSize[1] * 0.5
    );

    const scale =
      (Math.min(MAX_SCALE_CURSOR_SPEED, cursorSpeed) / MAX_SCALE_CURSOR_SPEED) *
      FORCE_SCALE;

    // Lateral push forces
    s2 = [
      ((normalizedCursorMovementVector[0] +
        cursorDirectionPerpVector[0] * PERPENDICULAR_SPEED_WEIGHT) *
        scale +
        1) /
        2,
      ((normalizedCursorMovementVector[1] +
        cursorDirectionPerpVector[1] * PERPENDICULAR_SPEED_WEIGHT) *
        -scale +
        1) /
        2,
    ];
    s1 = [
      ((normalizedCursorMovementVector[0] -
        cursorDirectionPerpVector[0] * PERPENDICULAR_SPEED_WEIGHT) *
        scale +
        1) /
        2,
      ((normalizedCursorMovementVector[1] -
        cursorDirectionPerpVector[1] * PERPENDICULAR_SPEED_WEIGHT) *
        -scale +
        1) /
        2,
    ];

    const vf1Norm = vec2.fromValues(
      v1Norm[0] - v2Norm[0],
      v1Norm[1] - v2Norm[1]
    );

    const vf2Norm = vec2.fromValues(
      v1Norm[0] + v2Norm[0],
      v1Norm[1] + v2Norm[1]
    );

    const vb1Norm = vec2.fromValues(
      -v1Norm[0] - v2Norm[0],
      -v1Norm[1] - v2Norm[1]
    );

    const vb2Norm = vec2.fromValues(
      -v1Norm[0] + v2Norm[0],
      -v1Norm[1] + v2Norm[1]
    );

    // Outer front positions
    posFront1 = vec2.fromValues(v1[0] - v2[0], v1[1] - v2[1]);
    posFront2 = vec2.fromValues(v1[0] + v2[0], v1[1] + v2[1]);

    // Inner front positions
    const posFrontInner1 = vec2.fromValues(-v2[0], -v2[1]);
    const posFrontInner2 = vec2.fromValues(v2[0], v2[1]);

    // Inner back positions
    const posBackInner1 = vec2.fromValues(
      -(v2[0] + screenSpacePointerMovement.x),
      -(v2[1] + screenSpacePointerMovement.y)
    );
    const posBackInner2 = vec2.fromValues(
      -screenSpacePointerMovement.x + v2[0],
      -screenSpacePointerMovement.y + v2[1]
    );

    // Outer back positions
    posBack1 = vec2.fromValues(
      -(v1[0] + v2[0] + screenSpacePointerMovement.x),
      -(v1[1] + v2[1] + screenSpacePointerMovement.y)
    );
    posBack2 = vec2.fromValues(
      -(v1[0] + screenSpacePointerMovement.x) + v2[0],
      -(v1[1] + screenSpacePointerMovement.y) + v2[1]
    );

    const uvFromNormal = (v: vec2) => {
      const u = vec2.create();
      vec2.normalize(u, vec2.fromValues(v[0], v[1]));
      vec2.multiply(u, u, vec2.fromValues(1.414213, 1.414213));
      vec2.add(u, u, vec2.fromValues(1, 1));
      vec2.multiply(u, u, vec2.fromValues(0.5, 0.5));
      return u;
    };

    uf1 = uvFromNormal(vf1Norm);
    ub1 = uvFromNormal(vb1Norm);
    uf2 = uvFromNormal(vf2Norm);
    ub2 = uvFromNormal(vb2Norm);

    const um1 = vec2.create();
    const um2 = vec2.create();

    vec2.lerp(um1, uf1, ub1, 0.5);
    vec2.lerp(um2, uf2, ub2, 0.5);

    pushVertexData(posFront2, uf2, s2, vec2.fromValues(0, 0));
    pushVertexData(posFront1, uf1, s1, vec2.fromValues(0, 0));

    pushVertexData(posFrontInner2, um2, s2, vec2.fromValues(0, 0));
    pushVertexData(posFrontInner1, um1, s1, vec2.fromValues(0, 0));

    pushVertexData(posBackInner2, um2, s2, vec2.fromValues(0, 0));
    pushVertexData(posBackInner1, um1, s1, vec2.fromValues(0, 0));

    pushVertexData(posBack2, ub2, s2, vec2.fromValues(0, 0));
    pushVertexData(posBack1, ub1, s1, vec2.fromValues(0, 0));
  }
  // Stationary cursor
  else {
    const vf1 = vec2.fromValues(
      -scaledCursorObjectSize[0] * 0.5,
      -scaledCursorObjectSize[1] * 0.5
    );
    const vb1 = vec2.fromValues(
      scaledCursorObjectSize[0] * 0.5,
      -scaledCursorObjectSize[1] * 0.5
    );
    const vf2 = vec2.fromValues(
      -scaledCursorObjectSize[0] * 0.5,
      scaledCursorObjectSize[1] * 0.5
    );
    const vb2 = vec2.fromValues(
      scaledCursorObjectSize[0] * 0.5,
      scaledCursorObjectSize[1] * 0.5
    );

    const uf1 = vec2.fromValues(0, 0);
    const ub1 = vec2.fromValues(1, 0);
    const uf2 = vec2.fromValues(0, 1);
    const ub2 = vec2.fromValues(1, 1);

    vertexData.push(
      screenSpacePointerPosition.x + vf1[0],
      -screenSpacePointerPosition.y + vf1[1],
      uf1[0],
      uf1[1],
      s1[0],
      s1[1],
      uf1[0],
      uf1[1],
      screenSpacePointerPosition.x + vb1[0],
      -screenSpacePointerPosition.y + vb1[1],
      ub1[0],
      ub1[1],
      s1[0],
      s1[1],
      ub1[0],
      ub1[1],
      screenSpacePointerPosition.x + vf2[0],
      -screenSpacePointerPosition.y + vf2[1],
      uf2[0],
      uf2[1],
      s2[0],
      s2[1],
      uf2[0],
      uf2[1],
      screenSpacePointerPosition.x + vb2[0],
      -screenSpacePointerPosition.y + vb2[1],
      ub2[0],
      ub2[1],
      s2[0],
      s2[1],
      ub2[0],
      ub2[1]
    );
  }

  return vertexData;
};

export default generateCursorVertices;
