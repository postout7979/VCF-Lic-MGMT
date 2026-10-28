interface StatTileProps {
  label: string;
  value: number;
  accent?: string;
}

function StatTile({ label, value, accent }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-value" style={accent ? { color: accent } : undefined}>
        {value.toLocaleString()}
      </div>
      <div className="stat-tile-label">{label}</div>
    </div>
  );
}

export default StatTile;
