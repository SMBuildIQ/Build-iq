export function walletLabel(method: string | null | undefined) {
  switch (method) {
    case "apple_pay":
    case "mock_apple_pay":
      return "Apple Pay";
    case "google_pay":
    case "mock_google_pay":
      return "Google Pay";
    case "mock_card":
      return "Card (demo)";
    default:
      return method || "Card";
  }
}
