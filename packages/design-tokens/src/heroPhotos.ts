/**
 * Full-bleed hero photography mapped to Supply Monkey site content:
 * lumber, trusses, doors/windows, millwork, stone, cabinetry, delivery, takeoffs.
 *
 * Web apps load these from `/heroes/*.jpg` (apps/web/public/heroes).
 * Mobile maps the same filenames via require() in HeroBand.
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

export const HERO_PHOTOS: Record<
  HeroTone,
  { file: string; path: string; alt: string }
> = {
  jobs: {
    file: "jobs-framing.jpg",
    path: "/heroes/jobs-framing.jpg",
    alt: "Residential framing crew on an active build",
  },
  jobDetail: {
    file: "job-blueprints.jpg",
    path: "/heroes/job-blueprints.jpg",
    alt: "Architectural blueprints on a workbench",
  },
  proposals: {
    file: "proposals-home.jpg",
    path: "/heroes/proposals-home.jpg",
    alt: "Finished residential home with glass and patio",
  },
  proposalDetail: {
    file: "proposal-kitchen.jpg",
    path: "/heroes/proposal-kitchen.jpg",
    alt: "Finished kitchen millwork and cabinetry",
  },
  shop: {
    file: "shop-lumber.jpg",
    path: "/heroes/shop-lumber.jpg",
    alt: "Lumber yard timber stacks",
  },
  cart: {
    file: "cart-windows.jpg",
    path: "/heroes/cart-windows.jpg",
    alt: "Residential windows and exterior detailing",
  },
  track: {
    file: "track-warehouse.jpg",
    path: "/heroes/track-warehouse.jpg",
    alt: "Materials warehouse aisle ready for yard pull",
  },
  orders: {
    file: "orders-warehouse.jpg",
    path: "/heroes/orders-warehouse.jpg",
    alt: "Staged materials ready for jobsite delivery",
  },
  account: {
    file: "account-tools.jpg",
    path: "/heroes/account-tools.jpg",
    alt: "Jobsite fabrication and tools",
  },
  cabinetry: {
    file: "cabinetry-kitchen.jpg",
    path: "/heroes/cabinetry-kitchen.jpg",
    alt: "Custom kitchen cabinetry showroom",
  },
  settings: {
    file: "settings-office.jpg",
    path: "/heroes/settings-office.jpg",
    alt: "Estimating office workspace",
  },
  login: {
    file: "login-lumber.jpg",
    path: "/heroes/login-lumber.jpg",
    alt: "Supply Monkey lumber yard corridor",
  },
};

export function heroPhoto(tone: HeroTone = "jobs") {
  return HERO_PHOTOS[tone];
}
