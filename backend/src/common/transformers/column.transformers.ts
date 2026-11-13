import { ValueTransformer } from 'typeorm';

/** mysql2 returns DECIMAL columns as strings; convert them to numbers for the API. */
export const decimalToNumberTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null): number | null => (value === null ? null : Number(value)),
};
