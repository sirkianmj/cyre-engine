export function request(): never {
  throw new Error('node:http request is not available in the browser');
}

export function createServer(): never {
  throw new Error('node:http createServer is not available in the browser');
}

export default { request, createServer };
