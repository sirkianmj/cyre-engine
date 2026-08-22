export function request(): never {
  throw new Error('node:https request is not available in the browser');
}

export default { request };
