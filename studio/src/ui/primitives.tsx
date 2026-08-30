/**
 * primitives
 * -----------
 * The shared control set for CYRE Studio windows. Every control is styled by
 * the design system tokens, supports keyboard focus, and reports a stable
 * `data-testid` so the Playwright suite can address it.
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icon } from './Icons';
import type { IconName } from './Icons';

/* ------------------------------------------------------------------ Button */

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  active?: boolean;
  testId?: string;
}

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  active = false,
  testId,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="cyre-btn"
      data-variant={variant}
      data-size={size}
      data-active={active || undefined}
      data-testid={testId}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 14} /> : null}
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- IconButton */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  testId?: string;
  active?: boolean;
}

export function IconButton({ icon, testId, active = false, ...rest }: IconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="cyre-icon-btn"
      data-active={active || undefined}
      data-testid={testId}
      {...rest}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

/* --------------------------------------------------------------- Segmented */

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  testId?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: ReadonlyArray<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  testId?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  testId,
}: SegmentedProps<T>): JSX.Element {
  return (
    <div className="cyre-segmented" role="group" aria-label={ariaLabel} data-testid={testId}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={value === option.value || undefined}
          aria-pressed={value === option.value}
          data-testid={option.testId}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Fields */

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps): JSX.Element {
  return (
    <label className="cyre-field">
      <span className="cyre-field-label">{label}</span>
      {children}
      {hint ? <span className="cyre-field-hint">{hint}</span> : null}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  invalid?: boolean;
  testId?: string;
  disabled?: boolean;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number;
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  invalid = false,
  testId,
  disabled = false,
  type = 'text',
  min,
  max,
  step,
}: TextFieldProps): JSX.Element {
  return (
    <Field label={label} hint={hint}>
      <input
        className="cyre-input"
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        data-invalid={invalid || undefined}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
  hint?: string;
  testId?: string;
  disabled?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
  testId,
  disabled = false,
}: SelectFieldProps): JSX.Element {
  return (
    <Field label={label} hint={hint}>
      <select
        className="cyre-select"
        value={value}
        disabled={disabled}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
  testId?: string;
  invalid?: boolean;
  spellCheck?: boolean;
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  rows = 8,
  testId,
  invalid = false,
  spellCheck = false,
}: TextAreaFieldProps): JSX.Element {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className="cyre-textarea"
        rows={rows}
        value={value}
        spellCheck={spellCheck}
        data-invalid={invalid || undefined}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
  disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, testId, disabled = false }: CheckboxProps): JSX.Element {
  return (
    <label className="cyre-checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        data-testid={testId}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  testId?: string;
}

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  testId,
}: RangeFieldProps): JSX.Element {
  return (
    <Field label={label} hint={format ? format(value) : undefined}>
      <input
        className="cyre-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testId}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

/* ------------------------------------------------------------ Presentation */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export function Badge({
  children,
  tone = 'neutral',
  testId,
}: {
  children: ReactNode;
  tone?: Tone;
  testId?: string;
}): JSX.Element {
  return (
    <span className="cyre-badge" data-tone={tone === 'neutral' ? undefined : tone} data-testid={testId}>
      {children}
    </span>
  );
}

export function Dot({ tone = 'neutral' }: { tone?: Tone }): JSX.Element {
  return <span className="cyre-dot" data-tone={tone === 'neutral' ? undefined : tone} />;
}

export function Stat({ label, value, testId }: { label: string; value: ReactNode; testId?: string }): JSX.Element {
  return (
    <div className="cyre-stat" data-testid={testId}>
      <span className="cyre-stat-label">{label}</span>
      <span className="cyre-stat-value">{value}</span>
    </div>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }): JSX.Element {
  return (
    <section className="cyre-section">
      <div className="cyre-row" data-between="true">
        <h3 className="cyre-section-title">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <header className="cyre-panel-header">
      <div>
        <h2 className="cyre-panel-title">{title}</h2>
        {subtitle ? <p className="cyre-panel-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="cyre-row">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'info',
  action,
  testId,
}: {
  title: string;
  body: string;
  icon?: IconName;
  action?: ReactNode;
  testId?: string;
}): JSX.Element {
  return (
    <div className="cyre-empty" data-testid={testId}>
      <Icon name={icon} size={20} />
      <span className="cyre-empty-title">{title}</span>
      <span className="cyre-empty-body">{body}</span>
      {action}
    </div>
  );
}

export function Banner({
  tone = 'info',
  children,
  testId,
}: {
  tone?: Tone;
  children: ReactNode;
  testId?: string;
}): JSX.Element {
  const iconName: IconName = tone === 'danger' ? 'alert' : tone === 'success' ? 'check' : 'info';
  return (
    <div className="cyre-banner" data-tone={tone === 'neutral' ? undefined : tone} role="status" data-testid={testId}>
      <Icon name={iconName} size={14} />
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }): JSX.Element {
  return (
    <span className="cyre-row" role="status">
      <span className="cyre-spinner" />
      {label ? <span className="cyre-list-meta">{label}</span> : null}
    </span>
  );
}

export function KeyValue({ entries }: { entries: ReadonlyArray<[string, ReactNode]> }): JSX.Element {
  return (
    <dl className="cyre-kv">
      {entries.map(([key, value]) => (
        <div key={key} style={{ display: 'contents' }}>
          <dt>{key}</dt>
          <dd>{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Progress({ value }: { value: number }): JSX.Element {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="cyre-progress" role="progressbar" aria-valuenow={Math.round(clamped)}>
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}
