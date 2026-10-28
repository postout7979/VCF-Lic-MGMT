interface SummaryBarItem {
  label: string;
  value: string | number;
}

interface SummaryBarProps {
  items: SummaryBarItem[];
}

function SummaryBar({ items }: SummaryBarProps) {
  return (
    <div className="summary-bar">
      {items.map((item) => (
        <div className="summary-bar-item" key={item.label}>
          <span className="summary-bar-label">{item.label}</span>
          <span className="summary-bar-value">
            {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SummaryBar;
