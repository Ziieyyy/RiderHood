import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { Workshop } from '../types/database';
import { Star, MapPin, Wrench, ChevronRight } from 'lucide-react-native';

import { useTranslation } from '../i18n';

interface WorkshopCardProps {
  workshop: Workshop;
  onBookPress: (workshop: Workshop) => void;
}

export const WorkshopCard: React.FC<WorkshopCardProps> = ({ workshop, onBookPress }) => {
  const { t } = useTranslation();
  const rating = workshop.rating || 5.0;
  const reviewsCount = workshop.review_count || 0;
  const distance = workshop.district ? `${workshop.district}, ${workshop.state || ''}` : 'Nearby';
  const specialties = ['Full Service', 'Tuning', 'Parts'];

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.infoCol}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.nameText}>{workshop.name}</Text>
          </View>
          <View style={styles.ratingLocationRow}>
            <View style={styles.ratingBox}>
              <Star color="#FFC107" size={14} fill="#FFC107" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({reviewsCount})</Text>
            </View>
            <Text style={styles.dot}>•</Text>
            <View style={styles.locationBox}>
              <MapPin color={COLORS.primary} size={12} />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.bookButton}
          activeOpacity={0.8}
          onPress={() => onBookPress(workshop)}
        >
          <Text style={styles.bookButtonText}>{t('booking.title').toUpperCase()}</Text>
          <ChevronRight color={COLORS.primaryDark} size={16} />
        </TouchableOpacity>
      </View>

      <Text style={styles.addressText} numberOfLines={1}>{workshop.address || 'Address on file'}</Text>

      <View style={styles.specialtiesRow}>
        {specialties.map((item, idx) => (
          <View key={idx} style={styles.tag}>
            <Wrench color={COLORS.primaryDim} size={10} />
            <Text style={styles.tagText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.statusText}>{workshop.is_open ? t('workshop.openNow') : t('workshop.closed')}</Text>
        <Text style={styles.priceRange}>{t('workshop.verified')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    paddingRight: 10,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  ratingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  reviewsText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  dot: {
    color: COLORS.textMuted,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    color: COLORS.primaryDim,
    fontSize: 12,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookButtonText: {
    color: COLORS.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 2,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '600',
  },
  priceRange: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
