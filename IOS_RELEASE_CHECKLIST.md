# iOS release checklist

Canonical bundle id: **`com.supplymonkey.buildiq`**

## Implemented in repo

- [x] Unique bundle id (`com.supplymonkey.buildiq` in Expo `app.json` + Capacitor)
- [x] App icons + splash (`apps/mobile/assets/brand/`)
- [x] PrivacyInfo / privacy manifests (`apps/mobile/PrivacyInfo.xcprivacy`, Expo `privacyManifests`)
- [x] Permission purpose strings only for used APIs (document / photo library picker)
- [x] Export compliance answered (`ITSAppUsesNonExemptEncryption: false`; `store/ios/export-compliance.md`)
- [x] App Privacy nutrition label drafts (`store/ios/privacy-nutrition-labels.json`)
- [x] Age / content rating drafts (`store/content-rating.md`)
- [x] Account deletion in-app (More → Delete account → `DELETE /auth/account`)
- [x] No prefills / Continue demo in production (`EXPO_PUBLIC_ALLOW_DEMO=false`)
- [x] Privacy / Terms / Support linked in Login + More
- [x] Dead review-path buttons removed or given real actions
- [x] EAS profiles (`apps/mobile/eas.json`)

## Owner / ops before submit

- [ ] Signing / provisioning / App Store Connect app record
- [ ] Privacy / Terms / Support URLs live on HTTPS (set `EXPO_PUBLIC_LEGAL_BASE_URL`)
- [ ] Store contacts match `store/CONTACT.md`
- [ ] Privacy & Terms attorney-approved (`LEGAL_POLICIES_FINAL`)
- [ ] Account deletion tested on TestFlight
- [ ] Demo account only in App Review notes (`demo@buildiq.app` / `demo1234`)
- [ ] Push / Face ID only if implemented and disclosed (currently neither)
- [ ] **Do not submit without owner approval**

Expo: `npx eas build --profile production --platform ios` from `apps/mobile`.  
Capacitor alternate: generate `ios/` with Xcode, sync `PrivacyInfo.xcprivacy`, set `server.url`.
