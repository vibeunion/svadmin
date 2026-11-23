# @svadmin/sso

OIDC/OAuth2 SSO AuthProvider plugin for svadmin — supports Okta, Azure AD, Cognito, Keycloak, Google

## Install

```bash
bun add @svadmin/sso
```

## Usage

```ts
import { createGoogleAuth, createSSOAuthProvider } from '@svadmin/sso';

// Preset for a common identity provider
const google = createGoogleAuth('client-id', {
  redirectUri: 'https://app.example.com/auth/callback',
});

// Or configure any OIDC provider directly
const authProvider = createSSOAuthProvider({
  issuer: 'https://idp.example.com',
  clientId: 'admin-console',
  redirectUri: 'https://app.example.com/auth/callback',
});
```

OIDC/OAuth2 SSO with PKCE, token refresh, session storage, and presets for Google, Microsoft, GitHub, GitLab, Keycloak, Auth0, and Supauth.

Documentation: https://svadmin.nestjs.cn

License: MIT
