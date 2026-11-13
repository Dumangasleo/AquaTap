import { Stack } from 'expo-router';
import { RoleGate } from '../../components/RoleGate';
import { colors } from '../../theme/tokens';

export default function AdminLayout() {
  return (
    <RoleGate allowedRoles={['Admin']}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </RoleGate>
  );
}
