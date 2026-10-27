export interface License {
  id: number;
  key: string;
  product: string;
  description: string | null;
  expires_on: string | null;
}
