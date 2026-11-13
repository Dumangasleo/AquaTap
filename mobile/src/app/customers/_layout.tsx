import { Stack } from 'expo-router';
import { RoleGate } from '../../components/RoleGate';
import { colors } from '../../theme/tokens';

export default function CustomersLayout() {
  return (
    <RoleGate allowedRoles={['Admin', 'Employee']}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </RoleGate>
  );
}
