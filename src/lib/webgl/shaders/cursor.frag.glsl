#version 300 es

in highp vec2 vUv;
in highp vec2 vVelocity;

uniform sampler2D radialMask;

layout(location = 0) out mediump vec4 color;

void main() {

  mediump vec3 texel = texture(radialMask, vUv).rgb;

  mediump float alpha = texel.b;

  if (alpha < 0.05) {
    discard;
  }

  color = vec4(
      // Mix between velocity and neutral based on alpha
      mix(vec2(0.5, 0.5), mix(vVelocity, texel.rg, 0.05), alpha), 0.0, 1.0);
}