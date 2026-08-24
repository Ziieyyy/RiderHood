import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

export interface ColumnDef<T> {
  key: string;
  header: string;
  flex?: number;
  width?: number;
  align?: 'left' | 'center' | 'right';
  render: (item: T, index: number) => React.ReactNode;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string;
  onRowPress?: (item: T) => void;
  renderMobileCard?: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * ResponsiveTable
 * On Tablet and Desktop: Renders a structured data table.
 * On Phone: Automatically renders each item using `renderMobileCard` or fallback mobile card layout.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowPress,
  renderMobileCard,
  emptyState,
  style,
}: ResponsiveTableProps<T>) {
  const { isPhone } = useResponsive();

  if (!data || data.length === 0) {
    return <View style={[styles.emptyContainer, style]}>{emptyState || <Text style={styles.emptyText}>No records found</Text>}</View>;
  }

  // Mobile View: Cards list
  if (isPhone) {
    return (
      <View style={[styles.mobileListContainer, style]}>
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          if (renderMobileCard) {
            return <React.Fragment key={key}>{renderMobileCard(item, index)}</React.Fragment>;
          }

          // Default fallback card
          return (
            <TouchableOpacity
              key={key}
              style={styles.defaultMobileCard}
              onPress={() => onRowPress && onRowPress(item)}
              disabled={!onRowPress}
              activeOpacity={0.8}
            >
              {columns.map((col) => (
                <View key={col.key} style={styles.mobileCardRow}>
                  <Text style={styles.mobileCardHeader}>{col.header}</Text>
                  <View style={styles.mobileCardValue}>{col.render(item, index)}</View>
                </View>
              ))}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Tablet / Desktop View: Full Data Table
  return (
    <View style={[styles.tableContainer, style]}>
      {/* Table Header */}
      <View style={styles.tableHeaderRow}>
        {columns.map((col) => (
          <View
            key={col.key}
            style={[
              styles.headerCell,
              col.width ? { width: col.width } : { flex: col.flex || 1 },
              col.align === 'right' ? { alignItems: 'flex-end' } : col.align === 'center' ? { alignItems: 'center' } : { alignItems: 'flex-start' },
            ]}
          >
            <Text style={styles.headerText}>{col.header.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* Table Rows */}
      {data.map((item, rowIndex) => {
        const key = keyExtractor(item, rowIndex);
        const isEven = rowIndex % 2 === 0;

        const rowContent = (
          <View
            style={[
              styles.tableRow,
              isEven ? styles.evenRow : styles.oddRow,
              onRowPress && styles.clickableRow,
            ]}
          >
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.cell,
                  col.width ? { width: col.width } : { flex: col.flex || 1 },
                  col.align === 'right' ? { alignItems: 'flex-end' } : col.align === 'center' ? { alignItems: 'center' } : { alignItems: 'flex-start' },
                ]}
              >
                {col.render(item, rowIndex)}
              </View>
            ))}
          </View>
        );

        if (onRowPress) {
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onRowPress(item)}
              activeOpacity={0.7}
            >
              {rowContent}
            </TouchableOpacity>
          );
        }

        return <React.Fragment key={key}>{rowContent}</React.Fragment>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    backgroundColor: COLORS.cards,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderHighlight,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerCell: {
    paddingHorizontal: 8,
  },
  headerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  evenRow: {
    backgroundColor: COLORS.cards,
  },
  oddRow: {
    backgroundColor: COLORS.surfaceContainer,
  },
  clickableRow: {
    // Hover / tap indication
  },
  cell: {
    paddingHorizontal: 8,
  },
  mobileListContainer: {
    gap: 12,
    width: '100%',
  },
  defaultMobileCard: {
    backgroundColor: COLORS.cards,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 8,
  },
  mobileCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  mobileCardHeader: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  mobileCardValue: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
