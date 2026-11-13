import { Stack } from 'expo-router';
import { RoleGate } from '../../components/RoleGate';
import { colors } from '../../theme/tokens';

/** AquaTap platform reviewer area (SystemAdmin only). */
export default function SystemLayout() {
  return (
    <RoleGate allowedRoles={['SystemAdmin']}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </RoleGate>
  );
}
