#version 300 es

layout(location = 0) in vec2 position;
layout(location = 3) in float alpha;

uniform vec2 canvasSize;

out float vAlpha;

void main() {
  gl_Position = vec4((position + 1.0) / (canvasSize * 0.5f), 0.0, 1.0);

  vAlpha = alpha;
  gl_PointSize = 1.0;
}