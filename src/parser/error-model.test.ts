import { describe, it, expect } from 'vitest';
import {
  createUnsupportedFeature,
  createInvalidInput,
  createDiagnostic,
  hasIssues,
  UnsupportedFeature,
  InvalidInput,
  Diagnostic,
} from './error-model.js';

describe('error-model', () => {
  describe('createUnsupportedFeature', () => {
    it('should create UnsupportedFeature with feature only', () => {
      const result = createUnsupportedFeature('NotAction');
      expect(result).toEqual({
        feature: 'NotAction',
      } satisfies UnsupportedFeature);
    });

    it('should create UnsupportedFeature with detail', () => {
      const result = createUnsupportedFeature('NumericEquals', 'Comparison operators not supported in phase 1');
      expect(result).toEqual({
        feature: 'NumericEquals',
        detail: 'Comparison operators not supported in phase 1',
      } satisfies UnsupportedFeature);
    });
  });

  describe('createInvalidInput', () => {
    it('should create InvalidInput without path', () => {
      const result = createInvalidInput('INVALID_JSON', 'Unable to parse JSON');
      expect(result).toEqual({
        code: 'INVALID_JSON',
        message: 'Unable to parse JSON',
      } satisfies InvalidInput);
    });

    it('should create InvalidInput with path', () => {
      const result = createInvalidInput('MISSING_FIELD', 'Required field is missing', 'Policy.Statement[0].Effect');
      expect(result).toEqual({
        code: 'MISSING_FIELD',
        message: 'Required field is missing',
        path: 'Policy.Statement[0].Effect',
      } satisfies InvalidInput);
    });
  });

  describe('createDiagnostic', () => {
    it('should create empty Diagnostic when no issues', () => {
      const result = createDiagnostic();
      expect(result).toEqual({
        hasInvalid: false,
        invalidInputs: [],
        hasUnsupported: false,
        unsupportedFeatures: [],
      } satisfies Diagnostic);
    });

    it('should create Diagnostic with invalid inputs only', () => {
      const invalidInputs: readonly InvalidInput[] = [
        createInvalidInput('INVALID_JSON', 'Unable to parse JSON'),
      ];
      const result = createDiagnostic(invalidInputs);
      expect(result).toEqual({
        hasInvalid: true,
        invalidInputs,
        hasUnsupported: false,
        unsupportedFeatures: [],
      } satisfies Diagnostic);
    });

    it('should create Diagnostic with unsupported features only', () => {
      const unsupportedFeatures: readonly UnsupportedFeature[] = [
        createUnsupportedFeature('NotAction'),
      ];
      const result = createDiagnostic([], unsupportedFeatures);
      expect(result).toEqual({
        hasInvalid: false,
        invalidInputs: [],
        hasUnsupported: true,
        unsupportedFeatures,
      } satisfies Diagnostic);
    });

    it('should create Diagnostic with both invalid inputs and unsupported features', () => {
      const invalidInputs: readonly InvalidInput[] = [
        createInvalidInput('MISSING_FIELD', 'Required field is missing'),
      ];
      const unsupportedFeatures: readonly UnsupportedFeature[] = [
        createUnsupportedFeature('NumericEquals', 'Not supported'),
      ];
      const result = createDiagnostic(invalidInputs, unsupportedFeatures);
      expect(result).toEqual({
        hasInvalid: true,
        invalidInputs,
        hasUnsupported: true,
        unsupportedFeatures,
      } satisfies Diagnostic);
    });
  });

  describe('hasIssues', () => {
    it('should return false for empty Diagnostic', () => {
      const diagnostic = createDiagnostic();
      expect(hasIssues(diagnostic)).toBe(false);
    });

    it('should return true when has invalid inputs', () => {
      const diagnostic = createDiagnostic([
        createInvalidInput('INVALID_JSON', 'Unable to parse JSON'),
      ]);
      expect(hasIssues(diagnostic)).toBe(true);
    });

    it('should return true when has unsupported features', () => {
      const diagnostic = createDiagnostic([], [
        createUnsupportedFeature('NotAction'),
      ]);
      expect(hasIssues(diagnostic)).toBe(true);
    });
  });
});
