#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 velocity;
layout(location = 2) in vec2 origin;
layout(location = 3) in float alpha;

uniform float deltaTime;
uniform float time;
uniform sampler2D accelerationVectorMap;
uniform vec2 canvasSize;

out vec2 outPosition;
out vec2 outVelocity;
out vec2 outOrigin;
out float outAlpha;

const float RETURN_ACCELERATION = 8000.f;
const float PERP_DECELERATION_FACTOR = 4000.f;

void main() {

  // Vector torwards origin of particle
  vec2 originVector = origin - position;
  // Distance to origin
  float originVectorLength = length(originVector);
  // Direction towards origin
  vec2 originDirection = originVector / originVectorLength;

  if (originVectorLength <= 0.0001f) {
    // Particle is close enough to origin to consider it returned
    originDirection = vec2(0.f, 0.f);
  }

  // Vector perpendicular to origin direction vector (sideways vector)
  vec2 originPerpVector = vec2(-originDirection.y, originDirection.x);

  // Perpendicular speed (sideways speed)
  float perpSpeed = dot(originPerpVector, velocity);

  // Speed towards origin
  float originSpeed = dot(originDirection, velocity);

  // Total speed
  float speed = length(velocity);

  // Perpendicular deceleration (sideways damping)
  vec2 perpDeceleration = vec2(0.f, 0.f);

  if (speed > 0.f) {
    perpDeceleration =
        originPerpVector * PERP_DECELERATION_FACTOR * (perpSpeed / speed);
  }

  // Particle acceleration (return acceleration + sideways deceleration)
  vec2 acceleration = originDirection * RETURN_ACCELERATION - perpDeceleration;

  vec2 tempPosition =
      position + velocity * deltaTime + acceleration * deltaTime * deltaTime;

  vec2 uv = ((tempPosition / canvasSize) + vec2(0.5f, 0.5f));

  // Boost amount (user input)
  vec2 boost = (texture(accelerationVectorMap, uv).rg - vec2(0.5, 0.5)) *
               8000.f * vec2(1.0, -1.0);

  vec2 tempVelocity;

  if (length(boost) < 30.f) {
    tempVelocity = (velocity + acceleration * deltaTime);
  } else {
    tempVelocity = boost + vec2(sin(origin.x * 0.0548f + time * 1.625) +
                                    cos(origin.y * 0.092f + time * 0.863),
                                cos(origin.y * 0.0421f + time * 1.211) +
                                    sin(origin.y * 0.082f + time * 0.54)) *
                               500.0f;
  }

  if (originVectorLength < speed * deltaTime + 10.f && originSpeed > 0.0f) {
    tempPosition = origin;
    tempVelocity = vec2(0.f, 0.f);
  }

  outPosition = tempPosition;
  outVelocity = tempVelocity;
  outOrigin = origin;
  outAlpha = alpha;
}