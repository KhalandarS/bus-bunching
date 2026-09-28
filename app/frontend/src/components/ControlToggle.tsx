import { useLanguage } from "../context/LanguageContext";

interface ControlToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export default function ControlToggle({ enabled, onToggle }: ControlToggleProps) {
  const { t } = useLanguage();

  return (
    <button className={`control-toggle ${enabled ? "on" : "off"}`} onClick={onToggle}>
      <span className="knob" />
      <span className="toggle-text">
        <strong>{enabled ? t.bunchingControlOn : t.bunchingControlOff}</strong>
        <small>{enabled ? t.controlDescOn : t.controlDescOff}</small>
      </span>
    </button>
  );
}
