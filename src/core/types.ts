// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type AuthMode = 'apiKey' | 'sessionKey';

export interface RSConfig {
  /** Base URL of the ResourceSpace API endpoint, e.g. "https://dam.example.com/api/" */
  baseUrl: string;
  /** API user or username */
  user: string;
  /** API key or session key */
  secret: string;
  /** Authentication mode */
  authMode: AuthMode;
  /** Internal URL for Docker networking (optional, avoids hairpin NAT) */
  internalUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Max batch operation size (default: 100) */
  maxBatchSize?: number;
  /**
   * Usergroup ID to assign when creating users.
   * This is a security control — it is NEVER accepted from caller input.
   */
  signupUsergroup?: number;
  /** Optional logger — if omitted, logging is silent */
  logger?: RSLogger;
}

// ---------------------------------------------------------------------------
// Logger (pluggable — consumers bring their own)
// ---------------------------------------------------------------------------

export interface RSLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, error?: unknown, data?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

export interface Resource {
  ref: number;
  resource_type: number;
  has_image: number;
  is_transcoding: number;
  image_red: number;
  image_green: number;
  image_blue: number;
  thumb_width: number;
  thumb_height: number;
  file_modified: string;
  file_checksum: string;
  file_extension: string;
  preview_extension: string;
  creation_date: string;
  rating: number | null;
  user_rating: number | null;
  user_rating_count: number | null;
  user_rating_total: number | null;
  access: number;
  /** Dynamic field values populated via data_joins */
  [key: `field${number}`]: string | undefined;
  [key: string]: unknown;
}

export interface SearchResult {
  resources: Resource[];
  /** Number of resources returned in this page (NOT the server-side total). */
  count: number;
  offset: number;
}

export interface ResourceFieldData {
  ref: number;
  resource_type_field: number;
  name: string;
  title: string;
  value: string;
  type: number;
  [key: string]: unknown;
}

export interface Collection {
  ref: number;
  name: string;
  user: number;
  created: string;
  public: number;
  allow_changes: number;
  cant_delete: number;
  keywords: string;
  savedsearch: number | null;
  home_page_publish: number;
  home_page_text: string;
  home_page_image: number | null;
  session_id: number | null;
  order_by?: number;
  parent?: number | null;
  has_resources?: number | boolean;
  has_children?: number | boolean;
  [key: string]: unknown;
}

export interface User {
  ref: number;
  username: string;
  email: string;
  fullname: string;
  usergroup: number;
  comments?: string;
  approved?: number;
  [key: string]: unknown;
}

export interface FieldDefinition {
  ref: number;
  name: string;
  title: string;
  type: number;
  resource_type?: number;
  [key: string]: unknown;
}

export interface FieldOption {
  ref: number;
  name: string;
  parent?: number;
  order_by?: number;
}

export interface Node {
  ref: number;
  resource_type_field: number;
  name: string;
  parent: number | null;
  order_by: number;
  [key: string]: unknown;
}

export interface ResourceType {
  ref: number;
  name: string;
  [key: string]: unknown;
}

export interface SystemStatus {
  [key: string]: unknown;
}

export interface AlternativeFile {
  ref: number;
  resource: number;
  name: string;
  description: string;
  file_name: string;
  file_extension: string;
  file_size: number;
  creation_date: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Request/param types
// ---------------------------------------------------------------------------

export interface SearchOptions {
  orderBy?: string;
  sort?: 'ASC' | 'DESC';
  offset?: number;
  limit?: number;
  resourceTypes?: string;
  archive?: number;
  dataJoins?: number[];
}

export interface ResourcePathOptions {
  /** Size variant (e.g. 'scr', 'pre', 'thm', '' for original). Default: 'pre' */
  size?: string;
  /** File extension for the preview. Omit to use RS default ('jpg'). */
  extension?: string;
  /** Page number for multi-page documents. Omit to use RS default (1). */
  page?: number;
  /** Return a watermarked version. Default: false */
  watermarked?: boolean;
  /** Generate the preview if it doesn't exist on disk. Default: true */
  createIfMissing?: boolean;
}

/** Fields allowed in save_user — security enforced */
export interface UserUpdateData {
  fullname?: string;
  email?: string;
  password?: string;
  comments?: string;
}

export interface CreateUserParams {
  username: string;
  email: string;
  fullname?: string;
  password?: string;
}

export interface CreateCollectionParams {
  name: string;
}
