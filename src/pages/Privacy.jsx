import LegalPage from '../components/LegalPage';
import { PRIVACY } from '../data/legalContent';

export default function Privacy() {
  return (
    <LegalPage
      title={PRIVACY.title}
      lastUpdated={PRIVACY.lastUpdated}
      sections={PRIVACY.sections}
    />
  );
}
