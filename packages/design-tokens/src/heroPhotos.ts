/**
 * Full-bleed hero photography mapped to Supply Monkey site content:
 * lumber, trusses, doors/windows, millwork, stone, cabinetry, delivery, takeoffs.
 */
export type HeroTone =
  | "jobs"
  | "jobDetail"
  | "proposals"
  | "proposalDetail"
  | "shop"
  | "cart"
  | "track"
  | "orders"
  | "account"
  | "cabinetry"
  | "settings"
  | "login";

const Q = "auto=format&fit=crop&w=1600&q=65";

export const HERO_PHOTOS: Record<HeroTone, { uri: string; alt: string }> = {
  /** Jobs — residential framing / active builds */
  jobs: {
    uri: `https://images.unsplash.com/photo-1541888946425-d81bb19240f5?${Q}`,
    alt: "Residential framing under construction",
  },
  /** Job detail — plan takeoff / blueprints on the bench */
  jobDetail: {
    uri: `https://images.unsplash.com/photo-1503387762-592deb58ef4e?${Q}`,
    alt: "Architectural blueprints on a workbench",
  },
  /** Proposals — finished home curb appeal */
  proposals: {
    uri: `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?${Q}`,
    alt: "Modern residential exterior",
  },
  /** Proposal detail — millwork / interior finish */
  proposalDetail: {
    uri: `https://images.unsplash.com/photo-1631679706909-1844bbd07221?${Q}`,
    alt: "Interior millwork and finished room",
  },
  /** Shop — lumber yard stacks */
  shop: {
    uri: `https://images.unsplash.com/photo-1416331108676-a22ccb276e35?${Q}`,
    alt: "Stacked lumber in a materials yard",
  },
  /** Cart — windows & door packages */
  cart: {
    uri: `https://images.unsplash.com/photo-1513694203232-719a280e022f?${Q}`,
    alt: "Window and door materials ready for install",
  },
  /** Track — warehouse / yard pull logistics */
  track: {
    uri: `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?${Q}`,
    alt: "Materials warehouse ready for delivery",
  },
  /** Orders — delivery / fulfillment */
  orders: {
    uri: `https://images.unsplash.com/photo-1589939705384-5185137a7f0f?${Q}`,
    alt: "Building materials staged for jobsite delivery",
  },
  /** Account / More — contractor tools */
  account: {
    uri: `https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?${Q}`,
    alt: "Jobsite tools and hardware",
  },
  /** Cabinetry — kitchen cabinetry showroom feel */
  cabinetry: {
    uri: `https://images.unsplash.com/photo-1556912173-46c336c7fd55?${Q}`,
    alt: "Custom kitchen cabinetry",
  },
  /** Settings — office / estimating desk */
  settings: {
    uri: `https://images.unsplash.com/photo-1497366216548-37526070297c?${Q}`,
    alt: "Estimating office workspace",
  },
  /** Login — specialty hardwood / lumber corridor */
  login: {
    uri: `https://images.unsplash.com/photo-1449844908441-8829872d2607?${Q}`,
    alt: "Lumber stacks in a supply yard",
  },
};

export function heroPhoto(tone: HeroTone = "jobs") {
  return HERO_PHOTOS[tone];
}
