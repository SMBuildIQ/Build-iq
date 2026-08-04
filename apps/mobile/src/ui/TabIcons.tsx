import React from "react";
import Svg, { Path, Rect, Line, G } from "react-native-svg";

export type TabIconName = "jobs" | "proposals" | "shop" | "cart" | "more";

type GlyphProps = {
  color: string;
  focused?: boolean;
  size?: number;
};

const STROKE = 1.65;

/** Architectural elevation — residence / active job. */
function JobsGlyph({ color, focused, size = 24 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.8 10.8 L12 3.5 L21.2 10.8"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <Path
        d="M4.5 10.2 V20.5 H19.5 V10.2"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="miter"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.1 : 0}
      />
      {/* chimney */}
      <Rect x="16.2" y="5.2" width="2.4" height="3.6" stroke={color} strokeWidth={STROKE} fill="none" />
      {/* door */}
      <Path d="M10.4 20.5 V14.2 H13.6 V20.5" stroke={color} strokeWidth={STROKE} />
      {/* divided-lite windows */}
      <Rect x="5.6" y="12.2" width="3.4" height="3.4" stroke={color} strokeWidth={1.35} fill="none" />
      <Line x1="7.3" y1="12.2" x2="7.3" y2="15.6" stroke={color} strokeWidth={1} />
      <Line x1="5.6" y1="13.9" x2="9" y2="13.9" stroke={color} strokeWidth={1} />
      <Rect x="15" y="12.2" width="3.4" height="3.4" stroke={color} strokeWidth={1.35} fill="none" />
      <Line x1="16.7" y1="12.2" x2="16.7" y2="15.6" stroke={color} strokeWidth={1} />
      <Line x1="15" y1="13.9" x2="18.4" y2="13.9" stroke={color} strokeWidth={1} />
    </Svg>
  );
}

/** Proposal folio with folded corner + accent rule. */
function ProposalsGlyph({ color, focused, size = 24 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 2.8 H14.2 L19.2 7.8 V21.2 H5.5 V2.8 Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="miter"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.1 : 0}
      />
      <Path d="M14.2 2.8 V7.8 H19.2" stroke={color} strokeWidth={STROKE} strokeLinejoin="miter" />
      <Rect x="8.2" y="5" width="4" height="1.5" fill={color} />
      <Line x1="8.2" y1="11" x2="16.4" y2="11" stroke={color} strokeWidth={STROKE} strokeLinecap="square" />
      <Line x1="8.2" y1="14.2" x2="16.4" y2="14.2" stroke={color} strokeWidth={STROKE} strokeLinecap="square" />
      <Line x1="8.2" y1="17.4" x2="13.2" y2="17.4" stroke={color} strokeWidth={STROKE} strokeLinecap="square" />
    </Svg>
  );
}

/** End-grain timber stack — specialty lumber. */
function ShopGlyph({ color, focused, size = 24 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* top plank */}
      <Path
        d="M3 5.2 H21 V8.6 H3 V5.2 Z"
        stroke={color}
        strokeWidth={STROKE}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.14 : 0}
      />
      {/* end grain notches */}
      <Line x1="6" y1="5.2" x2="6" y2="8.6" stroke={color} strokeWidth={1.2} />
      <Line x1="12" y1="5.2" x2="12" y2="8.6" stroke={color} strokeWidth={1.2} />
      <Line x1="18" y1="5.2" x2="18" y2="8.6" stroke={color} strokeWidth={1.2} />
      {/* middle */}
      <Path
        d="M4.2 10.2 H19.8 V13.6 H4.2 V10.2 Z"
        stroke={color}
        strokeWidth={STROKE}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.1 : 0}
      />
      <Line x1="7.5" y1="10.2" x2="7.5" y2="13.6" stroke={color} strokeWidth={1.2} />
      <Line x1="12" y1="10.2" x2="12" y2="13.6" stroke={color} strokeWidth={1.2} />
      <Line x1="16.5" y1="10.2" x2="16.5" y2="13.6" stroke={color} strokeWidth={1.2} />
      {/* bottom */}
      <Path d="M5.4 15.2 H18.6 V18.6 H5.4 V15.2 Z" stroke={color} strokeWidth={STROKE} fill="none" />
      <Line x1="8.5" y1="15.2" x2="8.5" y2="18.6" stroke={color} strokeWidth={1.2} />
      <Line x1="12" y1="15.2" x2="12" y2="18.6" stroke={color} strokeWidth={1.2} />
      <Line x1="15.5" y1="15.2" x2="15.5" y2="18.6" stroke={color} strokeWidth={1.2} />
      {/* footing */}
      <Line x1="3.5" y1="20.2" x2="20.5" y2="20.2" stroke={color} strokeWidth={STROKE} strokeLinecap="square" />
    </Svg>
  );
}

/** Yard crate with X brace — materials tote. */
function CartGlyph({ color, focused, size = 24 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.5"
        y="5.5"
        width="17"
        height="13.5"
        stroke={color}
        strokeWidth={STROKE}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.1 : 0}
      />
      {/* lid rail */}
      <Line x1="3.5" y1="8.4" x2="20.5" y2="8.4" stroke={color} strokeWidth={STROKE} />
      {/* X brace */}
      <Line x1="5.8" y1="9.6" x2="18.2" y2="17.4" stroke={color} strokeWidth={STROKE} />
      <Line x1="18.2" y1="9.6" x2="5.8" y2="17.4" stroke={color} strokeWidth={STROKE} />
      {/* lift handles */}
      <Path d="M7.2 5.5 V3.8 H9.6 V5.5" stroke={color} strokeWidth={STROKE} strokeLinejoin="miter" />
      <Path d="M14.4 5.5 V3.8 H16.8 V5.5" stroke={color} strokeWidth={STROKE} strokeLinejoin="miter" />
      {/* feet */}
      <Rect x="5.2" y="19" width="2.2" height="1.8" fill={color} />
      <Rect x="16.6" y="19" width="2.2" height="1.8" fill={color} />
    </Svg>
  );
}

/** Account plate — framed ledger marks. */
function MoreGlyph({ color, focused, size = 24 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.2"
        y="3.2"
        width="17.6"
        height="17.6"
        stroke={color}
        strokeWidth={STROKE}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.1 : 0}
      />
      <Rect x="6" y="6" width="12" height="12" stroke={color} strokeWidth={1.35} fill="none" />
      <Rect x="8.2" y="8.4" width="7.6" height="1.55" fill={color} />
      <Rect x="8.2" y="11.55" width="7.6" height="1.55" fill={color} />
      <Rect x="8.2" y="14.7" width="4.8" height="1.55" fill={color} />
    </Svg>
  );
}

export function TabGlyph({
  name,
  color,
  focused = false,
  size = 24,
}: {
  name: TabIconName;
  color: string;
  focused?: boolean;
  size?: number;
}) {
  switch (name) {
    case "jobs":
      return <JobsGlyph color={color} focused={focused} size={size} />;
    case "proposals":
      return <ProposalsGlyph color={color} focused={focused} size={size} />;
    case "shop":
      return <ShopGlyph color={color} focused={focused} size={size} />;
    case "cart":
      return <CartGlyph color={color} focused={focused} size={size} />;
    case "more":
      return <MoreGlyph color={color} focused={focused} size={size} />;
    default:
      return null;
  }
}
