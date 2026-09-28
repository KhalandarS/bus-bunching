import { useLanguage } from "../context/LanguageContext";

interface ParamsPanelProps {
  theta: number;
  speedGain: number;
  onThetaChange: (v: number) => void;
  onSpeedGainChange: (v: number) => void;
}

export default function ParamsPanel({ theta, speedGain, onThetaChange, onSpeedGainChange }: ParamsPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="params-panel">
      <label>
        {t.holdingDamping}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={theta}
          onChange={(e) => onThetaChange(parseFloat(e.target.value))}
        />
        <span>{theta.toFixed(2)}</span>
      </label>
      <label>
        {t.speedControlGain}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={speedGain}
          onChange={(e) => onSpeedGainChange(parseFloat(e.target.value))}
        />
        <span>{speedGain.toFixed(2)}</span>
      </label>
      <span className="params-hint">{t.paramsHint}</span>
    </div>
  );
}
