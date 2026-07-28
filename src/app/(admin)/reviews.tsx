import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../../constants/theme';
import { Star, AlertTriangle, Trash2, MessageCircle } from 'lucide-react-native';
import { getAllReviews } from '../../services/adminService';
import { moderateReview } from '../../services/reviewService';

export default function AdminReviewsScreen() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

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

  const removedReviews = reviews.filter(r => r.status === 'removed');
  const activeReviews = reviews.filter(r => r.status === 'active');
  const lowRatedReviews = activeReviews.filter(r => r.rating <= 2);
  const normalReviews = activeReviews.filter(r => r.rating > 2);

  const renderReviewCard = (review: any, flagged: boolean = false) => {
    const userName = review.customer?.full_name || 'Anonymous';
    const shopName = review.workshop?.name || 'Unknown Workshop';

    return (
      <View key={review.id} style={[styles.card, flagged && styles.reportedCard]}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.shopName}>to {shopName}</Text>
          </View>
          <View style={styles.ratingBox}>
            <Star color={COLORS.primary} size={12} fill={COLORS.primary} />
            <Text style={styles.ratingText}>{review.rating}.0</Text>
          </View>
        </View>
        <Text style={styles.commentText}>"{review.comment || 'No comment'}"</Text>
        
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
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemove(review.id)}>
            <Trash2 color={COLORS.danger} size={16} />
          </TouchableOpacity>
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
          </View>
        ) : (
          <>
            {lowRatedReviews.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>FLAGGED REVIEWS ({lowRatedReviews.length})</Text>
                {lowRatedReviews.map(r => renderReviewCard(r, true))}
              </>
            )}

            <Text style={[styles.sectionTitle, lowRatedReviews.length > 0 && { marginTop: 16 }]}>
              ALL REVIEWS ({normalReviews.length})
            </Text>
            {normalReviews.map(r => renderReviewCard(r, false))}
          </>
        )}
      </ScrollView>
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
  commentText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 16,
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
  deleteBtn: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
});
