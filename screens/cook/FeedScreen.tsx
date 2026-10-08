import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { CommentsSheet } from '../../components/cook/CommentsSheet';
import { TicketSheet } from '../../components/cook/DonateSheet';
import { LiveFeedCard } from '../../components/cook/LiveFeedCard';
import { useAuth } from '../../hooks/useAuth';
import { useFeedVideos } from '../../hooks/useFeedVideos';
import { useUserLocation } from '../../hooks/useUserLocation';
import { useWebLayout } from '../../hooks/useWebLayout';
import { applyCreatorProfileToStream, creatorKeyForStream } from '../../lib/creatorPosts';
import { applyStreamDistances, sortStreamsByDistance } from '../../lib/geo';
import { cookTheme } from '../../theme/cookTheme';
import type { LiveStream, TicketOffering } from '../../types/live';
import type { PurchasedTicket } from './types';

type Props = {
  onAddTicket: (stream: LiveStream, ticket: TicketOffering) => void;
  onOpenCreator: (creatorKey: string, postId?: string) => void;
  purchasedTickets: PurchasedTicket[];
  viewerId?: string | null;
  focusStreamId?: string | null;
  onFocusStreamHandled?: () => void;
};

type FeedRowProps = {
  stream: LiveStream;
  index: number;
  feedHeight: number;
  isActive: boolean;
  shouldPreload: boolean;
  liked: boolean;
  commentCount: number;
  purchasedTickets: PurchasedTicket[];
  viewerId?: string | null;
  hasUserLocation: boolean;
  isDesktop: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onToggleLike: (id: string) => void;
  onBuyTicket: (stream: LiveStream) => void;
  onAsk: (stream: LiveStream) => void;
  onAddTicket: (stream: LiveStream, ticket: TicketOffering) => void;
  onOpenCreator: (stream: LiveStream) => void;
  onPrevVideo: (index: number) => void;
  onNextVideo: (index: number) => void;
};

const FeedRow = memo(function FeedRow({
  stream,
  index,
  feedHeight,
  isActive,
  shouldPreload,
  liked,
  commentCount,
  purchasedTickets,
  viewerId,
  hasUserLocation,
  isDesktop,
  canGoPrev,
  canGoNext,
  onToggleLike,
  onBuyTicket,
  onAsk,
  onAddTicket,
  onOpenCreator,
  onPrevVideo,
  onNextVideo,
}: FeedRowProps) {
  return (
    <View className={Platform.OS === 'web' ? 'web-feed-item' : undefined}>
      <LiveFeedCard
        stream={stream}
        height={feedHeight}
        isActive={isActive}
        shouldPreload={shouldPreload}
        liked={liked}
        onToggleLike={() => onToggleLike(stream.id)}
        onBuyTicket={() => onBuyTicket(stream)}
        onAsk={() => onAsk(stream)}
        commentCount={commentCount}
        onAddTicket={(ticket) => onAddTicket(stream, ticket)}
        purchasedTickets={purchasedTickets}
        viewerId={viewerId}
        onOpenCreator={onOpenCreator}
        onPrevVideo={isDesktop ? () => onPrevVideo(index) : undefined}
        onNextVideo={isDesktop ? () => onNextVideo(index) : undefined}
        canGoPrev={isDesktop && canGoPrev}
        canGoNext={isDesktop && canGoNext}
        hasUserLocation={hasUserLocation}
      />
    </View>
  );
});

export function FeedScreen({
  onAddTicket,
  onOpenCreator,
  purchasedTickets,
  viewerId,
  focusStreamId,
  onFocusStreamHandled,
}: Props) {
  const { profile } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const { isDesktop } = useWebLayout();
  const { streams, loading, error, refresh } = useFeedVideos();
  const { location: userLocation, permissionDenied, openSettings } = useUserLocation();
  const displayStreams = useMemo(() => {
    const located = sortStreamsByDistance(applyStreamDistances(streams, userLocation));
    if (!profile) return located;

    return located.map((stream) =>
      stream.creatorId === profile.id ? applyCreatorProfileToStream(stream, profile) : stream,
    );
  }, [streams, userLocation, profile]);

  useEffect(() => {
    if (!profile) return;
    void refresh();
  }, [profile?.avatar_url, profile?.display_name, profile?.handle, refresh]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [ticketStream, setTicketStream] = useState<LiveStream | null>(null);
  const [commentStream, setCommentStream] = useState<LiveStream | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [feedHeight, setFeedHeight] = useState(windowHeight);
  const listRef = useRef<FlatList<LiveStream>>(null);
  const activeIndexRef = useRef(0);
  const feedHeightRef = useRef(feedHeight);
  const streamCountRef = useRef(0);
  feedHeightRef.current = feedHeight;
  streamCountRef.current = displayStreams.length;

  const commitActiveIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, Math.max(streamCountRef.current - 1, 0)));
    if (clamped === activeIndexRef.current) return;
    activeIndexRef.current = clamped;
    setActiveIndex(clamped);
  }, []);

  useEffect(() => {
    if (!focusStreamId || !displayStreams.length) return;
    const index = displayStreams.findIndex((stream) => stream.id === focusStreamId);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true });
      commitActiveIndex(index);
    }
    onFocusStreamHandled?.();
  }, [commitActiveIndex, displayStreams, focusStreamId, onFocusStreamHandled]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || focusStreamId) return;
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('v');
    if (!sharedId || !displayStreams.length) return;
    const index = displayStreams.findIndex((stream) => stream.id === sharedId);
    if (index < 0) return;
    listRef.current?.scrollToIndex({ index, animated: false });
    commitActiveIndex(index);
  }, [commitActiveIndex, displayStreams, focusStreamId]);

  const commitActiveIndexRef = useRef(commitActiveIndex);
  commitActiveIndexRef.current = commitActiveIndex;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) commitActiveIndexRef.current(first.index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onFeedScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const height = Math.max(feedHeightRef.current, 1);
    const position = e.nativeEvent.contentOffset.y / height;
    const index = Math.round(position);
    if (Math.abs(position - index) > 0.2) return;
    commitActiveIndex(index);
  }, [commitActiveIndex]);

  const onFeedScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const height = Math.max(feedHeightRef.current, 1);
    commitActiveIndex(Math.round(e.nativeEvent.contentOffset.y / height));
  }, [commitActiveIndex]);

  const goToVideo = useCallback(
    (index: number) => {
      if (index < 0 || index >= displayStreams.length) return;
      listRef.current?.scrollToIndex({ index, animated: true });
      commitActiveIndex(index);
    },
    [commitActiveIndex, displayStreams.length],
  );

  const handleCommentCountChange = useCallback((postId: string, count: number) => {
    setCommentCounts((prev) => {
      if (prev[postId] === count) return prev;
      return { ...prev, [postId]: count };
    });
  }, []);

  const handleBuyTicket = useCallback((stream: LiveStream) => {
    setTicketStream(stream);
  }, []);

  const handleAsk = useCallback((stream: LiveStream) => {
    setCommentStream(stream);
  }, []);

  const handleOpenCreator = useCallback(
    (stream: LiveStream) => onOpenCreator(creatorKeyForStream(stream), stream.id),
    [onOpenCreator],
  );

  const flatListExtraData = useMemo(
    () => ({ activeIndex, likedIds, commentCounts, purchasedTickets }),
    [activeIndex, likedIds, commentCounts, purchasedTickets],
  );

  const renderFeedRow = useCallback(
    ({ item, index }: { item: LiveStream; index: number }) => (
      <FeedRow
        stream={item}
        index={index}
        feedHeight={feedHeight}
        isActive={index === activeIndex}
        shouldPreload={Math.abs(index - activeIndex) <= 1}
        liked={likedIds.has(item.id)}
        commentCount={commentCounts[item.id] ?? item.commentCount ?? 0}
        purchasedTickets={purchasedTickets}
        viewerId={viewerId}
        hasUserLocation={userLocation != null}
        isDesktop={isDesktop}
        canGoPrev={index > 0}
        canGoNext={index < displayStreams.length - 1}
        onToggleLike={toggleLike}
        onBuyTicket={handleBuyTicket}
        onAsk={handleAsk}
        onAddTicket={onAddTicket}
        onOpenCreator={handleOpenCreator}
        onPrevVideo={goToVideo}
        onNextVideo={goToVideo}
      />
    ),
    [
      activeIndex,
      commentCounts,
      displayStreams.length,
      feedHeight,
      goToVideo,
      handleAsk,
      handleBuyTicket,
      handleOpenCreator,
      isDesktop,
      likedIds,
      onAddTicket,
      purchasedTickets,
      toggleLike,
      userLocation,
      viewerId,
    ],
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: cookTheme.bg }}
      onLayout={(e) => setFeedHeight(e.nativeEvent.layout.height)}
    >
      {permissionDenied && Platform.OS !== 'web' ? (
        <Pressable
          onPress={() => void openSettings()}
          className="absolute left-4 right-4 top-3 z-20 rounded-xl border border-white/10 px-3 py-2.5"
          style={{ backgroundColor: cookTheme.surface }}
        >
          <Text className="text-[12px] text-white" style={{ fontFamily: 'DMSans_500Medium' }}>
            Enable location to sort live cooks by distance and show your position on the map.
          </Text>
          <Text
            className="mt-1 text-[11px]"
            style={{ fontFamily: 'DMSans_400Regular', color: cookTheme.accentSoft }}
          >
            Tap to open Settings
          </Text>
        </Pressable>
      ) : null}
      {loading && displayStreams.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={cookTheme.accent} />
        </View>
      ) : error && displayStreams.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="text-center text-[15px] text-white/80"
            style={{ fontFamily: 'DMSans_500Medium' }}
          >
            {error}
          </Text>
        </View>
      ) : displayStreams.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="text-center text-[15px] text-white/80"
            style={{ fontFamily: 'DMSans_500Medium' }}
          >
            No videos in your Bunny Stream library yet.
          </Text>
        </View>
      ) : (
      <FlatList
        ref={listRef}
        data={displayStreams}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={feedHeight}
        snapToAlignment="start"
        disableIntervalMomentum
        className={Platform.OS === 'web' ? 'web-feed-scroll' : undefined}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={2}
        removeClippedSubviews={false}
        updateCellsBatchingPeriod={50}
        extraData={flatListExtraData}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
        getItemLayout={(_, index) => ({
          length: feedHeight,
          offset: feedHeight * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={onFeedScroll}
        scrollEventThrottle={32}
        onMomentumScrollEnd={onFeedScrollEnd}
        renderItem={renderFeedRow}
      />
      )}

      <TicketSheet
        visible={ticketStream != null}
        stream={ticketStream}
        onClose={() => setTicketStream(null)}
        onAddTicket={(ticket) => {
          if (!ticketStream) return;
          onAddTicket(ticketStream, ticket);
          setTicketStream(null);
        }}
      />

      <CommentsSheet
        visible={commentStream != null}
        stream={commentStream}
        onClose={() => setCommentStream(null)}
        onCommentCountChange={handleCommentCountChange}
      />
    </View>
  );
}
