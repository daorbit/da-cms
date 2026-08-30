export interface ApiError {
  error: string;
  message: string;
}

export type FieldType = 'text' | 'richtext' | 'number' | 'boolean' | 'date' | 'image';

export interface CollectionField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}
