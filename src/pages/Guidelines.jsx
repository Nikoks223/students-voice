import LegalPage from '../components/LegalPage';
import { GUIDELINES } from '../data/legalContent';

export default function Guidelines() {
  return (
    <LegalPage
      title={GUIDELINES.title}
      lastUpdated={GUIDELINES.lastUpdated}
      sections={GUIDELINES.sections}
    />
  );
}
