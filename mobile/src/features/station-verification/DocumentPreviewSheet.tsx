import { useQuery } from '@tanstack/react-query';
import { Image, View } from 'react-native';
import { AppText, BottomSheet, ErrorView, LoadingView } from '../../components/ui';
import { queryKeys } from '../../hooks/query-keys';
import type { StationDocument, StationDocumentFile } from '../../types/api.types';
import { formatDateTime } from '../../utils/format';
import { documentRequirements } from './kyb-labels';

interface DocumentPreviewSheetProps {
  document: StationDocument | null;
  loadFile: (stationDocumentId: number) => Promise<StationDocumentFile>;
  onClose: () => void;
}

/** Shows the full uploaded document (files are loaded only when opened, to keep lists light). */
export function DocumentPreviewSheet({ document, loadFile, onClose }: DocumentPreviewSheetProps) {
  const fileQuery = useQuery({
    queryKey: queryKeys.stationDocumentFile(document?.stationDocumentId ?? 0),
    queryFn: () => loadFile(document!.stationDocumentId),
    enabled: document !== null,
  });

  return (
    <BottomSheet
      isVisible={document !== null}
      title={document ? documentRequirements[document.documentType].title : ''}
      subtitle={document ? `${document.fileName} · uploaded ${formatDateTime(document.uploadedAt)}` : undefined}
      onClose={onClose}
    >
      {fileQuery.isLoading ? <LoadingView message="Opening document…" /> : null}
      {fileQuery.isError ? <ErrorView error={fileQuery.error} onRetry={() => void fileQuery.refetch()} /> : null}
      {fileQuery.data ? (
        fileQuery.data.mimeType.startsWith('image/') ? (
          <View className="overflow-hidden rounded-field bg-surface-muted">
            <Image source={{ uri: fileQuery.data.fileData }} className="h-[460px] w-full" resizeMode="contain" accessibilityLabel={document?.fileName} />
          </View>
        ) : (
          <AppText className="text-ink-muted">This document is a PDF. Open it on the AquaTap website to see it.</AppText>
        )
      ) : null}
    </BottomSheet>
  );
}
