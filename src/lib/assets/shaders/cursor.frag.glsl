#version 300 es

in highp vec2 vUv;
in highp float vVelocityWeight;

uniform highp vec2 canvasSize;
uniform highp vec2 velocity;
uniform highp float cursorSize;
uniform highp float vectorScale;

uniform sampler2D radialMask;

layout(location = 0) out highp vec4 color;

void main() {

  highp vec3 texel = texture(radialMask, vUv).rgb;

  mediump float alpha = texel.b;

  if (alpha < 0.03) {
    discard;
  }

  highp vec2 absoluteStationaryOffset =
      (texel.rg - vec2(0.5, 0.5)) * cursorSize * 0.5;

  highp vec2 test2 =
      vec2(0.5, 0.5) + (absoluteStationaryOffset +
                        vVelocityWeight * vec2(velocity.x, velocity.y)) /
                           vectorScale;

  // highp vec2 test3 =
  //     (vVelocityWeight * 0.5f * vec2(velocity.x, velocity.y)) / vectorScale +
  //     vec2(0.5, 0.5);

  color = vec4(test2.rg, 0.0, 1.0);

  // color = vec4(test3, 0.0, 1.0);

  // color = vec4(0.0, 0.5, 0.0, 1.0);

  // color = vec4(0.0, 0.5, 0.0, 1.0);

  // color = vec4(texel.rg, 0.0, 1.0);

  // color = vec4(mix(vec2(1.0, 0.0), vec2(0.0, 1.0), vVelocity.x), 0.0, 1.0);

  // color = vec4(vUv, 0.0, 1.0);

  // color = vec4(
  //     // Mix between velocity and neutral based on alpha
  //     // mix(vec2(0.5, 0.5), mix(vVelocity, texel.rg, 0.05), alpha),
  //     0.0, 1.0);
  //     // mix(vec2(0.5, 0.5), texel.rg, alpha), 0.0, 1.0);
  //     // mix(vec2(0.5, 0.5), canvasSpaceOffset, alpha), 0.0, 1.0);

  //     mix(vec2(0.5, 0.5), test, alpha), 0.0, 1.0);

  // color = vec4(clamp((velocity.rg / canvasSize) + vec2(0.5, 0.5), 0.0, 1.0),
  //              0.0, 1.0);
}