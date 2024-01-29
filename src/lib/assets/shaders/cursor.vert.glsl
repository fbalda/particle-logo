#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 uv;
layout(location = 2) in vec2 velocity;

out highp vec2 vUv;
out highp vec2 vVelocity;
out highp vec2 vDirection;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
  vVelocity = velocity;
}