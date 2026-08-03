interface ControlToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export default function ControlToggle({ enabled, onToggle }: ControlToggleProps) {
  return (
    <button className={`control-toggle ${enabled ? "on" : "off"}`} onClick={onToggle}>
      <span className="knob" />
      <span className="toggle-text">
        <strong>BUNCHING CONTROL: {enabled ? "ON" : "OFF"}</strong>
        <small>
          {enabled
            ? "Holding + cooperative speed control active — watch spacing recover over the next few minutes."
            : "Buses running unmanaged — watch bunching develop, then flip this on."}
        </small>
      </span>
    </button>
  );
}
