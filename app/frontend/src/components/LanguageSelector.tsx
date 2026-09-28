import { useLanguage } from "../context/LanguageContext";
import type { Language } from "../i18n/translations";

interface LanguageSelectorProps {
  className?: string;
}

export default function LanguageSelector({ className = "" }: LanguageSelectorProps) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`language-selector-wrap ${className}`}>
      <label htmlFor="lang-select" className="lang-label">
        <span className="lang-icon" aria-hidden="true">🌐</span>
      </label>
      <select
        id="lang-select"
        className="language-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        aria-label="Select Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ"
      >
        <option value="kn">ಕನ್ನಡ (Kannada)</option>
        <option value="en">English (ಇಂಗ್ಲಿಷ್)</option>
      </select>
    </div>
  );
}
