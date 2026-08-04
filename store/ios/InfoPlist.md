# iOS Info.plist usage descriptions

Only add keys for APIs you actually call. Current BuildIQ Capacitor shell does **not** require camera, mic, or location for core flows (plan upload uses the system document picker).

If you later add camera capture for plans, include:

```xml
<key>NSCameraUsageDescription</key>
<string>BuildIQ uses the camera so you can photograph blueprint sheets for takeoff.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>BuildIQ accesses photos you select to upload blueprint images.</string>
```

Recommended baseline keys:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
<!-- or complete export compliance if using custom crypto beyond HTTPS/TLS -->

<key>CFBundleDisplayName</key>
<string>BuildIQ</string>
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>buildiq</string>
    </array>
  </dict>
</array>
```
