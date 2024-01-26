#version 300 es

in mediump float vAlpha;

layout(location = 0) out mediump vec4 color;

void main() { color = vec4(1.0, 1.0, 1.0, vAlpha); }