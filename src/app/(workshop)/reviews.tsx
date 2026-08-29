import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { COLORS, DARK_COLORS } from '../../constants/theme';
import { Star, MessageSquare, CornerDownRight, RefreshCw, Users, ThumbsUp } from 'lucide-react-native';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { getMyWorkshop } from '../../services/workshopService';
import { getWorkshopReviews } from '../../services/reviewService';
import { supabase } from '../../lib/supabase';
import type { Review, Workshop } from '../../types/database';
import { useTranslation } from '../../i18n';

export default function WorkshopReviewsScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rating Filter
  const [selectedFilter, setSelectedFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1' | 'pending'>('all');

  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replyLoading, setReplyLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setError(null);
    try {
      const ws = await getMyWorkshop(profile.id);
      setWorkshop(ws);
      if (ws) {
        const data = await getWorkshopReviews(ws.id);
        setReviews(data);
      }
    } catch {
      setError('Failed to load customer reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReply = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text?.trim()) return;

    setReplyLoading(reviewId);
    try {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({
          reply: text.trim(),
          reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (updateError) throw updateError;

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: text.trim(), reply_at: new Date().toISOString() } : r))
      );
      setReplyText({ ...replyText, [reviewId]: '' });
      Alert.alert(t('common.success'), t('workshopAdmin.replySaved'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('errors.saveFailed'));
    } finally {
      setReplyLoading(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (selectedFilter === 'pending') return !r.reply;
    if (selectedFilter === '5') return r.rating === 5;
    if (selectedFilter === '4') return r.rating === 4;
    if (selectedFilter === '3') return r.rating === 3;
    if (selectedFilter === '2') return r.rating === 2;
    if (selectedFilter === '1') return r.rating === 1;
    return true;
  });

  // Calculate Breakdown
  const totalCount = reviews.length;
  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    ratingCounts[star] += 1;
  }

  const avgRating = totalCount > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>{t('errors.genericTitle')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title={t('workshopAdmin.customerReviews')}
        subtitle={`${t('reviews.averageRating')}: ${workshop ? Number(workshop.rating).toFixed(1) : avgRating} ★`}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Rating Breakdown Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.ratingLeftCol}>
            <Text style={styles.bigScore}>{workshop ? Number(workshop.rating).toFixed(1) : avgRating}</Text>
            <Text style={styles.starsText}>
              {'★'.repeat(Math.round(Number(workshop?.rating ?? avgRating)))}
              {'☆'.repeat(5 - Math.round(Number(workshop?.rating ?? avgRating)))}
            </Text>
            <Text style={styles.totalCountText}>
              {workshop?.review_count ?? totalCount} {t('workshopAdmin.reviews')}
            </Text>
          </View>

          <View style={styles.breakdownRightCol}>
            {[5, 4, 3, 2, 1].map((starNum) => {
              const count = ratingCounts[starNum as 1 | 2 | 3 | 4 | 5];
              const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
              return (
                <View key={starNum} style={styles.barRow}>
                  <Text style={styles.barStarLabel}>{starNum}★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barCountText}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
          {(['all', 'pending', '5', '4', '3', '2', '1'] as const).map((filter) => {
            const isSel = selectedFilter === filter;
            let label =
              filter === 'all'
                ? t('reviews.allReviews').toUpperCase()
                : filter === 'pending'
                ? t('reviews.pendingReply').toUpperCase()
                : `${filter} ${t('reviews.ratingStars').toUpperCase()}`;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isSel && styles.activeFilterChip]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[styles.filterChipText, isSel && styles.activeFilterChipText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionHeaderTitle}>{t('workshopAdmin.reviews').toUpperCase()} ({filteredReviews.length})</Text>

        {filteredReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>{t('empty.noReviews')}</Text>
            <Text style={styles.emptyDesc}>{t('empty.noReviewsSub')}</Text>
          </View>
        ) : (
          filteredReviews.map((rev) => {
            const customer = rev.customer as any;
            const hasReply = Boolean(rev.reply || (rev as any).workshop_reply);

            return (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.custInfoGroup}>
                    <View style={styles.avatarBox}>
                      <Text style={styles.avatarText}>
                        {(customer?.full_name || 'Customer').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.custName}>{customer?.full_name || 'Verified Customer'}</Text>
                      <Text style={styles.dateText}>{new Date(rev.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  <View style={styles.starBadge}>
                    <Star color={COLORS.secondaryOrange} size={12} fill={COLORS.secondaryOrange} />
                    <Text style={styles.starNum}>{rev.rating}.0</Text>
                  </View>
                </View>

                <Text style={styles.comment}>{rev.comment || '-'}</Text>

                {/* Existing Reply or Reply Input */}
                {hasReply ? (
                  <View style={styles.replyBox}>
                    <CornerDownRight color={COLORS.primary} size={14} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.replyHeaderLine}>
                        <Text style={styles.replyTitle}>{t('reviews.reply').toUpperCase()}</Text>
                        <Text style={styles.repliedTag}>{t('reviews.replied').toUpperCase()}</Text>
                      </View>
                      <Text style={styles.replyTextContent}>{rev.reply || (rev as any).workshop_reply}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.inputReplyContainer}>
                    <TextInput
                      style={styles.replyInput}
                      value={replyText[rev.id] || ''}
                      onChangeText={(t) => setReplyText({ ...replyText, [rev.id]: t })}
                      placeholder={t('reviews.replyPlaceholder')}
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.sendReplyBtn}
                      onPress={() => handleSendReply(rev.id)}
                      disabled={replyLoading === rev.id}
                      activeOpacity={0.8}
                    >
                      {replyLoading === rev.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MessageSquare color="#FFFFFF" size={14} />
                          <Text style={styles.sendText}>{t('reviews.reply')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof DARK_COLORS, isDark: boolean) =>
  StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: colors.background },
    loadingText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    errorTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
    retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    retryText: { color: isDark ? '#000000' : '#FFFFFF', fontWeight: '800', fontSize: 13 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40, gap: 14 },
    overviewCard: { backgroundColor: colors.cards, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 18 },
    ratingLeftCol: { alignItems: 'center', gap: 2, paddingRight: 14, borderRightWidth: 1, borderRightColor: colors.border },
    bigScore: { color: colors.secondaryOrange, fontSize: 36, fontWeight: '900' },
    starsText: { color: colors.secondaryOrange, fontSize: 14 },
    totalCountText: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
    breakdownRightCol: { flex: 1, gap: 4 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barStarLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', width: 22 },
    barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.secondaryBackground, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: colors.secondaryOrange, borderRadius: 3 },
    barCountText: { color: colors.textMuted, fontSize: 10, width: 16, textAlign: 'right' },
    filterChipRow: { gap: 8, paddingVertical: 4 },
    filterChip: { backgroundColor: colors.cards, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
    activeFilterChip: { backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.12)', borderColor: colors.primary },
    filterChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
    activeFilterChipText: { color: colors.primary },
    sectionHeaderTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
    emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10, backgroundColor: colors.cards, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
    emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    emptyDesc: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 280 },
    reviewCard: { backgroundColor: colors.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    custInfoGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: isDark ? '#000000' : '#FFFFFF', fontSize: 12, fontWeight: '900' },
    custName: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
    dateText: { color: colors.textMuted, fontSize: 11 },
    starBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.secondaryOrange },
    starNum: { color: colors.secondaryOrange, fontSize: 11, fontWeight: '900' },
    comment: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    replyBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.secondaryBackground, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    replyHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    replyTitle: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    repliedTag: { color: colors.success, fontSize: 9, fontWeight: '900' },
    replyTextContent: { color: colors.textPrimary, fontSize: 12 },
    inputReplyContainer: { gap: 8 },
    replyInput: { backgroundColor: colors.secondaryBackground, borderRadius: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, color: colors.textPrimary, fontSize: 12, borderWidth: 1, borderColor: colors.border, minHeight: 48, textAlignVertical: 'top' },
    sendReplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 9, borderRadius: 10 },
    sendText: { color: isDark ? '#000000' : '#FFFFFF', fontSize: 12, fontWeight: '800' },
  });
