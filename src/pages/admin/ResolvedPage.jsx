import { useAuth } from '../../context/AuthContext';
import { ReportsTab } from './ReportsPage';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function ResolvedPage() {
  const { userProfile } = useAuth();
  return (
    <div style={{ padding: '0 24px 32px' }}>
      <AdminPageHeader title="Решени пријави" subtitle="Архива на обработени пријави" />
      <ReportsTab status="resolved" adminId={userProfile?.id} />
    </div>
  );
}
