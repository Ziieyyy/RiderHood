import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { Star, AlertTriangle, Trash2, MessageCircle, Send, X, RefreshCw } from 'lucide-react-native';
import { getAllReviews, syncAllWorkshopsGoogleMetadata } from '../../services/adminService';
import { moderateReview, replyToReview, subscribeToRealtimeReviews } from '../../services/reviewService';

export default function AdminReviewsScreen() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [starFilter, setStarFilter] = useState<number | null>(null); // null = all
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyingReview, setReplyingReview] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadReviews = async () => {
    try {
      const data = await getAllReviews();
      setReviews(data);
    } catch (err) {
      console.log('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();

    // Subscribe to Realtime postgres changes for RiderHood reviews
    const subscription = subscribeToRealtimeReviews(() => {
      console.log('[AdminReviews] Realtime update received, reloading reviews...');
      loadReviews();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleSyncGoogle = async () => {
    setSyncingGoogle(true);
    try {
      const result = await syncAllWorkshopsGoogleMetadata();
      Alert.alert(
        'Google Metadata Synced',
        `Successfully updated Google Place ratings and metadata for ${result.totalSynced} workshop(s)!`
      );
      await loadReviews();
    } catch (err: any) {
      console.error('Failed to sync Google metadata:', err);
      Alert.alert('Sync Error', err?.message || 'Failed to sync Google metadata.');
    } finally {
      setSyncingGoogle(false);
    }
  };



  const handleRemove = async (reviewId: string) => {
    Alert.alert('Remove Review', 'Are you sure you want to remove this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await moderateReview(reviewId, 'removed');
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            Alert.alert('Done', 'Review has been removed.');
          } catch (err: any) {
            console.log('Failed to remove review:', err);
            Alert.alert('Error', 'Could not remove this review.');
          }
        }
      }
    ]);
  };

  const openReplyModal = (review: any) => {
    setReplyingReview(review);
    setReplyText(review.reply || '');
    setReplyModalVisible(true);
  };

  const handleSendReply = async () => {
    if (!replyingReview || !replyText.trim()) {
      Alert.alert('Required', 'Please enter a reply message.');
      return;
    }
    setSendingReply(true);
    try {
      const updated = await replyToReview(replyingReview.id, replyText.trim());
      setReviews(prev =>
        prev.map(r => (r.id === replyingReview.id ? { ...r, reply: updated.reply, reply_at: updated.reply_at } : r))
      );
      setReplyModalVisible(false);
      setReplyingReview(null);
      setReplyText('');
      Alert.alert('Reply Sent', 'Your reply has been posted.');
    } catch (err: any) {
      console.error('Reply error:', err);
      Alert.alert('Error', err?.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const activeReviews = reviews.filter(r => r.status === 'active');
  const filteredReviews = starFilter
    ? activeReviews.filter(r => r.rating === starFilter)
    : activeReviews;

  const lowRatedReviews = activeReviews.filter(r => r.rating <= 2);

  // Stats
  const totalCount = activeReviews.length;
  const avgRating = totalCount > 0
    ? (activeReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalCount).toFixed(1)
    : '0.0';

  const filterOptions = [
    { label: 'All', value: null },
    { label: '5★', value: 5 },
    { label: '4★', value: 4 },
    { label: '3★', value: 3 },
    { label: '2★', value: 2 },
    { label: '1★', value: 1 },
  ];

  const renderReviewCard = (review: any, flagged: boolean = false) => {
    const isGoogle = review.source === 'google' || review.id?.toString().startsWith('google_');
    const userName = isGoogle ? (review.author_name || 'Google User') : (review.customer?.full_name || 'Anonymous');
    const shopName = review.workshop?.name || 'Unknown Workshop';

    return (
      <View key={review.id} style={[styles.card, flagged && styles.reportedCard]}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            {isGoogle && review.author_photo ? (
              <Image source={{ uri: review.author_photo }} style={{ width: 32, height: 32, borderRadius: 16 }} />
            ) : null}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.shopName}>to {shopName}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={styles.ratingBox}>
              <Star color={COLORS.primary} size={12} fill={COLORS.primary} />
              <Text style={styles.ratingText}>{review.rating}.0</Text>
            </View>
            <View style={[styles.sourceBadge, isGoogle && { borderColor: '#4285F4', backgroundColor: 'rgba(66, 133, 244, 0.1)' }]}>
              <Text style={[styles.sourceBadgeText, isGoogle && { color: '#4285F4' }]}>
                {isGoogle ? '🌐 GOOGLE' : '⭐ RIDERHOOD'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.commentText}>"{review.comment || 'No comment'}"</Text>

        {/* Workshop Reply */}
        {review.reply ? (
          <View style={styles.replyBox}>
            <Text style={styles.replyHeader}>Workshop Reply:</Text>
            <Text style={styles.replyContent}>{review.reply}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {flagged && (
            <View style={styles.reportBadge}>
              <AlertTriangle color={COLORS.danger} size={12} />
              <Text style={styles.reportText}>LOW RATING — REVIEW</Text>
            </View>
          )}
          {!flagged && (
            <Text style={styles.dateText}>
              {new Date(review.created_at).toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openReplyModal(review)}>
              <MessageCircle color={COLORS.primary} size={14} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: COLORS.dangerBg }]} onPress={() => handleRemove(review.id)}>
              <Trash2 color={COLORS.danger} size={14} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle color={COLORS.textMuted} size={40} />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptyDesc}>Reviews from customers will appear here once submitted.</Text>
            <TouchableOpacity
              style={[styles.syncBtn, syncingGoogle && { opacity: 0.7 }, { marginTop: 12 }]}
              onPress={handleSyncGoogle}
              disabled={syncingGoogle}
            >
              {syncingGoogle ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <RefreshCw color="#000" size={14} />
              )}
              <Text style={styles.syncBtnText}>{syncingGoogle ? 'SYNCING...' : 'SYNC GOOGLE REVIEWS'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats & Google Sync Banner */}
            <View style={styles.statsBanner}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Star color="#f59e0b" fill="#f59e0b" size={20} />
                  <Text style={styles.statsAvg}>{avgRating}</Text>
                </View>
                <Text style={styles.statsCount}>{totalCount} total review{totalCount !== 1 ? 's' : ''}</Text>
              </View>

              <TouchableOpacity
                style={[styles.syncBtn, syncingGoogle && { opacity: 0.7 }]}
                onPress={handleSyncGoogle}
                disabled={syncingGoogle}
              >
                {syncingGoogle ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <RefreshCw color="#000" size={14} />
                )}
                <Text style={styles.syncBtnText}>{syncingGoogle ? 'SYNCING...' : 'SYNC GOOGLE'}</Text>
              </TouchableOpacity>
            </View>


            {/* Star Filter Tabs */}
            <View style={styles.filterRow}>
              {filterOptions.map(opt => {
                const isActive = starFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setStarFilter(opt.value)}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Flagged Reviews (only when showing All) */}
            {!starFilter && lowRatedReviews.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>FLAGGED REVIEWS ({lowRatedReviews.length})</Text>
                {lowRatedReviews.map(r => renderReviewCard(r, true))}
              </>
            )}

            {/* Filtered Reviews */}
            <Text style={[styles.sectionTitle, !starFilter && lowRatedReviews.length > 0 && { marginTop: 16 }]}>
              {starFilter ? `${starFilter} STAR REVIEWS (${filteredReviews.length})` : `ALL REVIEWS (${filteredReviews.filter(r => r.rating > 2).length})`}
            </Text>
            {(starFilter ? filteredReviews : filteredReviews.filter(r => r.rating > 2)).map(r => renderReviewCard(r, false))}

            {filteredReviews.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyDesc}>No reviews match this filter.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Reply Modal */}
      <Modal visible={replyModalVisible} transparent animationType="fade" onRequestClose={() => setReplyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply to Review</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <X color={COLORS.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            {replyingReview && (
              <View style={{ gap: 6, marginBottom: 12 }}>
                <Text style={styles.modalReviewerName}>{replyingReview.customer?.full_name || 'Anonymous'}</Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} color="#f59e0b" fill={i <= replyingReview.rating ? '#f59e0b' : 'transparent'} size={12} />
                  ))}
                </View>
                <Text style={styles.modalReviewComment}>"{replyingReview.comment || 'No comment'}"</Text>
              </View>
            )}

            <TextInput
              style={styles.replyInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write your reply..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={{ color: COLORS.textMuted, fontSize: 10, textAlign: 'right' }}>{replyText.length}/300</Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReplyModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, (!replyText.trim() || sendingReply) && { opacity: 0.5 }]}
                onPress={handleSendReply}
                disabled={!replyText.trim() || sendingReply}
              >
                <Send color="#000" size={14} />
                <Text style={styles.sendBtnText}>{sendingReply ? 'SENDING...' : 'SEND REPLY'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },

  // Stats Banner
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsAvg: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '900',
  },
  statsCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  syncBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },


  // Filter Pills
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },

  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportedCard: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  shopName: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  sourceBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  sourceBadgeText: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  commentText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 12,
  },
  replyBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginBottom: 12,
  },
  replyHeader: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  replyContent: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  actionBtn: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Reply Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  modalReviewerName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  modalReviewComment: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  replyInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
  },
});
