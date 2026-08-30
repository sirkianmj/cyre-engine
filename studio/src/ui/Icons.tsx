/**
 * Icons
 * ------
 * A small, consistent inline SVG icon set drawn on a 16x16 grid with a
 * 1.4 stroke weight. No icon dependency, no font loading, no layout shift.
 */

export type IconName =
  | 'activity'
  | 'attack'
  | 'bolt'
  | 'box'
  | 'bug'
  | 'chart'
  | 'check'
  | 'clock'
  | 'code'
  | 'edit'
  | 'eye'
  | 'flask'
  | 'folder'
  | 'gauge'
  | 'graph'
  | 'grid'
  | 'info'
  | 'keyboard'
  | 'layout'
  | 'library'
  | 'list'
  | 'lock'
  | 'package'
  | 'play'
  | 'presentation'
  | 'replay'
  | 'search'
  | 'server'
  | 'shield'
  | 'sliders'
  | 'target'
  | 'terminal'
  | 'upload'
  | 'alert'
  | 'x'
  | 'minus'
  | 'maximize'
  | 'chevron'
  | 'plus'
  | 'trash'
  | 'download'
  | 'step-forward'
  | 'step-back'
  | 'stop'
  | 'pause'
  | 'restart'
  | 'cyre';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

const PATHS: Record<IconName, string> = {
  activity: 'M1.5 8.5h3l2-5 3 9 2-4h3',
  attack: 'M2 14 8 2l6 12-6-3-6 3Z',
  bolt: 'M9 1.5 3.5 9H8l-.5 5.5L13 7H8.5L9 1.5Z',
  box: 'M8 1.8 14 5v6l-6 3.2L2 11V5l6-3.2ZM2 5l6 3.2L14 5M8 8.2V14',
  bug: 'M5.5 5.2a2.5 2.5 0 0 1 5 0M4 8h8M4.4 11h7.2M6 5.5v6.8M10 5.5v6.8M2 7l2 .6M14 7l-2 .6M2 11l2-.6M14 11l-2-.6',
  chart: 'M2 13.5h12M4 11V7M7.5 11V4M11 11V8.5',
  check: 'M3 8.4 6.3 11.7 13 5',
  clock: 'M8 4.2V8l2.6 1.6M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z',
  code: 'M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5',
  edit: 'M11.2 2.6 13.4 4.8 5.6 12.6l-3 .8.8-3 7.8-7.8Z',
  eye: 'M1.6 8S4 3.8 8 3.8 14.4 8 14.4 8 12 12.2 8 12.2 1.6 8 1.6 8ZM8 9.6A1.6 1.6 0 1 0 8 6.4a1.6 1.6 0 0 0 0 3.2Z',
  flask: 'M6 1.8h4M6.8 1.8v4.4L3.4 12.4A1.4 1.4 0 0 0 4.6 14.4h6.8a1.4 1.4 0 0 0 1.2-2L9.2 6.2V1.8M4.6 10.4h6.8',
  folder: 'M1.8 4.2h4l1.4 1.8h7v7.4H1.8V4.2Z',
  gauge: 'M2.6 11.4a6 6 0 1 1 10.8 0M8 11.4 11 7',
  graph: 'M4 4.2a1.6 1.6 0 1 0 0-.1ZM12 4.2a1.6 1.6 0 1 0 0-.1ZM8 12.4a1.6 1.6 0 1 0 0-.1ZM5.4 5 7 10.8M10.6 5 9 10.8M5.6 4.2h4.8',
  grid: 'M2.2 2.2h4.6v4.6H2.2V2.2ZM9.2 2.2h4.6v4.6H9.2V2.2ZM2.2 9.2h4.6v4.6H2.2V9.2ZM9.2 9.2h4.6v4.6H9.2V9.2Z',
  info: 'M8 7.2v4.4M8 4.6h.01M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z',
  keyboard: 'M1.8 4.4h12.4v7.2H1.8V4.4ZM4.4 7h.01M6.8 7h.01M9.2 7h.01M11.6 7h.01M5.6 9.4h4.8',
  layout: 'M2 3.2h12v9.6H2V3.2ZM2 6.4h12M6.4 6.4v6.4',
  library: 'M2.6 2.6h3.2v10.8H2.6V2.6ZM7.4 2.6h3.2v10.8H7.4V2.6ZM12.2 3.4l1 10.2',
  list: 'M2.4 4.4h11.2M2.4 8h11.2M2.4 11.6h7.2',
  lock: 'M4.6 7.2V5.4a3.4 3.4 0 0 1 6.8 0v1.8M3.4 7.2h9.2v6.2H3.4V7.2Z',
  package: 'M8 1.8 14 4.6v6.8L8 14.2 2 11.4V4.6L8 1.8ZM2 4.6 8 7.4l6-2.8M8 7.4v6.8',
  play: 'M4.4 2.8 12.6 8l-8.2 5.2V2.8Z',
  presentation: 'M2 3h12v7.4H2V3ZM8 10.4V13.4M5.4 13.4h5.2',
  replay: 'M13.4 8a5.4 5.4 0 1 1-1.8-4M13.6 2.2v3.2h-3.2',
  search: 'M7 11.4A4.4 4.4 0 1 0 7 2.6a4.4 4.4 0 0 0 0 8.8ZM10.2 10.2 13.8 13.8',
  server: 'M2.2 3h11.6v4H2.2V3ZM2.2 9h11.6v4H2.2V9ZM4.6 5h.01M4.6 11h.01',
  shield: 'M8 1.8 13.2 4v4.2c0 3-2.2 5.2-5.2 6.2-3-1-5.2-3.2-5.2-6.2V4L8 1.8Z',
  sliders: 'M2.6 5h10.8M2.6 11h10.8M6 3.4v3.2M10.4 9.4v3.2',
  target: 'M8 12.6A4.6 4.6 0 1 0 8 3.4a4.6 4.6 0 0 0 0 9.2ZM8 9.8A1.8 1.8 0 1 0 8 6.2a1.8 1.8 0 0 0 0 3.6Z',
  terminal: 'M2.4 3.2h11.2v9.6H2.4V3.2ZM5 6.4 6.8 8 5 9.6M8.6 10h3',
  upload: 'M8 11V3.2M5 6 8 3l3 3M2.6 12.8h10.8',
  alert: 'M8 5.4v3.4M8 11h.01M8 2.2 14.4 13.4H1.6L8 2.2Z',
  x: 'M4 4l8 8M12 4l-8 8',
  minus: 'M4 8h8',
  maximize: 'M5.6 2.6H2.6v3M10.4 2.6h3v3M10.4 13.4h3v-3M5.6 13.4h-3v-3',
  chevron: 'M6 3.6 10.4 8 6 12.4',
  plus: 'M8 3.6v8.8M3.6 8h8.8',
  trash: 'M3 4.6h10M6.4 4.6V3h3.2v1.6M4.4 4.6l.6 8.4h6l.6-8.4',
  download: 'M8 3v8M5 8.2 8 11.2l3-3M2.6 13h10.8',
  'step-forward': 'M4 3.4 9.6 8 4 12.6V3.4ZM11.4 3.4v9.2',
  'step-back': 'M12 3.4 6.4 8 12 12.6V3.4ZM4.6 3.4v9.2',
  stop: 'M4 4h8v8H4V4Z',
  pause: 'M5.4 3.6v8.8M10.6 3.6v8.8',
  restart: 'M13.2 8a5.2 5.2 0 1 1-1.6-3.8M13.4 2.4v3.2h-3.2',
  cyre: 'M8 1.6 14 5v6l-6 3.4L2 11V5l6-3.4ZM8 5.4 10.8 7 8 8.6 5.2 7 8 5.4Z',
};

export function Icon({ name, size = 14, className }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
