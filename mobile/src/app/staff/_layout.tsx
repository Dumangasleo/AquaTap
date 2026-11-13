import { Tabs } from 'expo-router';
import { useTabBarOptions } from '../../components/navigation/use-tab-bar-options';
import { RoleGate } from '../../components/RoleGate';
import { Icon, type IconName } from '../../components/ui';
import { usePendingCount } from '../../features/staff/use-staff-queries';
import { colors, fonts } from '../../theme/tokens';

function tabIcon(activeIcon: IconName, inactiveIcon: IconName) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={focused ? activeIcon : inactiveIcon} size={24} color={focused ? colors.primary : colors.textSubtle} />;
  }
  return TabIcon;
}

function StaffTabs() {
  const tabBarOptions = useTabBarOptions();
  const { data: pendingCounts } = usePendingCount();
  const pendingCount = pendingCounts?.pendingCount ?? 0;

  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Orders',
          tabBarIcon: tabIcon('receipt', 'receipt-outline'),
          // Red number = orders still waiting for an answer.
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.textOnPrimary, fontFamily: fonts.bold, fontSize: 11 },
          tabBarAccessibilityLabel: pendingCount > 0 ? `Orders, ${pendingCount} waiting` : 'Orders',
        }}
      />
      <Tabs.Screen name="daily" options={{ title: 'Today', tabBarIcon: tabIcon('today', 'today-outline') }} />
      <Tabs.Screen name="credits" options={{ title: 'Utang', tabBarIcon: tabIcon('wallet', 'wallet-outline') }} />
      <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: tabIcon('grid', 'grid-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'Menu', tabBarIcon: tabIcon('menu', 'menu-outline') }} />
    </Tabs>
  );
}

export default function StaffLayout() {
  return (
    <RoleGate allowedRoles={['Admin', 'Employee']}>
      <StaffTabs />
    </RoleGate>
  );
}
