import LegalPage from '../components/LegalPage';
import { TERMS } from '../data/legalContent';

export default function Terms() {
  return (
    <LegalPage title={TERMS.title} lastUpdated={TERMS.lastUpdated} sections={TERMS.sections} />
  );
}
