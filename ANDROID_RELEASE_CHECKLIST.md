# Android release checklist

Canonical application id: **`com.supplymonkey.buildiq`**

## Implemented in repo

- [x] Application id (`com.supplymonkey.buildiq`)
- [x] Adaptive icon + splash
- [x] Version name `1.0.0` / versionCode `1` (EAS autoIncrement for production)
- [x] Runtime permissions minimal (INTERNET + NETWORK_STATE; broad media/camera/location blocked)
- [x] Data Safety drafts (`store/android/data-safety.md` + `PRIVACY_DATA_MAP.md`)
- [x] Target audience 18+ drafts (`store/android/audience.md`)
- [x] Content rating drafts (`store/content-rating.md`)
- [x] Account deletion in-app + web URL
- [x] Privacy / Terms / Support linked in-app
- [x] Production EAS profile builds AAB (`eas.json` → `buildType: app-bundle`)
- [x] Demo auth disabled on production profile

## Owner / ops before submit

- [ ] Target API level meets current Play requirement (confirm on EAS/Android Studio build)
- [ ] Play App Signing + AAB upload
- [ ] Data Safety form submitted to match drafts
- [ ] Content rating questionnaire completed in Play Console
- [ ] Store contacts match `store/CONTACT.md`
- [ ] Privacy & Terms attorney-approved (`LEGAL_POLICIES_FINAL`)
- [ ] Review credentials in Play Console
- [ ] Internal testing track validated
- [ ] **Do not submit without owner approval**

Expo: `npx eas build --profile production --platform android` from `apps/mobile`.
