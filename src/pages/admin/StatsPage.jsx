import StatsTab from '../../components/admin/StatsTab';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { useStatsCache } from '../../context/StatsCache';
import Button from '../../components/ui/Button';

export default function StatsPage() {
  const { refreshAll, slots } = useStatsCache();
  const isLoading = slots.global?.loading || slots.daily?.loading;

  return (
    <div style={{ padding: '0 24px 32px' }}>
      <AdminPageHeader
        title="Статистика"
        subtitle="Активност и метрики на платформата"
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={isLoading}
            disabled={isLoading}
            onClick={refreshAll}
          >
            ↻ Освежи
          </Button>
        }
      />
      <StatsTab />
    </div>
  );
}
