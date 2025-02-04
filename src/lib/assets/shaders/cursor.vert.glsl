#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 uv;
layout(location = 2) in float velocityWeight;

out highp vec2 vUv;
out highp float vVelocityWeight;
// out highp vec2 vDirection;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
  vVelocityWeight = velocityWeight;
  // vVelocity = velocity;
}