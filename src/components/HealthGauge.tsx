import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { Activity, ShieldCheck, Wrench } from 'lucide-react-native';

interface HealthGaugeProps {
  score: number;
  bikeName: string;
  status: string;
}

export const HealthGauge: React.FC<HealthGaugeProps> = ({ score, bikeName, status }) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Activity color={COLORS.primary} size={24} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.label}>TELEMETRY HEALTH SCORE</Text>
          <Text style={styles.bikeTitle} numberOfLines={1}>{bikeName}</Text>
        </View>
        <View style={styles.badge}>
          <ShieldCheck color={COLORS.success} size={14} />
          <Text style={styles.badgeText}>GOOD</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreValueContainer}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <Text style={styles.scoreUnit}>/100</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${score}%` }]} />
          </View>
          <Text style={styles.statusDescription}>{status}</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>FRONT TIRE</Text>
          <Text style={styles.metricValue}>34 <Text style={styles.metricSub}>PSI</Text></Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>REAR TIRE</Text>
          <Text style={styles.metricValue}>38 <Text style={styles.metricSub}>PSI</Text></Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>NEXT SERVICE</Text>
          <Text style={styles.metricValue}>1,200 <Text style={styles.metricSub}>KM</Text></Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  titleColumn: {
    flex: 1,
  },
  label: {
    color: COLORS.primaryDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bikeTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  badgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  scoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreUnit: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  progressContainer: {
    flex: 1,
    gap: 6,
  },
  track: {
    height: 8,
    backgroundColor: COLORS.surfaceHighest,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  statusDescription: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  metricLabel: {
    color: COLORS.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  metricSub: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
});
