![Screenshot](/screenshot.png?raw=true "Screenshot")

# Particle Logo

Small system for rendering logos (or any other type of image) as a collection of particles that can be manipulated with the pointer. Made with WebGL and Svelte.
[Try it out](https://fbalda.github.io/particle-logo)

## How it works

The program uses transform feedback to simulate the particles on the GPU with shaders ([more information here](https://developer.mozilla.org/en-US/docs/Web/API/WebGLTransformFeedback)). This makes it much for efficient than simulating them on the CPU for high particle counts.
A shape of force vectors are drawn onto a framebuffer at the position of the cursor every frame. The texture of that framebuffer is then sampled in the simulation shader to check if/where the particles should be pushed.
Every particle holds information about its origin (its position in the logo), alpha as well as its current position and velocity. Its position, velocity and origin are used to calculate the acceleration back to the origin.
A URI-encoded image URL can be added as a value for the `logo_url` parameter in the URL hash to change the rendered image (append `#logo_url=YOUR_URI_ENCODED_URL` to the base URL).
Currently only the image alpha is respected and all color is converted to white, meaning images without alpha information will just result in a white square. Also the SVG needs to have a width and height parameter to work on Firefox Mobile (Android) due to a bug.

## TODO

- UI for choosing image
- Color support
