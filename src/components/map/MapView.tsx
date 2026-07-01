// Live image adjustments (no need to re-encode the file). 1 = unchanged,
// brightness >1 lighter; saturation <1 more muted.
const BRIGHTNESS = 1.2;
const SATURATION = 0.9;

export function MapView() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src="/map-satellite.jpg"
        alt="Map"
        className="w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
        style={{ filter: `brightness(${BRIGHTNESS}) saturate(${SATURATION})` }}
      />
    </div>
  );
}
