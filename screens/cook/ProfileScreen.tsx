import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiveFeedCard } from '../../components/cook/LiveFeedCard';
import { CommentsSheet } from '../../components/cook/CommentsSheet';
import { CreatorAvatar } from '../../components/cook/CreatorAvatar';
import { ProfileSettingsMenu } from '../../components/cook/ProfileSettingsMenu';
import { formatCount } from '../../data/lives';
import { useAuth } from '../../contexts/AuthContext';
import {
  deleteCreatorPost,
  applyCreatorProfileToStream,
  displayHandle,
  fetchPostsByCreator,
  setPostThumbnail,
  uploadPostThumbnail,
} from '../../lib/creatorPosts';
import { confirmDestructive, showAlert } from '../../lib/confirmAction';
import { useWebLayout } from '../../hooks/useWebLayout';
import { isProfileSetupIncomplete, updateUserProfile, uploadProfileAvatar } from '../../lib/profiles';
import { StreamThumbnailImage } from '../../components/cook/StreamThumbnailImage';
import { EditProfileScreen } from './EditProfileScreen';
import { CreatePlateScreen } from './CreatePlateScreen';
import { fetchCreatorPlates } from '../../lib/plates';
import type { CreatorPlate } from '../../types/creator';
import { cookTheme } from '../../theme/cookTheme';
import type { LiveStream } from '../../types/live';

function VideoOptionsMenu({
  open,
  onToggle,
  onClose,
  onDelete,
  onChangeThumbnail,
  deleting,
  align = 'right',
  compact = false,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
  onChangeThumbnail: () => void;
  deleting: boolean;
  align?: 'left' | 'right';
  compact?: boolean;
}) {
  const buttonSize = compact ? 28 : 40;
  const iconSize = compact ? 16 : 20;

  return (
    <View className="relative z-30">
      <Pressable
        onPress={onToggle}
        disabled={deleting}
        className="items-center justify-center rounded-full"
        style={{
          width: buttonSize,
          height: buttonSize,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
        accessibilityLabel="Video options"
      >
        {deleting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name="ellipsis-vertical" size={iconSize} color="#fff" />
        )}
      </Pressable>

      {open ? (
        <View
          className="absolute z-50 min-w-[140px] overflow-hidden rounded-xl border border-white/10"
          style={{
            backgroundColor: cookTheme.surface,
            top: buttonSize + 4,
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
          }}
        >
          <Pressable
            onPress={() => {
              onClose();
              onChangeThumbnail();
            }}
            className="flex-row items-center px-4 py-3"
          >
            <Ionicons name="image-outline" size={18} color="#fff" />
            <Text
              className="ml-2.5 text-[14px] text-white"
              style={{ fontFamily: 'DMSans_600SemiBold' }}
            >
              Thumbnail
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onClose();
              onDelete();
            }}
            className="flex-row items-center px-4 py-3"
          >
            <Ionicons name="trash-outline" size={18} color={cookTheme.live} />
            <Text
              className="ml-2.5 text-[14px]"
              style={{ fontFamily: 'DMSans_600SemiBold', color: cookTheme.live }}
            >
              Delete
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type ProfileTab = 'videos' | 'plates';

export function ProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { height, profileWidth, isWeb, isDesktop } = useWebLayout();
  const insets = useSafeAreaInsets();
  const bottomNavInset = 58 + Math.max(insets.bottom, 10);
  const horizontalPad = isDesktop ? 40 : 20;
  const profilePadding = horizontalPad * 2;
  const gridGap = isDesktop ? 16 : 2;
  const tileRatio = isDesktop ? 1.2 : 1.35;
  const cellSize = Math.floor((profileWidth - profilePadding - gridGap * 2) / 3);
  const plateCellSize = Math.floor((profileWidth - profilePadding - gridGap) / 2);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [catalogPlates, setCatalogPlates] = useState<CreatorPlate[]>([]);
  const [profileTab, setProfileTab] = useState<ProfileTab>('videos');
  const [platesLoading, setPlatesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewerMenuOpen, setViewerMenuOpen] = useState(false);
  const [gridMenuId, setGridMenuId] = useState<string | null>(null);
  const [createPlateOpen, setCreatePlateOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [thumbnailBusyId, setThumbnailBusyId] = useState<string | null>(null);
  const [commentStream, setCommentStream] = useState<LiveStream | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const listRef = useRef<FlatList<LiveStream>>(null);

  const loadVideos = useCallback(async () => {
    if (!user?.id) {
      setStreams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const posts = await fetchPostsByCreator(user.id);
      setStreams(posts);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadCatalogPlates = useCallback(async () => {
    if (!user?.id) {
      setCatalogPlates([]);
      setPlatesLoading(false);
      return;
    }
    setPlatesLoading(true);
    try {
      setCatalogPlates(await fetchCreatorPlates(user.id));
    } finally {
      setPlatesLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCatalogPlates();
  }, [loadCatalogPlates]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const totalLikes = useMemo(
    () => streams.reduce((sum, s) => sum + s.likeCount, 0),
    [streams],
  );

  const displayStreams = useMemo(() => {
    if (!profile) return streams;
    return streams.map((stream) => applyCreatorProfileToStream(stream, profile));
  }, [profile, streams]);

  const openVideo = useCallback((index: number) => {
    setViewerMenuOpen(false);
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const deleteStream = useCallback(
    async (stream: LiveStream) => {
      if (!user) return;

      const confirmed = await confirmDestructive(
        'Delete video?',
        `Remove "${stream.dishName}" from your profile? This cannot be undone.`,
      );
      if (!confirmed) return;

      setDeletingId(stream.id);
      setViewerMenuOpen(false);
      setGridMenuId(null);

      try {
        await deleteCreatorPost(stream.id, user.id, {
          bunnyVideoId: stream.bunnyVideoId,
          videoUrl: stream.videoUrl,
        });
        setStreams((prev) => prev.filter((s) => s.id !== stream.id));
        setViewerOpen(false);
      } catch (e) {
        showAlert(
          'Could not delete',
          e instanceof Error ? e.message : 'Delete failed. Try again.',
        );
      } finally {
        setDeletingId(null);
      }
    },
    [user],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) {
      setViewerIndex(first.index);
      setViewerMenuOpen(false);
    }
  }).current;

  const name = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Neighbor';
  const handle = profile ? displayHandle(profile) : '@neighbor';
  const setupIncomplete = isProfileSetupIncomplete(profile);

  const changeThumbnail = useCallback(
    async (stream: LiveStream) => {
      if (!user) return;

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to choose a thumbnail.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]) return;

      setThumbnailBusyId(stream.id);
      setViewerMenuOpen(false);
      setGridMenuId(null);
      try {
        const asset = result.assets[0];
        const publicUrl = await uploadPostThumbnail(
          user.id,
          stream.id,
          asset.uri,
          asset.mimeType ?? 'image/jpeg',
        );
        await setPostThumbnail(stream.id, user.id, publicUrl);
        setStreams((prev) =>
          prev.map((item) =>
            item.id === stream.id
              ? { ...item, thumbnailUrl: publicUrl, coverImage: publicUrl }
              : item,
          ),
        );
      } catch (e) {
        showAlert(
          'Could not update thumbnail',
          e instanceof Error ? e.message : 'Try again.',
        );
      } finally {
        setThumbnailBusyId(null);
      }
    },
    [user],
  );

  const pickProfilePhoto = useCallback(async () => {
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    setAvatarBusy(true);
    try {
      const asset = result.assets[0];
      const publicUrl = await uploadProfileAvatar(user.id, asset.uri, asset.mimeType ?? 'image/jpeg');
      await updateUserProfile(user.id, { avatar_url: publicUrl });
      await refreshProfile();
    } catch (e) {
      Alert.alert(
        'Could not update photo',
        e instanceof Error ? e.message : 'Try again from Settings → Edit profile.',
      );
    } finally {
      setAvatarBusy(false);
    }
  }, [refreshProfile, user]);

  const handleCommentCountChange = useCallback((postId: string, count: number) => {
    setCommentCounts((prev) => {
      if (prev[postId] === count) return prev;
      return { ...prev, [postId]: count };
    });
  }, []);

  return (
    <View
      className={`relative flex-1${isWeb ? ' items-center' : ''}`}
      style={{ backgroundColor: cookTheme.bg }}
    >
      <View
        className="flex-1 self-center"
        style={{
          width: '100%',
          maxWidth: profileWidth,
          ...(isWeb && isDesktop ? { alignSelf: 'center' as const } : undefined),
        }}
      >
      <View
        className="flex-row items-center justify-between pb-2"
        style={{ paddingHorizontal: horizontalPad, paddingTop: isDesktop ? 28 : 16 }}
      >
        <Text
          className="text-white"
          style={{
            fontFamily: 'Syne_700Bold',
            fontSize: isDesktop ? 32 : 28,
            lineHeight: isDesktop ? 40 : 34,
          }}
        >
          Profile
        </Text>
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: cookTheme.surfaceElevated }}
          accessibilityLabel="Settings menu"
        >
          <Ionicons name="menu" size={22} color="#fff" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={cookTheme.accent} size="large" />
        </View>
      ) : (
        <FlatList<LiveStream>
          data={displayStreams}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={{
            gap: gridGap,
            marginBottom: gridGap,
            width: cellSize * 3 + gridGap * 2,
            alignSelf: 'center',
          }}
          contentContainerStyle={{
            paddingHorizontal: horizontalPad,
            paddingBottom: bottomNavInset + (isDesktop ? 32 : 16),
          }}
          onScrollBeginDrag={() => setGridMenuId(null)}
          ListHeaderComponent={
            <View style={{ marginBottom: isDesktop ? 40 : 20, paddingTop: isDesktop ? 12 : 8 }}>
              {setupIncomplete ? (
                <Pressable
                  onPress={() => setEditProfileOpen(true)}
                  className="w-full rounded-2xl border border-white/10"
                  style={{
                    backgroundColor: cookTheme.surfaceElevated,
                    marginBottom: isDesktop ? 28 : 16,
                    paddingHorizontal: isDesktop ? 20 : 16,
                    paddingVertical: isDesktop ? 16 : 12,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-white"
                        style={{ fontFamily: 'DMSans_600SemiBold', fontSize: isDesktop ? 16 : 14 }}
                      >
                        Finish setting up your account
                      </Text>
                      <Text
                        className="mt-1 leading-5"
                        style={{
                          fontFamily: 'DMSans_400Regular',
                          color: cookTheme.textMuted,
                          fontSize: isDesktop ? 14 : 12,
                        }}
                      >
                        Add a profile photo and display name so neighbors recognize you.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={cookTheme.textMuted} />
                  </View>
                </Pressable>
              ) : null}

              <View
                style={
                  isDesktop
                    ? { flexDirection: 'row', alignItems: 'flex-start', gap: 40 }
                    : { alignItems: 'center' }
                }
              >
              <Pressable onPress={() => void pickProfilePhoto()} disabled={avatarBusy} className="relative">
                <CreatorAvatar
                  uri={profile?.avatar_url}
                  name={profile?.display_name ?? user?.email?.split('@')[0]}
                  email={profile?.email ?? user?.email}
                  size={isDesktop ? 148 : 96}
                  style={{ opacity: avatarBusy ? 0.6 : 1 }}
                />
                <View
                  className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2"
                  style={{ backgroundColor: cookTheme.surface, borderColor: cookTheme.bg }}
                >
                  {avatarBusy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#fff" />
                  )}
                </View>
              </Pressable>
              <View style={isDesktop ? { flex: 1, paddingTop: 6 } : { alignItems: 'center' }}>
              <Text
                className="text-white"
                style={{
                  fontFamily: 'Syne_700Bold',
                  fontSize: isDesktop ? 36 : 22,
                  lineHeight: isDesktop ? 44 : 28,
                  marginTop: isDesktop ? 0 : 12,
                  textAlign: isDesktop ? 'left' : 'center',
                }}
              >
                {name}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  color: cookTheme.textMuted,
                  fontSize: isDesktop ? 16 : 14,
                  lineHeight: isDesktop ? 24 : 20,
                  marginTop: 6,
                  textAlign: isDesktop ? 'left' : 'center',
                }}
              >
                {handle}
              </Text>
              {profile?.bio ? (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    color: cookTheme.textMuted,
                    fontSize: isDesktop ? 16 : 13,
                    lineHeight: isDesktop ? 26 : 20,
                    marginTop: isDesktop ? 14 : 12,
                    textAlign: isDesktop ? 'left' : 'center',
                    maxWidth: isDesktop ? 560 : 320,
                  }}
                >
                  {profile.bio}
                </Text>
              ) : null}

              <View
                className="flex-row"
                style={{
                  marginTop: isDesktop ? 22 : 20,
                  gap: isDesktop ? 40 : 32,
                  alignSelf: isDesktop ? 'flex-start' : 'center',
                }}
              >
                <Stat label="Videos" value={String(streams.length)} large={isDesktop} />
                <Stat label="Live" value={String(streams.filter((s) => s.isLive).length)} large={isDesktop} />
                <Stat label="Likes" value={formatCount(totalLikes)} large={isDesktop} />
              </View>
              <Pressable
                onPress={() => setEditProfileOpen(true)}
                style={{ marginTop: isDesktop ? 18 : 12, alignSelf: isDesktop ? 'flex-start' : 'center' }}
              >
                <Text
                  className="text-white"
                  style={{ fontFamily: 'DMSans_500Medium', fontSize: isDesktop ? 15 : 13, lineHeight: 22 }}
                >
                  Edit profile
                </Text>
              </Pressable>
              </View>
              </View>

              <View
                className="w-full flex-row border-b border-white/10"
                style={{ marginTop: isDesktop ? 32 : 24 }}
              >
                <View
                  className="flex-1 items-center border-b-2 pb-3 pt-1"
                  style={{ borderColor: cookTheme.accent }}
                >
                  <Ionicons name="grid-outline" size={isDesktop ? 24 : 20} color="#fff" />
                  <Text
                    className="mt-1"
                    style={{ fontFamily: 'DMSans_600SemiBold', color: '#fff', fontSize: isDesktop ? 13 : 11 }}
                  >
                    Videos
                  </Text>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center px-8" style={{ marginTop: isDesktop ? 48 : 24 }}>
              <Ionicons name="videocam-outline" size={isDesktop ? 56 : 40} color={cookTheme.textMuted} />
              <Text
                className="mt-4 text-center text-white"
                style={{ fontFamily: 'DMSans_500Medium', fontSize: isDesktop ? 18 : 15 }}
              >
                No videos yet
              </Text>
              <Text
                className="mt-2 max-w-md text-center leading-6"
                style={{
                  fontFamily: 'DMSans_400Regular',
                  color: cookTheme.textMuted,
                  fontSize: isDesktop ? 15 : 13,
                }}
              >
                Post a short or go live from the Cook tab — set a ticket price so viewers can watch you cook.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const stream = item;
            const isDeleting = deletingId === stream.id;
            const menuOpen = gridMenuId === stream.id;
            return (
              <View style={{ width: cellSize, height: cellSize * tileRatio, opacity: isDeleting ? 0.5 : 1 }}>
                {menuOpen ? (
                  <Pressable
                    className="absolute inset-0 z-20"
                    onPress={() => setGridMenuId(null)}
                  />
                ) : null}
                <Pressable
                  onPress={() => openVideo(index)}
                  disabled={isDeleting}
                  className="h-full w-full"
                >
                  <StreamThumbnailImage stream={stream} className="h-full w-full" />
                  {stream.isLive ? (
                    <View
                      className="absolute left-1 top-1 rounded px-1.5 py-0.5"
                      style={{ backgroundColor: cookTheme.live }}
                    >
                      <Text
                        className="text-[9px] font-bold text-white"
                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                      >
                        LIVE
                      </Text>
                    </View>
                  ) : null}
                  {stream.postType === 'short' ? (
                    <View className="absolute bottom-1 right-1">
                      <Ionicons name="film-outline" size={14} color="#fff" />
                    </View>
                  ) : null}
                  <View className="absolute bottom-1 left-1 flex-row items-center">
                    <Ionicons name="play" size={12} color="#fff" />
                    <Text
                      className="ml-0.5 text-[11px] text-white"
                      style={{ fontFamily: 'DMSans_600SemiBold' }}
                    >
                      {formatCount(stream.viewerCount || stream.likeCount)}
                    </Text>
                  </View>
                </Pressable>
                <View className="absolute right-1 top-1 z-30">
                  <VideoOptionsMenu
                    compact
                    open={menuOpen}
                    onToggle={() => setGridMenuId((current) => (current === stream.id ? null : stream.id))}
                    onClose={() => setGridMenuId(null)}
                    onChangeThumbnail={() => void changeThumbnail(stream)}
                    onDelete={() => void deleteStream(stream)}
                    deleting={isDeleting || thumbnailBusyId === stream.id}
                  />
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={viewerOpen}
        animationType="slide"
        onRequestClose={() => {
          setViewerMenuOpen(false);
          setViewerOpen(false);
        }}
      >
        <View className="flex-1" style={{ backgroundColor: cookTheme.bg }}>
          {viewerMenuOpen ? (
            <Pressable
              className="absolute inset-0 z-10"
              onPress={() => setViewerMenuOpen(false)}
            />
          ) : null}
          <View className="absolute left-4 right-4 top-12 z-20 flex-row items-center justify-between">
            <Pressable
              onPress={() => {
                setViewerMenuOpen(false);
                setViewerOpen(false);
              }}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            {displayStreams[viewerIndex] ? (
              <VideoOptionsMenu
                open={viewerMenuOpen}
                onToggle={() => setViewerMenuOpen((value) => !value)}
                onClose={() => setViewerMenuOpen(false)}
                onChangeThumbnail={() => void changeThumbnail(displayStreams[viewerIndex])}
                onDelete={() => void deleteStream(displayStreams[viewerIndex])}
                deleting={
                  deletingId === displayStreams[viewerIndex]?.id ||
                  thumbnailBusyId === displayStreams[viewerIndex]?.id
                }
              />
            ) : null}
          </View>
          <FlatList
            ref={listRef}
            data={displayStreams}
            keyExtractor={(item) => item.id}
            pagingEnabled
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            onScrollToIndexFailed={(info) => {
              listRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: false,
              });
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <LiveFeedCard
                stream={item}
                height={height}
                isActive={index === viewerIndex}
                shouldPreload={Math.abs(index - viewerIndex) <= 1}
                liked={likedIds.has(item.id)}
                onToggleLike={() =>
                  setLikedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
                onBuyTicket={() => {}}
                onAsk={() => setCommentStream(item)}
                commentCount={commentCounts[item.id] ?? 0}
              />
            )}
          />
        </View>
      </Modal>

      <ProfileSettingsMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

      <CommentsSheet
        visible={commentStream != null}
        stream={commentStream}
        onClose={() => setCommentStream(null)}
        onCommentCountChange={handleCommentCountChange}
      />

      {editProfileOpen ? (
        <View className="absolute inset-0 z-50">
          <EditProfileScreen onBack={() => setEditProfileOpen(false)} />
        </View>
      ) : null}

      {createPlateOpen ? (
        <View className="absolute inset-0 z-50">
          <CreatePlateScreen
            onBack={() => setCreatePlateOpen(false)}
            onCreated={() => void loadCatalogPlates()}
          />
        </View>
      ) : null}
      </View>
    </View>
  );
}

function Stat({ label, value, large = false }: { label: string; value: string; large?: boolean }) {
  return (
    <View className="items-center">
      <Text
        className="text-white"
        style={{ fontFamily: 'Syne_700Bold', fontSize: large ? 22 : 18, lineHeight: large ? 28 : 24 }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          color: cookTheme.textMuted,
          fontSize: large ? 14 : 12,
          lineHeight: large ? 20 : 16,
          marginTop: 4,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
