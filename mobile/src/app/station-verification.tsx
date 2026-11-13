import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { stationVerificationApi } from '../api/aquatap-api';
import { getErrorMessage } from '../api/http-client';
import { RoleGate } from '../components/RoleGate';
import {
  AppText,
  Banner,
  Button,
  Card,
  ErrorView,
  LoadingView,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  useConfirm,
  useToast,
} from '../components/ui';
import { DocumentChecklistItem } from '../features/station-verification/DocumentChecklistItem';
import { DocumentPreviewSheet } from '../features/station-verification/DocumentPreviewSheet';
import { documentRequirements } from '../features/station-verification/kyb-labels';
import { pickDocumentImage, type DocumentSource } from '../features/station-verification/pick-document-image';
import { VerificationStatusCard } from '../features/station-verification/VerificationStatusCard';
import { queryKeys } from '../hooks/query-keys';
import { useAuthStore } from '../store/auth-store';
import type { StationDocument, StationDocumentType } from '../types/api.types';

/** Business documents: the station owner shows the business is legitimate (BIR, permits, water test, ID). */
function StationVerificationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  const [registeredBusinessName, setRegisteredBusinessName] = useState('');
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState('');
  const [uploadingDocumentType, setUploadingDocumentType] = useState<StationDocumentType | null>(null);
  const [previewDocument, setPreviewDocument] = useState<StationDocument | null>(null);

  const verificationQuery = useQuery({ queryKey: queryKeys.myStationVerification, queryFn: stationVerificationApi.getMine });
  const verification = verificationQuery.data;

  useEffect(() => {
    if (!verification) return;
    setRegisteredBusinessName(verification.registeredBusinessName ?? '');
    setTaxIdentificationNumber(verification.taxIdentificationNumber ?? '');
  }, [verification?.registeredBusinessName, verification?.taxIdentificationNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshVerification = () => queryClient.invalidateQueries({ queryKey: queryKeys.myStationVerification });

  const saveBusinessInfo = useMutation({
    mutationFn: () => stationVerificationApi.updateBusinessInfo(registeredBusinessName.trim(), taxIdentificationNumber.trim()),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.myStationVerification, updated);
      showToast('Business details saved.');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const submitForReview = useMutation({
    mutationFn: stationVerificationApi.submit,
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.myStationVerification, updated);
      await refreshProfile();
      showToast('Sent! AquaTap will check your documents.');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const uploadedByTypeRef = (documentType: StationDocumentType) =>
    verification?.documents.some((document) => document.documentType === documentType) ?? false;

  const handleUpload = async (documentType: StationDocumentType, source: DocumentSource) => {
    const picked = await pickDocumentImage(source, documentRequirements[documentType].title);
    if (picked.status === 'cancelled') return;
    if (picked.status === 'error') {
      showToast(picked.message, 'error');
      return;
    }
    const isReplacing = uploadedByTypeRef(documentType);
    const isConfirmed = await confirm({
      title: isReplacing ? 'Replace this document?' : 'Upload this document?',
      message: isReplacing ? 'The old photo will be replaced with the new one.' : 'AquaTap will check this photo.',
      details: [
        { label: 'Document', value: documentRequirements[documentType].title },
        { label: 'File', value: picked.fileName },
      ],
      confirmLabel: isReplacing ? 'Yes, replace' : 'Yes, upload',
      tone: isReplacing ? 'warning' : 'primary',
      icon: 'cloud-upload',
    });
    if (!isConfirmed) return;
    setUploadingDocumentType(documentType);
    try {
      await stationVerificationApi.uploadDocument({ documentType, fileName: picked.fileName, fileData: picked.fileData });
      await refreshVerification();
      showToast(`${documentRequirements[documentType].title} uploaded.`);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setUploadingDocumentType(null);
    }
  };

  const handleSubmit = async () => {
    const isConfirmed = await confirm({
      title: 'Send your documents for checking?',
      message: 'You cannot change your documents while AquaTap is checking them.',
      details: [
        { label: 'Business', value: verification?.registeredBusinessName ?? registeredBusinessName.trim() },
        { label: 'Documents', value: `${verification?.documents.length ?? 0} uploaded` },
      ],
      confirmLabel: 'Yes, send',
      icon: 'paper-plane',
    });
    if (isConfirmed) submitForReview.mutate();
  };

  const handleSaveBusinessInfo = async () => {
    const isConfirmed = await confirm({
      title: 'Save your business details?',
      details: [
        { label: 'Business name', value: registeredBusinessName.trim().toUpperCase() },
        { label: 'TIN', value: taxIdentificationNumber.trim() },
      ],
      confirmLabel: 'Yes, save',
      icon: 'business',
    });
    if (isConfirmed) saveBusinessInfo.mutate();
  };

  if (verificationQuery.isLoading) return <LoadingView message="Loading your business documents…" />;
  if (!verification) {
    return (
      <Screen header={<ScreenHeader title="Business documents" showBackButton />}>
        <ErrorView error={verificationQuery.error} onRetry={() => void verificationQuery.refetch()} />
      </Screen>
    );
  }

  const uploadedByType = new Map(verification.documents.map((document) => [document.documentType, document]));
  const uploadedRequiredCount = verification.requiredDocumentTypes.length - verification.missingDocumentTypes.length;
  const hasUnsavedBusinessInfo =
    registeredBusinessName.trim().toUpperCase() !== (verification.registeredBusinessName ?? '') ||
    taxIdentificationNumber.trim() !== (verification.taxIdentificationNumber ?? '');
  const hasSavedBusinessInfo = Boolean(verification.registeredBusinessName && verification.taxIdentificationNumber);
  const canSubmit =
    verification.isEditable && verification.missingDocumentTypes.length === 0 && hasSavedBusinessInfo && !hasUnsavedBusinessInfo;

  return (
    <Screen
      edges={['top', 'bottom']}
      isRefreshing={verificationQuery.isRefetching}
      onRefresh={() => void verificationQuery.refetch()}
      header={
        <ScreenHeader
          title="Business documents"
          subtitle={verification.stationName}
          showBackButton
          onBackPress={() => (router.canGoBack() ? router.back() : router.replace('/staff'))}
        />
      }
      footer={
        verification.isEditable ? (
          <View className="gap-2">
            <AppText variant="caption" className="text-center text-ink-muted">
              {canSubmit
                ? 'Everything is ready. You can send it now.'
                : `${uploadedRequiredCount} of ${verification.requiredDocumentTypes.length} documents uploaded${hasSavedBusinessInfo ? '' : ' · business details missing'}`}
            </AppText>
            <Button
              label="Send for checking"
              icon="paper-plane-outline"
              size="lg"
              fullWidth
              isDisabled={!canSubmit}
              isLoading={submitForReview.isPending}
              onPress={() => void handleSubmit()}
            />
          </View>
        ) : verification.verificationStatus === 'Verified' ? (
          <Button label="Go to my station" icon="storefront-outline" size="lg" fullWidth onPress={() => router.replace('/staff')} />
        ) : null
      }
    >
      <VerificationStatusCard verification={verification} />

      <SectionHeader title="1. Business details" />
      <Card className="gap-4">
        <TextField
          label="Registered business name"
          isRequired
          value={registeredBusinessName}
          onChangeText={setRegisteredBusinessName}
          placeholder="As written on your BIR or DTI paper"
          autoCapitalize="characters"
          editable={verification.isEditable}
          leftIcon="business-outline"
        />
        <TextField
          label="BIR TIN (tax number)"
          isRequired
          value={taxIdentificationNumber}
          onChangeText={setTaxIdentificationNumber}
          placeholder="123-456-789-000"
          keyboardType="number-pad"
          editable={verification.isEditable}
          leftIcon="card-outline"
        />
        {verification.isEditable && hasUnsavedBusinessInfo ? (
          <Button
            label="Save business details"
            icon="save-outline"
            variant="secondary"
            isLoading={saveBusinessInfo.isPending}
            isDisabled={registeredBusinessName.trim().length < 3 || taxIdentificationNumber.trim().length < 9}
            onPress={() => void handleSaveBusinessInfo()}
          />
        ) : null}
      </Card>

      <SectionHeader
        title="2. Documents"
        action={
          <AppText
            variant="label"
            className={uploadedRequiredCount === verification.requiredDocumentTypes.length ? 'text-success' : 'text-ink-muted'}
          >
            {uploadedRequiredCount}/{verification.requiredDocumentTypes.length}
          </AppText>
        }
      />
      <View className="h-2 overflow-hidden rounded-full bg-line">
        <View
          className="h-full rounded-full bg-success"
          style={{ width: `${(uploadedRequiredCount / verification.requiredDocumentTypes.length) * 100}%` }}
        />
      </View>
      <AppText variant="caption" className="text-ink-muted">
        Take a clear photo of each paper. Show all four corners, avoid glare, and make sure the words are easy to read.
      </AppText>

      {[...verification.requiredDocumentTypes, 'Other' as const].map((documentType) => (
        <DocumentChecklistItem
          key={documentType}
          documentType={documentType}
          isRequired={documentType !== 'Other'}
          uploadedDocument={uploadedByType.get(documentType)}
          isEditable={verification.isEditable}
          isUploading={uploadingDocumentType === documentType}
          onUpload={(type, source) => void handleUpload(type, source)}
          onView={setPreviewDocument}
        />
      ))}

      <Banner
        tone="neutral"
        icon="lock-closed-outline"
        message="Only the AquaTap team can see your documents. We use them only to check that your station is a real, registered business."
      />

      <DocumentPreviewSheet
        document={previewDocument}
        loadFile={stationVerificationApi.getDocumentFile}
        onClose={() => setPreviewDocument(null)}
      />
    </Screen>
  );
}

export default function StationVerificationRoute() {
  return (
    <RoleGate allowedRoles={['Admin']}>
      <StationVerificationScreen />
    </RoleGate>
  );
}
