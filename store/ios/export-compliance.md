# Apple export compliance (BuildIQ)

## Recommended App Store Connect answers

**Does your app use encryption?**  
Yes — standard HTTPS/TLS only (URLSession / WKWebView / Next.js HTTPS).

**Does your app qualify for any of the exemptions provided in Category 5, Part 2 of the U.S. Export Administration Regulations?**  
Yes.

**Is your app exempt because it only uses encryption for authentication / HTTPS / digital signatures?**  
Yes (standard OS cryptography / TLS).

## Info.plist

Set in the iOS Capacitor project:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

This matches apps that only use encryption exempt under EAR (HTTPS/TLS for transport security). Revisit if you add custom non-exempt cryptography.

## ATS

Do **not** add ATS exception domains. Capacitor is configured with `https` schemes and `allowMixedContent: false`.
