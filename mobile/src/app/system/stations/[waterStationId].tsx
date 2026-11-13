import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { stationReviewsApi } from '../../../api/aquatap-api';
import { getErrorMessage } from '../../../api/http-client';
import {
  BottomSheet,
  Button,
  Card,
  ErrorView,
  KeyValueRow,
  LoadingView,
  Screen,
  ScreenHeader,
  SectionHeader,
  TextField,
  useConfirm,
  useToast,
} from '../../../components/ui';
import { DocumentChecklistItem } from '../../../features/station-verification/DocumentChecklistItem';
import { DocumentPreviewSheet } from '../../../features/station-verification/DocumentPreviewSheet';
import { VerificationStatusCard } from '../../../features/station-verification/VerificationStatusCard';
import { FilterChips } from '../../../features/staff/FilterChips';
import { queryKeys } from '../../../hooks/query-keys';
import type { StationDocument, StationVerification } from '../../../types/api.types';
import { formatDateTime } from '../../../utils/format';

const QUICK_REJECT_REASONS = [
  'A document photo is blurry or cut off',
  'Business permit is expired',
  'Sanitary permit is expired',
  'Water analysis is older than 6 months',
  'Name on documents does not match',
];

/** Reviewer checks the business info and every document, then approves or asks for changes. */
export default function StationReviewScreen() {
  const params = useLocalSearchParams<{ waterStationId: string }>();
  const waterStationId = Number(params.waterStationId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [previewDocument, setPreviewDocument] = useState<StationDocument | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');

  const stationQuery = useQuery({
    queryKey: queryKeys.stationReview(waterStationId),
    queryFn: () => stationReviewsApi.get(waterStationId),
  });

  const onDecision = (updated: StationVerification, message: string) => {
    queryClient.setQueryData(queryKeys.stationReview(waterStationId), updated);
    void queryClient.invalidateQueries({ queryKey: ['station-reviews'] });
    showToast(message);
  };

  const approve = useMutation({
    mutationFn: () => stationReviewsApi.approve(waterStationId),
    onSuccess: (updated) => onDecision(updated, `${updated.stationName} is approved.`),
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });
  const reject = useMutation({
    mutationFn: () => stationReviewsApi.reject(waterStationId, rejectRemarks.trim()),
    onSuccess: (updated) => {
      setIsRejecting(false);
      setRejectRemarks('');
      onDecision(updated, 'Sent back to the owner with your note.');
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const handleApprove = async () => {
    const isConfirmed = await confirm({
      title: 'Approve this station?',
      message: 'The station will become visible to customers in AquaTap.',
      details: [
        { label: 'Station', value: stationQuery.data?.stationName ?? '' },
        { label: 'Business name', value: stationQuery.data?.registeredBusinessName ?? '—' },
      ],
      confirmLabel: 'Yes, approve',
      tone: 'success',
      icon: 'shield-checkmark',
    });
    if (isConfirmed) approve.mutate();
  };

  const handleReject = async () => {
    const isRevoking = stationQuery.data?.verificationStatus === 'Verified';
    const isConfirmed = await confirm({
      title: isRevoking ? 'Take back the approval?' : 'Ask this station for changes?',
      message: 'The owner will see your note and can send new documents.',
      details: [
        { label: 'Station', value: stationQuery.data?.stationName ?? '' },
        { label: 'Note', value: rejectRemarks.trim() },
      ],
      confirmLabel: 'Yes, send note',
      tone: 'danger',
      icon: 'close-circle',
    });
    if (isConfirmed) reject.mutate();
  };

  const station = stationQuery.data;
  if (stationQuery.isLoading) return <LoadingView />;
  if (!station) {
    return (
      <Screen header={<ScreenHeader title="Review station" showBackButton />}>
        <ErrorView error={stationQuery.error} onRetry={() => void stationQuery.refetch()} />
      </Screen>
    );
  }

  const uploadedByType = new Map(station.documents.map((document) => [document.documentType, document]));
  const canDecide = station.verificationStatus === 'UnderReview';

  return (
    <Screen
      edges={['top', 'bottom']}
      header={<ScreenHeader title={station.stationName} subtitle="Check the business documents" showBackButton />}
      footer={
        canDecide ? (
          <View className="flex-row gap-2">
            <Button label="Ask for changes" icon="close-circle-outline" variant="outline" onPress={() => setIsRejecting(true)} className="flex-1" />
            <Button label="Approve" icon="shield-checkmark" variant="success" isLoading={approve.isPending} onPress={() => void handleApprove()} className="flex-1" />
          </View>
        ) : station.verificationStatus === 'Verified' ? (
          <Button label="Take back approval" icon="ban-outline" variant="outline" fullWidth onPress={() => setIsRejecting(true)} />
        ) : null
      }
    >
      <VerificationStatusCard verification={station} />

      <SectionHeader title="Business details" />
      <Card className="gap-1">
        <KeyValueRow label="Station name" value={station.stationName} />
        <KeyValueRow label="Registered business name" value={station.registeredBusinessName ?? '—'} />
        <KeyValueRow label="TIN" value={station.taxIdentificationNumber ?? '—'} />
        <KeyValueRow label="Address" value={station.address} />
        <KeyValueRow label="Contact" value={station.contactNumber} />
        <KeyValueRow label="Owner" value={station.ownerFullName ?? '—'} />
        <KeyValueRow label="Owner email" value={station.ownerEmail ?? '—'} />
        <KeyValueRow label="Joined AquaTap" value={formatDateTime(station.createdAt)} />
      </Card>

      <SectionHeader title="Documents" />
      {[...station.requiredDocumentTypes, 'Other' as const].map((documentType) => (
        <DocumentChecklistItem
          key={documentType}
          documentType={documentType}
          isRequired={documentType !== 'Other'}
          uploadedDocument={uploadedByType.get(documentType)}
          isEditable={false}
          isUploading={false}
          onUpload={() => undefined}
          onView={setPreviewDocument}
        />
      ))}

      <DocumentPreviewSheet
        document={previewDocument}
        loadFile={(stationDocumentId) => stationReviewsApi.getDocumentFile(waterStationId, stationDocumentId)}
        onClose={() => setPreviewDocument(null)}
      />

      <BottomSheet
        isVisible={isRejecting}
        title={station.verificationStatus === 'Verified' ? 'Take back approval' : 'Ask for changes'}
        subtitle="The owner will see this note and can upload new documents."
        onClose={() => setIsRejecting(false)}
        footer={
          <Button
            label="Send note to owner"
            icon="send"
            variant="danger"
            size="lg"
            fullWidth
            isDisabled={rejectRemarks.trim().length < 5}
            isLoading={reject.isPending}
            onPress={() => void handleReject()}
          />
        }
      >
        <FilterChips
          options={QUICK_REJECT_REASONS.map((reason) => ({ value: reason, label: reason }))}
          value={rejectRemarks}
          onChange={setRejectRemarks}
          accessibilityLabel="Common reasons"
        />
        <TextField
          label="Note to the owner"
          isRequired
          value={rejectRemarks}
          onChangeText={setRejectRemarks}
          multiline
          placeholder="Explain what needs to be fixed"
        />
      </BottomSheet>
    </Screen>
  );
}
