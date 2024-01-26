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
  image.width = width;
  image.height = height;

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

  const logoScale = 0.5;

  canvas.width = image.width * logoScale;
  canvas.height = image.height * logoScale;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return context.getImageData(0, 0, canvas.width, canvas.height);
};
