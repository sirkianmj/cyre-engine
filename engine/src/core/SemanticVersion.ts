export interface SemanticVersionParts {
  major: number;
  minor: number;
  patch: number;
  preRelease: readonly string[];
  build: readonly string[];
}

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function isNonEmptyIdentifier(value: string): boolean {
  return value.length > 0;
}

function isValidPreReleaseIdentifier(value: string): boolean {
  if (!isNonEmptyIdentifier(value)) {
    return false;
  }

  // Numeric pre-release identifiers must not contain leading zeros.
  if (/^\d+$/.test(value)) {
    return !(value.length > 1 && value.startsWith('0'));
  }

  return true;
}

function isSafeNonNegativeInteger(value: string): boolean {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0;
}

function parseIdentifiers(value: string, label: 'pre-release' | 'build'): string[] {
  const identifiers = value.split('.');
  if (identifiers.some((identifier) => !isNonEmptyIdentifier(identifier))) {
    throw new Error(`Semantic version ${label} identifiers must not be empty.`);
  }

  if (label === 'pre-release') {
    for (const identifier of identifiers) {
      if (!isValidPreReleaseIdentifier(identifier)) {
        throw new Error(
          `Semantic version pre-release identifier "${identifier}" is invalid.`,
        );
      }
    }
  }

  return identifiers;
}

function comparePreReleaseIdentifiers(left: string, right: string): number {
  const leftIsNumeric = /^\d+$/.test(left);
  const rightIsNumeric = /^\d+$/.test(right);

  if (leftIsNumeric && rightIsNumeric) {
    return Number(left) - Number(right);
  }

  if (leftIsNumeric) {
    return -1;
  }

  if (rightIsNumeric) {
    return 1;
  }

  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function comparePreRelease(
  left: readonly string[],
  right: readonly string[],
): number {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }

  if (left.length === 0) {
    return 1;
  }

  if (right.length === 0) {
    return -1;
  }

  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftIdentifier = left[index];
    const rightIdentifier = right[index];

    if (leftIdentifier === undefined) {
      return -1;
    }

    if (rightIdentifier === undefined) {
      return 1;
    }

    const result = comparePreReleaseIdentifiers(
      leftIdentifier,
      rightIdentifier,
    );

    if (result !== 0) {
      return result;
    }
  }

  return 0;
}

export class SemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly preRelease: readonly string[];
  readonly build: readonly string[];

  private constructor(parts: SemanticVersionParts) {
    this.major = parts.major;
    this.minor = parts.minor;
    this.patch = parts.patch;
    this.preRelease = Object.freeze([...parts.preRelease]);
    this.build = Object.freeze([...parts.build]);
  }

  static parse(value: string): SemanticVersion {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Semantic version must be a non-empty string.');
    }

    const trimmed = value.trim();
    const match = SEMVER_PATTERN.exec(trimmed);

    if (!match) {
      throw new Error(`Invalid semantic version "${value}".`);
    }

    const [, majorValue, minorValue, patchValue, preReleaseValue, buildValue] = match;

    if (
      !isSafeNonNegativeInteger(majorValue) ||
      !isSafeNonNegativeInteger(minorValue) ||
      !isSafeNonNegativeInteger(patchValue)
    ) {
      throw new Error(`Semantic version components must be safe non-negative integers: "${value}".`);
    }

    return new SemanticVersion({
      major: Number(majorValue),
      minor: Number(minorValue),
      patch: Number(patchValue),
      preRelease: preReleaseValue ? parseIdentifiers(preReleaseValue, 'pre-release') : [],
      build: buildValue ? parseIdentifiers(buildValue, 'build') : [],
    });
  }

  static tryParse(value: string): SemanticVersion | null {
    try {
      return SemanticVersion.parse(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return SemanticVersion.tryParse(value) !== null;
  }

  static fromParts(parts: SemanticVersionParts): SemanticVersion {
    return new SemanticVersion(parts);
  }

  static compare(left: SemanticVersion | string, right: SemanticVersion | string): number {
    const a = typeof left === 'string' ? SemanticVersion.parse(left) : left;
    const b = typeof right === 'string' ? SemanticVersion.parse(right) : right;

    if (a.major !== b.major) {
      return a.major > b.major ? 1 : -1;
    }

    if (a.minor !== b.minor) {
      return a.minor > b.minor ? 1 : -1;
    }

    if (a.patch !== b.patch) {
      return a.patch > b.patch ? 1 : -1;
    }

    return comparePreRelease(a.preRelease, b.preRelease);
  }

  compareTo(other: SemanticVersion | string): number {
    return SemanticVersion.compare(this, other);
  }

  isGreaterThan(other: SemanticVersion | string): boolean {
    return this.compareTo(other) > 0;
  }

  isLessThan(other: SemanticVersion | string): boolean {
    return this.compareTo(other) < 0;
  }

  equals(other: SemanticVersion | string): boolean {
    const target = typeof other === 'string' ? SemanticVersion.parse(other) : other;

    if (
      this.major !== target.major ||
      this.minor !== target.minor ||
      this.patch !== target.patch
    ) {
      return false;
    }

    if (this.preRelease.length !== target.preRelease.length) {
      return false;
    }

    for (let index = 0; index < this.preRelease.length; index += 1) {
      if (this.preRelease[index] !== target.preRelease[index]) {
        return false;
      }
    }

    if (this.build.length !== target.build.length) {
      return false;
    }

    for (let index = 0; index < this.build.length; index += 1) {
      if (this.build[index] !== target.build[index]) {
        return false;
      }
    }

    return true;
  }

  isStable(): boolean {
    return this.preRelease.length === 0;
  }

  isPreRelease(): boolean {
    return !this.isStable();
  }

  nextMajor(): SemanticVersion {
    return new SemanticVersion({
      major: this.major + 1,
      minor: 0,
      patch: 0,
      preRelease: [],
      build: [],
    });
  }

  nextMinor(): SemanticVersion {
    return new SemanticVersion({
      major: this.major,
      minor: this.minor + 1,
      patch: 0,
      preRelease: [],
      build: [],
    });
  }

  nextPatch(): SemanticVersion {
    return new SemanticVersion({
      major: this.major,
      minor: this.minor,
      patch: this.patch + 1,
      preRelease: [],
      build: [],
    });
  }

  toString(): string {
    const base = `${this.major}.${this.minor}.${this.patch}`;

    let result = base;

    if (this.preRelease.length > 0) {
      result += `-${this.preRelease.join('.')}`;
    }

    if (this.build.length > 0) {
      result += `+${this.build.join('.')}`;
    }

    return result;
  }

  toJSON(): string {
    return this.toString();
  }
}
