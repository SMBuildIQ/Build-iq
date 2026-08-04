export type PackageSeed = {
  slug: string;
  category: string;
  name: string;
  description: string;
  contents: string;
  unit: string;
  unitPrice: number;
  leadDays: number;
  spruceSku: string;
  sortOrder: number;
};

/** Residential material takeoff packages builders can order */
export const MATERIAL_PACKAGES: PackageSeed[] = [
  {
    slug: "windows-residential-takeoff",
    category: "Windows",
    name: "Windows Takeoff Package",
    description: "Vinyl / fiberglass window package sized from plan takeoff quantities.",
    contents: JSON.stringify([
      "Vinyl double-hung Low-E windows",
      "Picture / fixed units as specified",
      "Nailing fins & installation accessories",
      "Rough opening schedule from takeoff",
    ]),
    unit: "package",
    unitPrice: 12800,
    leadDays: 21,
    spruceSku: "PKG-WIN-RES",
    sortOrder: 1,
  },
  {
    slug: "doors-residential-takeoff",
    category: "Doors",
    name: "Doors Takeoff Package",
    description: "Entry, interior, and patio door package from door schedule takeoff.",
    contents: JSON.stringify([
      "Fiberglass insulated entry door(s)",
      "Prehung interior doors",
      "Sliding / French patio unit as noted",
      "Door unit schedule from takeoff",
    ]),
    unit: "package",
    unitPrice: 6400,
    leadDays: 14,
    spruceSku: "PKG-DOR-RES",
    sortOrder: 2,
  },
  {
    slug: "lumber-framing-takeoff",
    category: "Lumber",
    name: "Lumber Framing Package",
    description: "Stud, plate, joist, and beam lumber package for residential framing takeoff.",
    contents: JSON.stringify([
      "2x4 / 2x6 SPF studs & plates",
      "Floor / ceiling joists",
      "Headers & beams (DF / LVL as scoped)",
      "Cut list aligned to framing takeoff",
    ]),
    unit: "package",
    unitPrice: 18500,
    leadDays: 5,
    spruceSku: "PKG-LUM-FRM",
    sortOrder: 3,
  },
  {
    slug: "trusses-roof-takeoff",
    category: "Trusses",
    name: "Roof Truss Package",
    description: "Engineered roof truss package with layout from roof plan takeoff.",
    contents: JSON.stringify([
      "Common / hip / valley trusses",
      "Gable end frames",
      "Bracing & hardware kit",
      "Stamped layout drawings",
    ]),
    unit: "package",
    unitPrice: 9200,
    leadDays: 18,
    spruceSku: "PKG-TRS-ROF",
    sortOrder: 4,
  },
  {
    slug: "cabinetry-kitchen-bath",
    category: "Cabinetry",
    name: "Cabinetry Takeoff Package",
    description: "Kitchen and bath cabinet package from elevation / plan takeoff.",
    contents: JSON.stringify([
      "Base & wall kitchen cabinets",
      "Vanity cabinets",
      "Toe kicks, fillers, panels",
      "Cabinet schedule from takeoff",
    ]),
    unit: "package",
    unitPrice: 15400,
    leadDays: 28,
    spruceSku: "PKG-CAB-KB",
    sortOrder: 5,
  },
  {
    slug: "masonry-stone-veneer",
    category: "Masonry Stone",
    name: "Masonry Stone Package",
    description: "Stone veneer and masonry package for elevations from takeoff SF.",
    contents: JSON.stringify([
      "Cultured / natural stone veneer",
      "Corners & trim pieces",
      "Mortar / thinset materials",
      "Elevation SF from takeoff",
    ]),
    unit: "package",
    unitPrice: 7800,
    leadDays: 12,
    spruceSku: "PKG-MAS-STN",
    sortOrder: 6,
  },
  {
    slug: "door-hardware-residential",
    category: "Door Hardware",
    name: "Door Hardware Package",
    description: "Locks, hinges, stops, and closers matched to the door takeoff schedule.",
    contents: JSON.stringify([
      "Entry locksets / deadbolts",
      "Passage & privacy sets",
      "Hinges, stops, viewers",
      "Hardware schedule by opening",
    ]),
    unit: "package",
    unitPrice: 1850,
    leadDays: 7,
    spruceSku: "PKG-HDW-DOR",
    sortOrder: 7,
  },
  {
    slug: "millwork-trim-takeoff",
    category: "Millwork",
    name: "Millwork & Trim Package",
    description: "Interior millwork package — casing, base, crown, and specialty trim from takeoff LF.",
    contents: JSON.stringify([
      "Door & window casing",
      "Baseboard & shoe",
      "Crown / chair rail as specified",
      "Linear footage from trim takeoff",
    ]),
    unit: "package",
    unitPrice: 4200,
    leadDays: 10,
    spruceSku: "PKG-MIL-TRM",
    sortOrder: 8,
  },
];

export const PACKAGE_CATEGORIES = [
  "Windows",
  "Doors",
  "Lumber",
  "Trusses",
  "Cabinetry",
  "Masonry Stone",
  "Door Hardware",
  "Millwork",
] as const;
