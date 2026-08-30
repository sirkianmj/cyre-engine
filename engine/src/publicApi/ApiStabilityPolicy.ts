export type SemanticVersionTriple = {
  major: number;
  minor: number;
  patch: number;
};

export function parseSemanticVersion(version: string): SemanticVersionTriple {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    throw new Error(`Invalid semantic version "${version}".`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export class ApiStabilityPolicy {
  static isBackwardCompatible(
    oldVersion: string,
    newVersion: string,
  ): boolean {
    const oldVersionTriple = parseSemanticVersion(oldVersion);
    const newVersionTriple = parseSemanticVersion(newVersion);

    if (newVersionTriple.major !== oldVersionTriple.major) {
      return false;
    }

    if (newVersionTriple.minor < oldVersionTriple.minor) {
      return false;
    }

    if (
      newVersionTriple.minor === oldVersionTriple.minor &&
      newVersionTriple.patch < oldVersionTriple.patch
    ) {
      return false;
    }

    return true;
  }

  static assertBackwardCompatible(
    oldVersion: string,
    newVersion: string,
  ): void {
    if (!ApiStabilityPolicy.isBackwardCompatible(oldVersion, newVersion)) {
      throw new Error(
        `API version ${newVersion} is not backward compatible with ${oldVersion}.`,
      );
    }
  }
}
