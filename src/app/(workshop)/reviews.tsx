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
import { Star, MessageSquare, CornerDownRight, RefreshCw, Users } from 'lucide-react-native';
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
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSendReply = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text?.trim()) return;

    setReplyLoading(reviewId);
    try {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({ workshop_reply: text.trim() })
        .eq('id', reviewId);

      if (updateError) throw updateError;

      setReviews(reviews.map(r =>
        r.id === reviewId ? { ...r, workshop_reply: text.trim() } : r
      ));
      setReplyText({ ...replyText, [reviewId]: '' });
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error?.message || 'Failed to send reply.');
    } finally {
      setReplyLoading(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <RefreshCw color={COLORS.danger} size={40} />
        <Text style={styles.errorTitle}>Failed to load</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#f59e0b" />}
    >
      {/* Rating Overview — from real data */}
      <View style={styles.overviewCard}>
        <View style={styles.ratingRow}>
          <Text style={styles.bigScore}>{workshop ? Number(workshop.rating).toFixed(1) : avgRating}</Text>
          <View>
            <Text style={styles.stars}>
              {'★'.repeat(Math.round(Number(workshop?.rating ?? avgRating)))}
              {'☆'.repeat(5 - Math.round(Number(workshop?.rating ?? avgRating)))}
            </Text>
            <Text style={styles.totalCount}>
              Based on {workshop?.review_count ?? reviews.length} Verified Customer Review{(workshop?.review_count ?? reviews.length) !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>CUSTOMER REVIEWS & FEEDBACK</Text>

      {reviews.length === 0 ? (
        <View style={styles.emptyState}>
          <Users color={COLORS.textMuted} size={48} />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptyDesc}>Customer reviews will appear here after they complete a service.</Text>
        </View>
      ) : (
        reviews.map(rev => {
          const customer = rev.customer as Record<string, unknown> | undefined;
          return (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.custName}>{(customer?.full_name as string) || 'Customer'}</Text>
                  <Text style={styles.date}>{new Date(rev.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.starBadge}>
                  <Star color="#f59e0b" size={12} />
                  <Text style={styles.starNum}>{rev.rating}.0</Text>
                </View>
              </View>

              <Text style={styles.comment}>{rev.comment || 'No comment provided.'}</Text>

              {/* Existing Reply or Reply Box */}
              {rev.workshop_reply ? (
                <View style={styles.replyBox}>
                  <CornerDownRight color="#f59e0b" size={14} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.replyTitle}>WORKSHOP RESPONSE:</Text>
                    <Text style={styles.replyTextContent}>{rev.workshop_reply}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inputReplyRow}>
                  <TextInput
                    style={styles.replyInput}
                    value={replyText[rev.id] || ''}
                    onChangeText={t => setReplyText({ ...replyText, [rev.id]: t })}
                    placeholder="Type response to customer..."
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <TouchableOpacity
                    style={styles.sendReplyBtn}
                    onPress={() => handleSendReply(rev.id)}
                    disabled={replyLoading === rev.id}
                    accessibilityLabel="Send reply"
                  >
                    {replyLoading === rev.id ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <>
                        <MessageSquare color="#000" size={14} />
                        <Text style={styles.sendText}>Reply</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
  retryBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  overviewCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#3b2f10' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigScore: { color: '#f59e0b', fontSize: 36, fontWeight: '900' },
  stars: { color: '#f59e0b', fontSize: 18 },
  totalCount: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  reviewCard: { backgroundColor: COLORS.surfaceContainer, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  custName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  date: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  starBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3b2f10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b' },
  starNum: { color: '#f59e0b', fontSize: 11, fontWeight: '800' },
  comment: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  replyBox: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3b2f10', marginTop: 4 },
  replyTitle: { color: '#f59e0b', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  replyTextContent: { color: COLORS.textPrimary, fontSize: 12, marginTop: 2 },
  inputReplyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  replyInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, height: 38, color: COLORS.textPrimary, fontSize: 12, borderWidth: 1, borderColor: COLORS.border },
  sendReplyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b', paddingHorizontal: 12, borderRadius: 10 },
  sendText: { color: '#000', fontSize: 12, fontWeight: '800' },
});
