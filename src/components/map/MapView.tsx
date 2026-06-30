export function MapView() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src="/map-satellite.jpg"
        alt="Map"
        className="w-full h-full object-cover select-none pointer-events-none"
        draggable={false}
      />
    </div>
  );
}
