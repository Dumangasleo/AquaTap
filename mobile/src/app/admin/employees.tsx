import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { employeesApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import {
  AppText,
  Avatar,
  Badge,
  Banner,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  ScreenHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { queryKeys } from '../../hooks/query-keys';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';
import type { Employee } from '../../types/api.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Admin: invite riders / staff by Gmail and enable or disable their access. */
export default function EmployeesScreen() {
  const [isInviteSheetVisible, setIsInviteSheetVisible] = useState(false);
  const employeesQuery = useQuery({ queryKey: queryKeys.employees, queryFn: employeesApi.list });
  const employees = employeesQuery.data ?? [];

  return (
    <Screen
      header={
        <ScreenHeader
          title="Employees"
          subtitle="Riders and staff of your station"
          showBackButton
          rightAction={<Button label="Add" icon="person-add-outline" onPress={() => setIsInviteSheetVisible(true)} />}
        />
      }
      isRefreshing={employeesQuery.isRefetching}
      onRefresh={() => void employeesQuery.refetch()}
    >
      <Banner
        tone="info"
        icon="mail-outline"
        message="Add your employee's Gmail address. When they sign in to AquaTap with that Google account, they can start working right away."
      />

      {employeesQuery.isLoading ? (
        <LoadingView message="Loading employees…" />
      ) : employeesQuery.isError ? (
        <ErrorView error={employeesQuery.error} onRetry={() => void employeesQuery.refetch()} />
      ) : employees.length === 0 ? (
        <EmptyState icon="people-outline" title="No employees yet" actionLabel="Add an employee" onAction={() => setIsInviteSheetVisible(true)} />
      ) : (
        <View className="gap-3">
          {employees.map((employee) => (
            <EmployeeCard key={employee.employeeId} employee={employee} />
          ))}
        </View>
      )}

      <InviteEmployeeSheet isVisible={isInviteSheetVisible} onClose={() => setIsInviteSheetVisible(false)} />
    </Screen>
  );
}

function EmployeeCard({ employee }: { employee: Employee }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const updateMutation = useMutation({
    mutationFn: (isActive: boolean) => employeesApi.update(employee.employeeId, { isActive }),
    onSuccess: (updatedEmployee) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      showToast(updatedEmployee.isActive ? `${updatedEmployee.fullName} can use AquaTap again.` : `${updatedEmployee.fullName} can no longer use AquaTap.`);
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const handleToggle = async (isActive: boolean) => {
    const isConfirmed = await confirm(
      isActive
        ? {
            title: `Let ${employee.fullName} work again?`,
            message: 'They will be able to accept orders and record payments again.',
            details: [
              { label: 'Name', value: employee.fullName },
              { label: 'Email', value: employee.email },
            ],
            confirmLabel: 'Yes, turn on',
            tone: 'success',
            icon: 'person-add',
          }
        : {
            title: `Remove access for ${employee.fullName}?`,
            message: 'They will no longer be able to accept orders or record payments.',
            details: [
              { label: 'Name', value: employee.fullName },
              { label: 'Email', value: employee.email },
            ],
            confirmLabel: 'Yes, remove access',
            tone: 'danger',
            icon: 'person-remove',
          },
    );
    if (!isConfirmed) return;
    updateMutation.mutate(isActive);
  };

  return (
    <Card className={cn('flex-row items-center gap-3', !employee.isActive && 'opacity-70')}>
      <Avatar fullName={employee.fullName} />
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong" numberOfLines={1}>
          {employee.fullName}
        </AppText>
        <AppText variant="caption" className="text-ink-muted" numberOfLines={1}>
          {employee.email}
          {employee.contactNumber ? ` · ${employee.contactNumber}` : ''}
        </AppText>
        <View className="mt-1 flex-row flex-wrap gap-1.5">
          {employee.isOwner ? <Badge label="Owner" tone="accent" icon="star-outline" /> : null}
          {employee.isOnDuty ? <Badge label="On duty" tone="success" showDot /> : null}
          {!employee.hasSignedIn ? <Badge label="Invited, not signed in yet" tone="warning" icon="mail-outline" /> : null}
          {!employee.isActive ? <Badge label="Access removed" tone="danger" /> : null}
        </View>
      </View>
      {!employee.isOwner ? (
        <Switch
          accessibilityLabel={`${employee.fullName} access`}
          value={employee.isActive}
          disabled={updateMutation.isPending}
          onValueChange={(isActive) => void handleToggle(isActive)}
          trackColor={{ true: colors.success, false: colors.borderStrong }}
        />
      ) : null}
    </Card>
  );
}

function InviteEmployeeSheet({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const isEmailValid = EMAIL_PATTERN.test(email.trim());
  const isFormValid = fullName.trim().length >= 3 && isEmailValid;

  const inviteMutation = useMutation({
    mutationFn: () =>
      employeesApi.invite({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        contactNumber: contactNumber.trim() || undefined,
      }),
    onSuccess: (employee) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees });
      showToast(`${employee.fullName} was added. Ask them to sign in with ${employee.email}.`);
      setFullName('');
      setEmail('');
      setContactNumber('');
      onClose();
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const handleInvite = async () => {
    const isConfirmed = await confirm({
      title: 'Add this employee?',
      message: 'They can start working as soon as they sign in with this Gmail.',
      details: [
        { label: 'Name', value: fullName.trim() },
        { label: 'Email', value: email.trim().toLowerCase() },
      ],
      confirmLabel: 'Yes, add employee',
      icon: 'person-add',
    });
    if (isConfirmed) inviteMutation.mutate();
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      title="Add employee"
      subtitle="They will sign in with Google using this Gmail address"
      onClose={onClose}
      footer={
        <Button
          label="Add employee"
          icon="person-add"
          size="lg"
          fullWidth
          isDisabled={!isFormValid}
          isLoading={inviteMutation.isPending}
          onPress={() => void handleInvite()}
        />
      }
    >
      <TextField label="Full name" isRequired placeholder="e.g. Juan Dela Cruz" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
      <TextField
        label="Gmail address"
        isRequired
        placeholder="name@gmail.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        errorText={email && !isEmailValid ? 'Enter a valid email address.' : null}
      />
      <TextField label="Contact number (optional)" placeholder="09XX XXX XXXX" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
    </BottomSheet>
  );
}
