import { vec2 } from "gl-matrix";

export const debounce = (func: () => unknown, timeout = 300) => {
  let timer: NodeJS.Timeout;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(func, timeout);
  };
};

export const resetUrlHash = () => {
  history.replaceState(null, "", " ");
};

export const getImageDataFromUrl = async (url: string, maxSize: number) => {
  const image = new Image();

  image.crossOrigin = "anonymous";
  image.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
    });
  } catch (error) {
    return undefined;
  }

  const imageScale =
    maxSize / Math.max(Math.max(image.width, image.height), maxSize);

  const scaledSize = [image.width * imageScale, image.height * imageScale];

  const canvas = new OffscreenCanvas(scaledSize[0], scaledSize[1]);
  const context = canvas.getContext("2d");

  if (!context) {
    // TODO: Handle
    return;
  }

  context.drawImage(image, 0, 0, scaledSize[0], scaledSize[1]);
  return context.getImageData(0, 0, scaledSize[0], scaledSize[1]);
};

export const createRotatedRect = (rotatedXAxis: vec2, rotatedYAxis: vec2) => {
  return [
    vec2.fromValues(
      rotatedXAxis[0] - rotatedYAxis[0],
      rotatedXAxis[1] - rotatedYAxis[1]
    ),

    vec2.fromValues(
      rotatedXAxis[0] + rotatedYAxis[0],
      rotatedXAxis[1] + rotatedYAxis[1]
    ),
    vec2.fromValues(
      -rotatedXAxis[0] - rotatedYAxis[0],
      -rotatedXAxis[1] - rotatedYAxis[1]
    ),
    vec2.fromValues(
      -rotatedXAxis[0] + rotatedYAxis[0],
      -rotatedXAxis[1] + rotatedYAxis[1]
    ),
  ];
};
