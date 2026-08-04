# Android permissions

Keep the manifest minimal. Prefer the system file picker (no `READ_EXTERNAL_STORAGE` on modern Android for one-shot uploads).

Typical Capacitor baseline:

- `INTERNET` — required  
- `ACCESS_NETWORK_STATE` — optional, connectivity UX  

Do **not** add camera/microphone/location unless a feature needs them and you provide a runtime rationale string.

Payment: Google Pay runs through Chrome Custom Tabs / WebView Payment Request with Stripe — no `BILLING` permission for physical goods.
