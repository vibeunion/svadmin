import { defineConfig } from '@playwright/test';
import permissionConfig from './playwright.permission-matrix.config';

export default defineConfig({
  ...permissionConfig,
  testMatch: 'file-list.spec.ts',
  grep: /FileList/,
});
