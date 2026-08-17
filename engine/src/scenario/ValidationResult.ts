export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function createValidationResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [] };
}
