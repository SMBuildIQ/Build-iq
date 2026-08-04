# Android release checklist

- [ ] Application id (`app.buildiq.estimator` or final)
- [ ] Target API level meets current Play requirement
- [ ] AAB build via Play App Signing
- [ ] Adaptive icon + splash
- [ ] Version code / name
- [ ] Runtime permissions minimal (`store/android/permissions.md`)
- [ ] Data Safety form (`store/android/data-safety.md` + `PRIVACY_DATA_MAP.md`)
- [ ] Target audience 18+ (`store/android/audience.md`)
- [ ] Content rating
- [ ] Account deletion in-app + web URL
- [ ] Review credentials in Play Console
- [ ] Internal testing track validated
- [ ] **Do not submit without owner approval**

Capacitor: `npm run cap:add:android` with Android Studio installed; set `server.url`.
