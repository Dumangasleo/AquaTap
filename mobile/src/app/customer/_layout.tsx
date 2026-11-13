import { Tabs } from 'expo-router';
import { useTabBarOptions } from '../../components/navigation/use-tab-bar-options';
import { RoleGate } from '../../components/RoleGate';
import { Icon, type IconName } from '../../components/ui';
import { colors } from '../../theme/tokens';

function tabIcon(activeIcon: IconName, inactiveIcon: IconName) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={focused ? activeIcon : inactiveIcon} size={24} color={focused ? colors.primary : colors.textSubtle} />;
  }
  return TabIcon;
}

function CustomerTabs() {
  const tabBarOptions = useTabBarOptions();

  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="orders" options={{ title: 'My orders', tabBarIcon: tabIcon('receipt', 'receipt-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: tabIcon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

export default function CustomerTabsLayout() {
  return (
    <RoleGate allowedRoles={['Customer']}>
      <CustomerTabs />
    </RoleGate>
  );
}
