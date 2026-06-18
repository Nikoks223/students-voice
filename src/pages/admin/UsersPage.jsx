import AdminPageHeader from '../../components/admin/AdminPageHeader';
import UsersTab from '../../components/admin/UsersTab';
import { useAuth } from '../../context/AuthContext';

export default function UsersPage() {
  const { userProfile } = useAuth();
  return (
    <div style={{ padding: '0 24px 32px' }}>
      <AdminPageHeader title="Корисници" subtitle="Листа и модерација на корисници" />
      <UsersTab adminId={userProfile?.id} />
    </div>
  );
}
