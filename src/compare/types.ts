export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type DifferenceType =
  | 'changed'
  | 'missing-in-local'
  | 'missing-in-uat'
  | 'added'
  | 'removed'
  | 'type-mismatch'
  | 'array-order-mismatch'
  | 'duplicate-array-key'
  | 'missing-array-key';

export interface Difference {
  path: string;
  local: JsonValue | undefined;
  uat: JsonValue | undefined;
  type: DifferenceType;
  localType: string;
  uatType: string;
  reason?: string;
}

export interface CompareOptions {
  fields?: string[];
  ignoreFields?: string[];
  ignoreTime?: boolean;
  keysOnly?: boolean;
  timeFields?: string[];
  arrayKeys?: Array<{ path: string; key: string }>;
}

export interface Summary {
  equal: boolean;
  totalDifferences: number;
  valuesChanged: number;
  missingFields: number;
  itemsAdded: number;
  itemsRemoved: number;
  typeMismatches: number;
}

export interface ComparisonResult {
  equal: boolean;
  summary: Summary;
  differences: Difference[];
  settings: {
    fields: string[];
    ignoreFields: string[];
    ignoreTime: boolean;
    keysOnly: boolean;
    timeFields: string[];
    arrayKeys: Array<{ path: string; key: string }>;
  };
}
