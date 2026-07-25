/**
 * EAS Build hook — bump user-facing version from the next remote build number.
 * Runs via eas-build-pre-install (before npm install / expo prebuild).
 *
 * Maps buildVersion N → semver patch N-1 under the current major.minor, e.g.
 * versionCode 1 → 1.0.0, versionCode 2 → 1.0.1, versionCode 3 → 1.0.2
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const APP_ID = '94eefcf2-2928-402e-9ebd-ca8b46e26453';
const APPLICATION_IDENTIFIER = 'com.cookmapz.app';

const LATEST_VERSION_QUERY = `
  query LatestAppVersion($appId: String!, $platform: AppPlatform!, $applicationIdentifier: String!) {
    app {
      byId(appId: $appId) {
        latestAppVersionByPlatformAndApplicationIdentifier(
          platform: $platform
          applicationIdentifier: $applicationIdentifier
        ) {
          buildVersion
        }
      }
    }
  }
`;

async function fetchNextBuildVersion(platform) {
  const token = process.env.EXPO_TOKEN;
  if (!token) {
    console.warn('[eas-sync-app-version] EXPO_TOKEN missing, skipping version bump');
    return null;
  }

  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: LATEST_VERSION_QUERY,
      variables: {
        appId: process.env.EAS_BUILD_PROJECT_ID ?? APP_ID,
        platform: platform === 'android' ? 'ANDROID' : 'IOS',
        applicationIdentifier: APPLICATION_IDENTIFIER,
      },
    }),
  });

  if (!res.ok) {
    console.warn(`[eas-sync-app-version] Expo API ${res.status}, skipping version bump`);
    return null;
  }

  const payload = await res.json();
  return (
    payload?.data?.app?.byId?.latestAppVersionByPlatformAndApplicationIdentifier?.buildVersion ??
    null
  );
}

function resolveUserFacingVersion(currentVersion, buildVersion) {
  const buildNum = Number(buildVersion);
  if (!Number.isFinite(buildNum) || buildNum < 1) return null;

  const match = /^(\d+\.\d+)\.\d+$/.exec(currentVersion);
  const majorMinor = match?.[1] ?? '1.0';
  return `${majorMinor}.${Math.max(0, buildNum - 1)}`;
}

async function main() {
  if (process.env.EAS_BUILD !== 'true') return;

  const platform = process.env.EAS_BUILD_PLATFORM;
  if (platform !== 'android' && platform !== 'ios') {
    console.log('[eas-sync-app-version] Unknown platform, skipping');
    return;
  }

  const buildVersion = await fetchNextBuildVersion(platform);
  if (!buildVersion) return;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const nextVersion = resolveUserFacingVersion(pkg.version, buildVersion);
  if (!nextVersion) {
    console.warn('[eas-sync-app-version] Could not derive version from build number');
    return;
  }

  if (pkg.version === nextVersion) {
    console.log(`[eas-sync-app-version] Version already ${nextVersion}`);
    return;
  }

  pkg.version = nextVersion;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(
    `[eas-sync-app-version] Set version to ${nextVersion} (${platform} buildVersion ${buildVersion})`,
  );
}

main().catch((error) => {
  console.warn('[eas-sync-app-version]', error instanceof Error ? error.message : error);
});
