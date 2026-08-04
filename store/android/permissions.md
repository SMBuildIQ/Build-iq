# Android permissions

Keep the manifest minimal. Prefer the system file / Photo Picker (`ACTION_GET_CONTENT` / Android Photo Picker) so you do **not** need broad storage access.

## Declare

- `INTERNET` — required  
- `ACCESS_NETWORK_STATE` — optional, connectivity UX  

## Do not declare (unless a future feature truly needs them)

- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE`  
- `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` / `READ_MEDIA_AUDIO` (Android 13+) — plan uploads should use the system picker without media-library permission  
- `CAMERA` / `RECORD_AUDIO` / `ACCESS_FINE_LOCATION`  

If a Capacitor plugin later adds these, remove unused permissions from `AndroidManifest.xml` before Play submission and provide a Play Console Data safety justification for any that remain.

## Payments

Google Pay runs through WebView Payment Request with Stripe — no Play Billing `BILLING` permission for **physical goods**.
