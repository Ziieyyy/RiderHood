import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

export interface PromoSlideItem {
  id: string;
  image: any;
  title: string;
  subtitle: string;
  badge: string;
  route: string;
}

export const PROMO_SLIDES: PromoSlideItem[] = [
  {
    id: 'promo-1',
    image: require('../../assets/images/promo1.jpeg'),
    title: 'Wan Legacy Motor - Full Service Special',
    subtitle: 'Servis lengkap, motor lebih lancar! RM65 Sahaja',
    badge: 'SPONSORED DEAL',
    route: '/(customer)/booking',
  },
  {
    id: 'promo-2',
    image: require('../../assets/images/promo2.jpeg'),
    title: 'Engine Oil Deals',
    subtitle: 'Perlindungan enjin maksimum, prestasi optimum bermula RM35',
    badge: 'HOT DEAL',
    route: '/(customer)/booking',
  },
  {
    id: 'promo-3',
    image: require('../../assets/images/promo3.jpeg'),
    title: 'Tyre Special & Replacement',
    subtitle: 'Lebih cengkaman, lebih selamat! Tayar bermula RM45',
    badge: 'SPECIAL OFFER',
    route: '/(customer)/booking',
  },
];

interface PromoCarouselProps {
  slides?: PromoSlideItem[];
  autoPlayInterval?: number;
}

export function PromoCarousel({
  slides = PROMO_SLIDES,
  autoPlayInterval = 5000,
}: PromoCarouselProps) {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { isPhone } = useResponsive();
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active width: fills column/screen width seamlessly
  const activeWidth =
    measuredWidth > 0
      ? measuredWidth
      : Math.max(280, windowWidth - (isPhone ? 32 : 64));

  // Exact 2:1 aspect ratio matching the graphics (1200x600) so picture is 100% full with 0 cropping
  const bannerHeight = Math.round(activeWidth * 0.5);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width);
    if (width > 0 && Math.abs(width - measuredWidth) > 1) {
      setMeasuredWidth(width);
    }
  };

  const scrollToIndex = useCallback(
    (index: number, animated = true) => {
      if (index < 0 || index >= slides.length || activeWidth <= 0) return;
      setActiveIndex(index);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          x: index * activeWidth,
          animated,
        });
      }
    },
    [activeWidth, slides.length]
  );

  // Sync scroll position when container width updates
  useEffect(() => {
    if (scrollRef.current && activeWidth > 0) {
      scrollRef.current.scrollTo({
        x: activeIndex * activeWidth,
        animated: false,
      });
    }
  }, [activeWidth]);

  const handlePrev = () => {
    setIsInteracting(true);
    const target = activeIndex === 0 ? slides.length - 1 : activeIndex - 1;
    scrollToIndex(target, true);
    setTimeout(() => setIsInteracting(false), 4000);
  };

  const handleNext = () => {
    setIsInteracting(true);
    const target = (activeIndex + 1) % slides.length;
    scrollToIndex(target, true);
    setTimeout(() => setIsInteracting(false), 4000);
  };

  // Auto-advance slideshow timer
  useEffect(() => {
    if (isInteracting || slides.length <= 1 || activeWidth <= 0) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        if (scrollRef.current && activeWidth > 0) {
          scrollRef.current.scrollTo({
            x: next * activeWidth,
            animated: true,
          });
        }
        return next;
      });
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isInteracting, slides.length, activeWidth, autoPlayInterval]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    if (activeWidth > 0) {
      const idx = Math.round(offsetX / activeWidth);
      if (idx >= 0 && idx < slides.length && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  };

  const handlePressSlide = (slide: PromoSlideItem) => {
    if (slide.route) {
      router.push(slide.route as any);
    }
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      {/* Header bar with tag, counter, and mini controls */}
      <View style={styles.headerRow}>
        <View style={styles.headerBadge}>
          <Sparkles color={COLORS.primary} size={14} />
          <Text style={styles.headerBadgeText}>PROMOSI & TAWARAN ISTIMEWA</Text>
        </View>

        {/* Counter indicator and mini controls */}
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            {activeIndex + 1} <Text style={styles.counterTotal}>/ {slides.length}</Text>
          </Text>
          <View style={styles.miniArrows}>
            <TouchableOpacity
              style={styles.miniArrowBtn}
              onPress={handlePrev}
              activeOpacity={0.7}
              accessibilityLabel="Previous Promo"
            >
              <ChevronLeft color={COLORS.textPrimary} size={13} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.miniArrowBtn}
              onPress={handleNext}
              activeOpacity={0.7}
              accessibilityLabel="Next Promo"
            >
              <ChevronRight color={COLORS.textPrimary} size={13} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Carousel Area */}
      <View
        style={[
          styles.carouselContainer,
          {
            width: '100%',
            height: bannerHeight,
          },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={32}
          onScrollBeginDrag={() => setIsInteracting(true)}
          onScrollEndDrag={() => setTimeout(() => setIsInteracting(false), 4000)}
          decelerationRate="fast"
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {slides.map((slide) => (
            <TouchableOpacity
              key={slide.id}
              activeOpacity={0.92}
              onPress={() => handlePressSlide(slide)}
              style={[
                styles.slideCard,
                {
                  width: activeWidth,
                  height: bannerHeight,
                },
              ]}
              accessibilityLabel={slide.title}
            >
              <Image
                source={slide.image}
                style={styles.promoImage}
                contentFit="cover"
                transition={200}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Floating Left Arrow Button */}
        <TouchableOpacity
          style={[styles.floatingArrow, styles.leftArrow]}
          onPress={handlePrev}
          activeOpacity={0.8}
          accessibilityLabel="Slide promo left"
        >
          <ChevronLeft color="#FFFFFF" size={20} />
        </TouchableOpacity>

        {/* Floating Right Arrow Button */}
        <TouchableOpacity
          style={[styles.floatingArrow, styles.rightArrow]}
          onPress={handleNext}
          activeOpacity={0.8}
          accessibilityLabel="Slide promo right"
        >
          <ChevronRight color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {/* Dynamic Dot / Pill Pagination Indicator */}
      <View style={styles.paginationRow}>
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <TouchableOpacity
              key={`dot-${slide.id}`}
              onPress={() => {
                setIsInteracting(true);
                scrollToIndex(index, true);
                setTimeout(() => setIsInteracting(false), 4000);
              }}
              style={[
                styles.dot,
                isActive ? styles.activeDot : styles.inactiveDot,
              ]}
              accessibilityLabel={`Go to promo ${index + 1}`}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: 4,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  counterTotal: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  miniArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniArrowBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
      default: {},
    }),
  },
  carouselContainer: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#05070A',
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 22px rgba(0, 0, 0, 0.45)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  slideCard: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#05070A',
  },
  promoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  floatingArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 12, 16, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.5)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
      },
    }),
  },
  leftArrow: {
    left: 8,
  },
  rightArrow: {
    right: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
      default: {},
    }),
  },
  activeDot: {
    width: 22,
    backgroundColor: COLORS.primary,
    ...Platform.select({
      web: {
        boxShadow: '0 0 8px rgba(255, 107, 0, 0.7)',
      },
      default: {},
    }),
  },
  inactiveDot: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
