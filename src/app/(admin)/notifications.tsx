import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../../constants/theme';
import { Send, BellRing, Info } from 'lucide-react-native';
import { broadcastNotification, getRecentBroadcasts } from '../../services/adminService';
import { useTranslation } from '../../i18n';

export default function AdminNotificationsScreen() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBroadcasts = async () => {
    try {
      const data = await getRecentBroadcasts();
      setBroadcasts(data);
    } catch (err) {
      console.log('Error loading broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please enter both a title and message.');
      return;
    }
    setSending(true);
    try {
      await broadcastNotification(title.trim(), message.trim());
      Alert.alert('Sent!', 'Notification broadcast to all active users.');
      setTitle('');
      setMessage('');
      loadBroadcasts();
    } catch (err: any) {
      console.log('Broadcast error:', err);
      Alert.alert('Error', 'Failed to send broadcast. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-MY', { month: 'short', day: 'numeric', year: 'numeric' }) + 
      ', ' + d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent}>
        
        <View style={styles.composeCard}>
          <Text style={styles.composeTitle}>{t('superAdmin.broadcastNotification')}</Text>
          <TextInput 
            style={styles.inputTitle}
            placeholder={`${t('navigation.notifications')} ${t('common.title')}`}
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput 
            style={styles.inputBody}
            placeholder={t('reviews.commentPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, sending && { opacity: 0.6 }]} 
            activeOpacity={0.8} 
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Send color="#000" size={16} />
                <Text style={styles.sendBtnText}>{t('superAdmin.sendToAll')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('superAdmin.recentBroadcasts').toUpperCase()}</Text>
        
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 12 }} />
        ) : broadcasts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Info color={COLORS.textMuted} size={28} />
            <Text style={styles.emptyText}>{t('notifications.noNotifications')}</Text>
          </View>
        ) : (
          broadcasts.map((b) => (
            <View key={b.id} style={styles.historyCard}>
              <View style={styles.historyIcon}>
                <BellRing color={COLORS.primary} size={20} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>{b.title}</Text>
                <Text style={styles.historyDesc}>{b.message}</Text>
                <Text style={styles.historyDate}>{formatDate(b.created_at)}</Text>
              </View>
            </View>
          ))
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
    gap: 16,
  },
  composeCard: {
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    gap: 12,
  },
  composeTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  inputTitle: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    color: COLORS.textPrimary,
  },
  inputBody: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    height: 100,
    color: COLORS.textPrimary,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  sendBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  historyDate: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
