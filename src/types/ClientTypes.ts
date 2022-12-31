export type Country =
  | 'FR'
  | 'BE'
  | 'EN'
  | 'BG'
  | 'DE'
  | 'DK'
  | 'ES'
  | 'HR'
  | 'IT'
  | 'NO'
  | 'PL'
  | 'PT'
  | 'SE'
  | 'SL'
  | 'SR'
  | 'TR'
  | 'US'
  | 'AR';

export type Methods = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

export type Versions = 'v1' | 'v2';

export interface ClientOptions {
  accessToken?: string;
  refreshToken?: string;
  countryCode?: Country;
  clientId?: string;
  clientSecret?: string;
}

export interface RequestOptions {
  versions?: Versions;
  headers?: Record<string, string>;
  method?: Methods;
  params?: Record<string, any>;
  body?: Record<string, string | boolean | number | (string | boolean | number)[]>;
}
