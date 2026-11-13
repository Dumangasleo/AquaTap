import { Platform, View } from 'react-native';
import { AppText, Badge, Button, Icon } from '../../components/ui';
import { colors } from '../../theme/tokens';
import type { StationDocument, StationDocumentType } from '../../types/api.types';
import { cn } from '../../utils/cn';
import { documentRequirements } from './kyb-labels';
import type { DocumentSource } from './pick-document-image';

interface DocumentChecklistItemProps {
  documentType: StationDocumentType;
  isRequired: boolean;
  uploadedDocument: StationDocument | undefined;
  isEditable: boolean;
  isUploading: boolean;
  onUpload: (documentType: StationDocumentType, source: DocumentSource) => void;
  onView: (document: StationDocument) => void;
}

/** One business document: what it is, whether it is uploaded, and buttons to take / replace / view the photo. */
export function DocumentChecklistItem({
  documentType,
  isRequired,
  uploadedDocument,
  isEditable,
  isUploading,
  onUpload,
  onView,
}: DocumentChecklistItemProps) {
  const requirement = documentRequirements[documentType];
  const isUploaded = uploadedDocument !== undefined;

  return (
    <View className={cn('gap-3 rounded-card border border-line bg-surface p-4', isUploaded && 'border-success/40')}>
      <View className="flex-row gap-3">
        <View className={cn('h-11 w-11 items-center justify-center rounded-[14px]', isUploaded ? 'bg-success-soft' : 'bg-brand-soft')}>
          <Icon name={isUploaded ? 'checkmark-circle' : requirement.icon} size={22} color={isUploaded ? colors.success : colors.primary} />
        </View>
        <View className="flex-1 gap-0.5">
          <AppText variant="bodyStrong">{requirement.title}</AppText>
          <AppText variant="caption" className="text-ink-muted">
            {requirement.description}
          </AppText>
        </View>
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        {isUploaded ? (
          <Badge label="Uploaded" tone="success" icon="checkmark" />
        ) : (
          <Badge label={isRequired ? 'Required' : 'Optional'} tone={isRequired ? 'danger' : 'neutral'} />
        )}
        <View className="shrink flex-row flex-wrap justify-end gap-1">
          {uploadedDocument ? <Button label="View" variant="ghost" icon="eye-outline" onPress={() => onView(uploadedDocument)} /> : null}
          {isEditable && Platform.OS !== 'web' ? (
            <Button
              label={isUploaded ? 'Retake' : 'Take photo'}
              icon="camera-outline"
              variant="secondary"
              isLoading={isUploading}
              onPress={() => onUpload(documentType, 'camera')}
            />
          ) : null}
          {isEditable ? (
            <Button
              label={Platform.OS === 'web' ? (isUploaded ? 'Replace' : 'Upload') : 'Gallery'}
              icon="image-outline"
              variant="outline"
              isDisabled={isUploading}
              onPress={() => onUpload(documentType, 'library')}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
