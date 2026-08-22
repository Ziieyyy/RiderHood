import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import {
  HelpCircle,
  Search,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Phone,
  Mail,
} from 'lucide-react-native';
import { useTranslation } from '../../i18n';

export default function HelpSupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const topics = [
    {
      id: 'topic-1',
      question: 'How do I register a motorcycle?',
      answer: 'Go to Profile or Garage and tap "+ Add Motorcycle". Follow the 4-step wizard to fill in technical specs, odometer reading, and digital document uploads.',
    },
    {
      id: 'topic-2',
      question: 'How do I book a workshop?',
      answer: 'Navigate to Workshops, choose your preferred workshop, select the required services, pick a date & available time slot, and confirm your booking.',
    },
    {
      id: 'topic-3',
      question: 'How do I cancel a booking?',
      answer: 'Go to History or Bookings tab, select your appointment details, and tap "CANCEL APPOINTMENT" if it is still pending or confirmed.',
    },
    {
      id: 'topic-4',
      question: 'How do I change my password?',
      answer: 'Open Profile -> Security & Account -> Change Password. You can also request a password reset email to your registered email address.',
    },
    {
      id: 'topic-5',
      question: 'How does motorcycle health work?',
      answer: 'Health score is calculated based on odometer mileage logs, engine oil service intervals, brake pad age, and tyre condition stored in your profile.',
    },
  ];

  const handleContactWhatsApp = () => {
    Linking.openURL('https://wa.me/60123456789?text=Hello%20RiderHood%20Support');
  };

  const handleContactEmail = () => {
    Linking.openURL('mailto:support@riderhood.my?subject=RiderHood%20Support%20Inquiry');
  };

  const filteredTopics = topics.filter(t =>
    t.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={t('help.title')}
        subtitle={t('help.subtitle')}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search color={COLORS.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('common.search')}
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Popular Topics Accordion */}
        <Text style={styles.sectionTitle}>{t('help.faqTitle').toUpperCase()}</Text>

        <View style={styles.topicsList}>
          {filteredTopics.map(topic => {
            const isExpanded = expandedTopic === topic.id;
            return (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicCard}
                onPress={() => setExpandedTopic(isExpanded ? null : topic.id)}
                activeOpacity={0.8}
              >
                <View style={styles.topicHeader}>
                  <HelpCircle color={COLORS.primary} size={18} />
                  <Text style={styles.topicQuestion}>{topic.question}</Text>
                  <ChevronRight
                    color={COLORS.textMuted}
                    size={16}
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                  />
                </View>
                {isExpanded && <Text style={styles.topicAnswer}>{topic.answer}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Contact & Support Section */}
        <Text style={styles.sectionTitle}>{t('help.contactUs').toUpperCase()}</Text>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>{t('help.contactSupport')}</Text>
          <Text style={styles.contactSub}>{t('help.contactSupportDesc')}</Text>

          <View style={styles.contactBtnsRow}>
            <TouchableOpacity style={styles.contactBtn} onPress={handleContactWhatsApp}>
              <MessageSquare color={COLORS.primary} size={16} />
              <Text style={styles.contactBtnText}>WHATSAPP</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleContactEmail}>
              <Mail color={COLORS.primary} size={16} />
              <Text style={styles.contactBtnText}>{t('help.emailSupport').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report a Problem Launcher */}
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => router.push('/(customer)/report-problem')}
        >
          <AlertCircle color={COLORS.danger} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>{t('settings.reportProblem').toUpperCase()}</Text>
            <Text style={styles.reportSub}>{t('settings.reportProblemDesc')}</Text>
          </View>
          <ChevronRight color={COLORS.textMuted} size={16} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  topicsList: {
    gap: 8,
  },
  topicCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topicQuestion: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  topicAnswer: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  contactCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
    gap: 10,
  },
  contactTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  contactSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  contactBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  contactBtnText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.dangerBg,
    gap: 12,
    marginTop: 4,
  },
  reportTitle: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  reportSub: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
