import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { accountApi, authApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import {
  AppText,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  Icon,
  ListGroup,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../components/ui';
import { pickAvatarImage, type AvatarSource } from '../../features/profile/pick-avatar-image';
import { getRoleLabel } from '../../features/profile/profile-labels';
import { useSignOut } from '../../hooks/use-sign-out';
import { useAuthStore } from '../../store/auth-store';
import { colors } from '../../theme/tokens';

/** Sheet for changing the complete name (saved in UPPERCASE by the server). */
function EditNameSheet({ currentName, onClose }: { currentName: string; onClose: () => void }) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const setProfile = useAuthStore((state) => state.setProfile);
  const [fullName, setFullName] = useState(currentName);
  const trimmedName = fullName.trim();

  const update = useMutation({
    mutationFn: () => authApi.updateFullName(trimmedName),
    onSuccess: (profile) => {
      setProfile(profile);
      showToast('Your name was saved');
      onClose();
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const saveName = async () => {
    const isConfirmed = await confirm({
      title: 'Save this name?',
      message: 'This name shows on your orders and records.',
      details: [{ label: 'Name', value: trimmedName.toUpperCase() }],
      confirmLabel: 'Yes, save',
      icon: 'person',
    });
    if (isConfirmed) update.mutate();
  };

  return (
    <BottomSheet
      isVisible
      title="Change my name"
      onClose={onClose}
      footer={
        <Button
          label="Save name"
          size="lg"
          fullWidth
          isLoading={update.isPending}
          isDisabled={trimmedName.length < 3}
          onPress={() => void saveName()}
        />
      }
    >
      <TextField
        label="Complete name"
        value={fullName}
        onChangeText={setFullName}
        placeholder="First name, middle name, last name"
        autoCapitalize="characters"
        leftIcon="person-outline"
        helperText="Example: LEO ISIDRO DUMANGAS"
      />
    </BottomSheet>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const confirm = useConfirm();
  const signOut = useSignOut();
  const { showToast } = useToast();
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  const uploadAvatar = useMutation({
    mutationFn: (imageDataUri: string) => accountApi.uploadAvatar(imageDataUri),
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      showToast('Your photo was saved');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const removeAvatar = useMutation({
    mutationFn: accountApi.removeAvatar,
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      showToast('Your photo was removed');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  if (!profile) return null;

  const choosePhoto = async (source: AvatarSource) => {
    setIsPhotoSheetVisible(false);
    const picked = await pickAvatarImage(source);
    if (picked.status === 'error') showToast(picked.message, 'error');
    if (picked.status === 'picked') uploadAvatar.mutate(picked.imageDataUri);
  };

  const removePhoto = async () => {
    setIsPhotoSheetVisible(false);
    const isConfirmed = await confirm({
      title: 'Remove your photo?',
      message: 'Your initials will be shown instead.',
      confirmLabel: 'Yes, remove photo',
      tone: 'danger',
      icon: 'trash',
    });
    if (isConfirmed) removeAvatar.mutate();
  };

  const isSavingPhoto = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <Screen header={<ScreenHeader title="My profile" showBackButton />}>
      <Card className="items-center gap-3 py-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change my photo"
          onPress={() => setIsPhotoSheetVisible(true)}
          disabled={isSavingPhoto}
        >
          <Avatar fullName={profile.fullName} imageUri={profile.avatarImage} size={104} />
          <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-brand">
            <Icon name="camera" size={17} color={colors.textOnPrimary} />
          </View>
        </Pressable>
        <View className="items-center gap-1">
          <AppText variant="title" className="text-center">
            {profile.fullName ?? 'Your name'}
          </AppText>
          <AppText variant="caption" className="text-ink-muted">
            {profile.email}
          </AppText>
        </View>
        <Badge label={getRoleLabel(profile)} tone="primary" icon="shield-checkmark-outline" />
        <Button
          label={isSavingPhoto ? 'Saving photo…' : profile.avatarImage ? 'Change photo' : 'Add a photo'}
          icon="camera-outline"
          variant="secondary"
          size="sm"
          isDisabled={isSavingPhoto}
          onPress={() => setIsPhotoSheetVisible(true)}
        />
      </Card>

      <SectionHeader title="About you" />
      <ListGroup>
        <ListRow
          title="Name"
          subtitle={profile.fullName ?? 'Not set yet'}
          icon="person-outline"
          onPress={() => setIsEditingName(true)}
        />
      </ListGroup>

      <SectionHeader title="Keep your account safe" />
      <ListGroup>
        <ListRow
          title="Password"
          subtitle={profile.hasPassword ? 'Change your password' : 'Add a password to sign in without Google'}
          icon="lock-closed-outline"
          right={profile.hasPassword ? <Badge label="Set" tone="success" /> : <Badge label="Not set" tone="neutral" />}
          onPress={() => router.push('/profile/password')}
        />
        <ListRow
          title="Two-step sign-in"
          subtitle="Ask for a 6-digit code when signing in"
          icon="shield-checkmark-outline"
          iconTone="success"
          right={profile.isTwoFactorEnabled ? <Badge label="On" tone="success" /> : <Badge label="Off" tone="neutral" />}
          onPress={() => router.push('/profile/two-step')}
        />
        <ListRow
          title="Devices"
          subtitle="Phones and computers where you are signed in"
          icon="phone-portrait-outline"
          iconTone="info"
          onPress={() => router.push('/profile/devices')}
        />
      </ListGroup>

      <SectionHeader title="History" />
      <ListGroup>
        <ListRow
          title="Account history"
          subtitle="Everything done with your account: orders, payments, sign-ins"
          icon="time-outline"
          iconTone="accent"
          onPress={() => router.push('/profile/activity')}
        />
      </ListGroup>

      <ListGroup>
        <ListRow title="Sign out" icon="log-out-outline" iconTone="danger" onPress={() => void signOut()} showChevron={false} />
      </ListGroup>

      <BottomSheet isVisible={isPhotoSheetVisible} title="Profile photo" onClose={() => setIsPhotoSheetVisible(false)}>
        <ListGroup>
          <ListRow title="Take a photo" icon="camera-outline" onPress={() => void choosePhoto('camera')} />
          <ListRow title="Choose from gallery" icon="images-outline" iconTone="accent" onPress={() => void choosePhoto('library')} />
          {profile.avatarImage ? (
            <ListRow title="Remove photo" icon="trash-outline" iconTone="danger" onPress={() => void removePhoto()} showChevron={false} />
          ) : null}
        </ListGroup>
      </BottomSheet>

      {isEditingName ? <EditNameSheet currentName={profile.fullName ?? ''} onClose={() => setIsEditingName(false)} /> : null}
    </Screen>
  );
}
