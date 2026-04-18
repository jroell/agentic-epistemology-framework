/**
 * Lightweight JSON-schema types used for Tool parameterSchema definitions.
 *
 * Replaces the SchemaType enum previously imported from @google/generative-ai
 * so the framework stays provider-agnostic.
 */
export const SchemaType = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
} as const;

export type SchemaTypeValue = (typeof SchemaType)[keyof typeof SchemaType];
