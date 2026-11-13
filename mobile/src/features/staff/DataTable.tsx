import type { ReactNode } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { AppText } from '../../components/ui';
import { colors } from '../../theme/tokens';
import { cn } from '../../utils/cn';

export interface DataTableColumn<TRow> {
  key: string;
  title: string;
  width: number;
  align?: 'left' | 'right' | 'center';
  render: (row: TRow) => ReactNode;
}

interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow) => string | number;
  onRowPress?: (row: TRow) => void;
  rowAccessibilityLabel?: (row: TRow) => string;
}

const ROW_CLASSES = 'min-h-[52px] flex-row items-center border-b border-line';

/** Widest letter of a header (12 px bold UPPERCASE + letter spacing), rounded up so a word always fits. */
const HEADER_LETTER_WIDTH = 9.5;
/** `px-3` on both sides of a cell + a little room. */
const CELL_PADDING = 28;
/** Same limit as the table text, so the columns grow together with the phone's font size. */
const MAX_TABLE_FONT_SCALE = 1.3;

/**
 * Width of a column: the width asked for, but never narrower than the longest word of its header
 * (a narrower column split "RETURNED" into "RETURNE / D"). Grows with the phone's font size;
 * the table scrolls sideways, so a wider column never squeezes the screen.
 */
function getColumnWidth(column: DataTableColumn<unknown>, fontScale: number): number {
  const longestWordLength = Math.max(...column.title.split(/\s+/).map((word) => word.length));
  const headerMinWidth = longestWordLength * HEADER_LETTER_WIDTH + CELL_PADDING;
  const widthScale = Math.min(Math.max(fontScale, 1), MAX_TABLE_FONT_SCALE);
  return Math.round(Math.max(column.width, headerMinWidth) * widthScale);
}

/** Spreadsheet-like grid that scrolls sideways on small phones (zebra rows, fixed header). */
export function DataTable<TRow>({ columns, rows, getRowKey, onRowPress, rowAccessibilityLabel }: DataTableProps<TRow>) {
  const { fontScale } = useWindowDimensions();
  const columnWidths = columns.map((column) => getColumnWidth(column as DataTableColumn<unknown>, fontScale));

  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface">
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View className={cn(ROW_CLASSES, 'min-h-[44px] bg-surface-muted')}>
            {columns.map((column, columnIndex) => (
              <View key={column.key} className={cn('justify-center px-3 py-2', alignClass(column.align))} style={{ width: columnWidths[columnIndex] }}>
                <AppText variant="overline">{column.title}</AppText>
              </View>
            ))}
          </View>
          {rows.map((row, index) => {
            const cells = columns.map((column, columnIndex) => (
              <View key={column.key} className={cn('justify-center px-3 py-2', alignClass(column.align))} style={{ width: columnWidths[columnIndex] }}>
                {column.render(row)}
              </View>
            ));
            const rowClasses = cn(ROW_CLASSES, index % 2 === 1 && 'bg-canvas');
            return onRowPress ? (
              <Pressable
                key={getRowKey(row)}
                accessibilityRole="button"
                accessibilityLabel={rowAccessibilityLabel?.(row)}
                onPress={() => onRowPress(row)}
                className={cn(rowClasses, 'active:bg-brand-soft')}
              >
                {cells}
              </Pressable>
            ) : (
              <View key={getRowKey(row)} className={rowClasses}>
                {cells}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/** Plain table text so every cell uses the same readable size. */
export function CellText({ children, isStrong = false, color = colors.text }: { children: ReactNode; isStrong?: boolean; color?: string }) {
  return (
    <AppText
      variant={isStrong ? 'bodyStrong' : 'body'}
      color={color}
      numberOfLines={2}
      maxFontSizeMultiplier={MAX_TABLE_FONT_SCALE}
      className="text-[15px]"
    >
      {children}
    </AppText>
  );
}

function alignClass(align: DataTableColumn<unknown>['align']) {
  if (align === 'right') return 'items-end';
  if (align === 'center') return 'items-center';
  return undefined;
}
