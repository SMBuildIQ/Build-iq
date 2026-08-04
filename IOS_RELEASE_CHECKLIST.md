# iOS release checklist

- [ ] Unique bundle id (`app.buildiq.estimator` or final)
- [ ] App icons + launch screen
- [ ] Signing / provisioning / App Store Connect app record
- [ ] PrivacyInfo.xcprivacy copied into Xcode project
- [ ] Permission purpose strings only for used APIs
- [ ] Export compliance answered (`store/ios/export-compliance.md`)
- [ ] App Privacy nutrition labels match `PRIVACY_DATA_MAP.md`
- [ ] Age rating / content rating (`store/content-rating.md`)
- [ ] Account deletion tested on TestFlight
- [ ] Demo account in App Review notes
- [ ] Privacy / Terms / Support URLs live on HTTPS
- [ ] Store contacts match `store/CONTACT.md` (Supply Monkey / support@supplymonkeyco.com)
- [ ] Privacy & Terms attorney-approved before treating as final (`LEGAL_POLICIES_FINAL`)
- [ ] No placeholder screens or dead buttons in review path
- [ ] Push / Face ID only if implemented and disclosed
- [ ] **Do not submit without owner approval**

Capacitor: generate `ios/` with `npm run cap:add:ios` on a Mac with Xcode, set `server.url`.
