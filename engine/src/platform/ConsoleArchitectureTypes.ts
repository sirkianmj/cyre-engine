export const CONSOLE_FAMILIES = [
  'playstation',
  'xbox',
  'nintendo',
  'generic',
] as const;

export type ConsoleFamily = (typeof CONSOLE_FAMILIES)[number];

export function isConsoleFamily(value: string): value is ConsoleFamily {
  return (CONSOLE_FAMILIES as readonly string[]).includes(value);
}

export const CONSOLE_RENDERING_ABSTRACTIONS = [
  '2d',
  '2.5d',
  '3d',
] as const;

export type ConsoleRenderingAbstraction =
  (typeof CONSOLE_RENDERING_ABSTRACTIONS)[number];

export function isConsoleRenderingAbstraction(
  value: string,
): value is ConsoleRenderingAbstraction {
  return (CONSOLE_RENDERING_ABSTRACTIONS as readonly string[]).includes(value);
}

export const CONSOLE_INPUT_ABSTRACTIONS = [
  'gamepad',
  'controller',
] as const;

export type ConsoleInputAbstraction =
  (typeof CONSOLE_INPUT_ABSTRACTIONS)[number];

export function isConsoleInputAbstraction(
  value: string,
): value is ConsoleInputAbstraction {
  return (CONSOLE_INPUT_ABSTRACTIONS as readonly string[]).includes(value);
}

export const CONSOLE_SAVE_SYSTEMS = [
  'memory',
  'persistent',
  'cloud-save',
] as const;

export type ConsoleSaveSystem = (typeof CONSOLE_SAVE_SYSTEMS)[number];

export function isConsoleSaveSystem(value: string): value is ConsoleSaveSystem {
  return (CONSOLE_SAVE_SYSTEMS as readonly string[]).includes(value);
}

export const CONSOLE_SERVICES = [
  'authentication',
  'storage',
  'achievements',
  'leaderboards',
  'matchmaking',
  'cloud-save',
  'notifications',
  'telemetry',
] as const;

export type ConsoleService = (typeof CONSOLE_SERVICES)[number];

export function isConsoleService(value: string): value is ConsoleService {
  return (CONSOLE_SERVICES as readonly string[]).includes(value);
}
