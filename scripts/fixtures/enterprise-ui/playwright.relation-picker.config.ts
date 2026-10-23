import { defineConfig } from '@playwright/test';
import permissionConfig from './playwright.permission-matrix.config';

export default defineConfig({
  ...permissionConfig,
  testMatch: 'relation-picker.spec.ts',
  grep: /RelationPicker/,
});
