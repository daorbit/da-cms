export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export type FieldType = 'text' | 'richtext' | 'number' | 'boolean' | 'date' | 'image';

export interface CollectionField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  fields: CollectionField[];
}

export type ContentStatus = 'draft' | 'published';

export interface Content {
  id: string;
  data: Record<string, unknown>;
  status: ContentStatus;
  createdAt?: string;
  updatedAt?: string;
}
