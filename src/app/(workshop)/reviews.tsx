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
import { COLORS } from '../../constants/theme';
import { Star, MessageSquare, CornerDownRight, RefreshCw, Users, ThumbsUp } from 'lucide-react-native';
import { WorkshopAdminHeader } from '../../components/WorkshopAdminHeader';
import { useAuth } from '../../context/AuthContext';
import { getMyWorkshop } from '../../services/workshopService';
import { getWorkshopReviews } from '../../services/reviewService';
import { supabase } from '../../lib/supabase';
import type { Review, Workshop } from '../../types/database';

export default function WorkshopReviewsScreen() {
  const { profile } = useAuth();
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
      Alert.alert('Response Published', 'Your reply has been saved and is now visible to the customer.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send reply.');
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
        <Text style={styles.loadingText}>Loading Workshop Reviews...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>Failed to load reviews</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <WorkshopAdminHeader
        title="Customer Reviews"
        subtitle={`Average Rating: ${workshop ? Number(workshop.rating).toFixed(1) : avgRating} ★`}
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
              {workshop?.review_count ?? totalCount} Verified Ratings
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
            let label = filter === 'all' ? 'ALL REVIEWS' : filter === 'pending' ? 'PENDING REPLY' : `${filter} STARS`;
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

        <Text style={styles.sectionHeaderTitle}>REVIEWS QUEUE ({filteredReviews.length})</Text>

        {filteredReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={COLORS.textMuted} size={48} />
            <Text style={styles.emptyTitle}>No reviews match filter</Text>
            <Text style={styles.emptyDesc}>Customer reviews for completed services will appear here.</Text>
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

                <Text style={styles.comment}>{rev.comment || 'No written comment provided.'}</Text>

                {/* Existing Reply or Reply Input */}
                {hasReply ? (
                  <View style={styles.replyBox}>
                    <CornerDownRight color={COLORS.primary} size={14} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.replyHeaderLine}>
                        <Text style={styles.replyTitle}>WORKSHOP RESPONSE</Text>
                        <Text style={styles.repliedTag}>REPLIED</Text>
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
                      placeholder="Type official response to customer review..."
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
                          <Text style={styles.sendText}>Publish Response</Text>
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

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 14 },
  overviewCard: { backgroundColor: COLORS.cards, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 18 },
  ratingLeftCol: { alignItems: 'center', gap: 2, paddingRight: 14, borderRightWidth: 1, borderRightColor: COLORS.border },
  bigScore: { color: COLORS.secondaryOrange, fontSize: 36, fontWeight: '900' },
  starsText: { color: COLORS.secondaryOrange, fontSize: 14 },
  totalCountText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  breakdownRightCol: { flex: 1, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barStarLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '800', width: 22 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.secondaryBackground, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: COLORS.secondaryOrange, borderRadius: 3 },
  barCountText: { color: COLORS.textMuted, fontSize: 10, width: 16, textAlign: 'right' },
  filterChipRow: { gap: 8, paddingVertical: 4 },
  filterChip: { backgroundColor: COLORS.cards, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  activeFilterChip: { backgroundColor: 'rgba(255, 107, 0, 0.15)', borderColor: COLORS.primary },
  filterChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800' },
  activeFilterChipText: { color: COLORS.primary },
  sectionHeaderTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10, backgroundColor: COLORS.cards, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 280 },
  reviewCard: { backgroundColor: COLORS.cards, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  custInfoGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  custName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  dateText: { color: COLORS.textMuted, fontSize: 11 },
  starBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.secondaryOrange },
  starNum: { color: COLORS.secondaryOrange, fontSize: 11, fontWeight: '900' },
  comment: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  replyBox: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.secondaryBackground, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  replyHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  replyTitle: { color: COLORS.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  repliedTag: { color: COLORS.success, fontSize: 9, fontWeight: '900' },
  replyTextContent: { color: COLORS.textPrimary, fontSize: 12 },
  inputReplyContainer: { gap: 8 },
  replyInput: { backgroundColor: COLORS.secondaryBackground, borderRadius: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, color: COLORS.textPrimary, fontSize: 12, borderWidth: 1, borderColor: COLORS.border, minHeight: 48, textAlignVertical: 'top' },
  sendReplyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 9, borderRadius: 10 },
  sendText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
