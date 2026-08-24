export interface NetworkColumn<T extends object> {
  key: keyof T;
  label: string;
}
