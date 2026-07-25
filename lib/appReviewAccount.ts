/**
 * Apple App Review / manual QA login.
 * Give reviewers the email + password below in App Store Connect.
 */
export const APP_REVIEW_ACCOUNT = {
  email: 'test@gmail.com',
  displayName: 'Test',
  password: 'test12',
} as const;

/** Copy-paste block for App Store Connect → App Review Information. */
export const APP_REVIEW_SIGN_IN_NOTES = `Sign in with:
Email: ${APP_REVIEW_ACCOUNT.email}
Password: ${APP_REVIEW_ACCOUNT.password}

Display name: ${APP_REVIEW_ACCOUNT.displayName}`;
