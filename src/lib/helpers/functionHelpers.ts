export const debounce = (func: () => any, timeout = 300) => {
  let timer: NodeJS.Timeout;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(func, timeout);
  };
};
