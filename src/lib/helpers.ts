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

export const getImageDataFromUrl = async (
  url: string,
  width: number,
  height: number
) => {
  const image = new Image();

  image.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = reject;
    });
  } catch (error) {
    return undefined;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    // TODO: Handle
    return;
  }

  canvas.width = width;
  canvas.height = height;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
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
