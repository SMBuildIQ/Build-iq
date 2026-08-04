# Google Play Data Safety (draft answers)

Use these as a starting point in Play Console → App content → Data safety.

## Data collected

| Data type | Collected | Shared | Purpose |
|---|---|---|---|
| Name | Yes | No* | Account |
| Email | Yes | No* | Account / auth |
| Address (jobsite) | Yes | No* | Estimating / delivery |
| Photos/files (plans) | Yes | No* | Takeoff |
| Purchase history | Yes | With Stripe | Orders |
| App interactions | Optional diagnostics | No | Stability |

\*Shared only with processors (hosting, Stripe, optional OpenAI/Spruce) as service providers — declare as “shared with service providers” if Play asks.

## Security practices

- Data encrypted in transit (HTTPS/TLS)  
- Users can request deletion (in-app account delete)  
- Users can request export (Download my data)  

## Not collected for ads

No advertising ID usage. No ad SDKs in the core BuildIQ client.
