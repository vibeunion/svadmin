import { defineConfig } from '@playwright/test';
import permissionConfig from './playwright.permission-matrix.config';

export default defineConfig({
  ...permissionConfig,
  testMatch: 'import-dropzone.spec.ts',
  grep: /ImportDropzone/,
});
