import { Moon, Sun } from 'lucide-react';
import { usePreferences } from '../preferences';

export default function PreferenceControls() {
  const { language, theme, setLanguage, setTheme, t } = usePreferences();
  const nextLanguage = language === 'pt' ? 'en' : 'pt';
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <div className="vs-preference-switchers">
      <button
        type="button"
        aria-label={t(language === 'pt' ? 'Mudar para inglês' : 'Switch to Portuguese')}
        title={t(language === 'pt' ? 'Mudar para inglês' : 'Switch to Portuguese')}
        onClick={() => setLanguage(nextLanguage)}
      >
        <span aria-hidden="true">{language === 'pt' ? '🇵🇹' : '🇬🇧'}</span>
      </button>
      <button
        type="button"
        aria-label={t(theme === 'light' ? 'Ativar modo escuro' : 'Switch to light mode')}
        title={t(theme === 'light' ? 'Ativar modo escuro' : 'Switch to light mode')}
        onClick={() => setTheme(nextTheme)}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </div>
  );
}
