import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { bunnyCdnRequestHeaders, isBunnyCdnUrl, resolveStreamVideoSource } from '../../lib/bunnyStream';
import { cookTheme } from '../../theme/cookTheme';
import type { LiveStream } from '../../types/live';

type Props = {
  stream: LiveStream;
  isActive: boolean;
  /** Keep the player mounted for adjacent feed items so swipes feel instant. */
  shouldPreload?: boolean;
  posterUri: string;
  locked?: boolean;
  onBuyTicket?: () => void;
};

export type FeedVideoPlayerRef = {
  togglePlayback: () => void;
};

function posterSourceFor(uri: string) {
  return isBunnyCdnUrl(uri)
    ? { uri, headers: bunnyCdnRequestHeaders() }
    : { uri };
}

const FeedVideoPoster = memo(function FeedVideoPoster({
  posterUri,
  locked = false,
  stream,
  onBuyTicket,
  comingSoon = false,
}: Pick<Props, 'posterUri' | 'locked' | 'stream' | 'onBuyTicket'> & { comingSoon?: boolean }) {
  const posterSource = useMemo(() => posterSourceFor(posterUri), [posterUri]);

  if (comingSoon) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image source={posterSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={styles.lockOverlay} pointerEvents="box-none">
          <View style={styles.lockBadge}>
            <Ionicons name="radio-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.lockTitle}>Live streams coming soon</Text>
          <Text style={styles.lockSubtitle}>
            {stream.chefName} is live — video streaming is on the way. Check back soon!
          </Text>
        </View>
      </View>
    );
  }

  if (locked) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image source={posterSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={styles.lockOverlay} pointerEvents="box-none">
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </View>
          <Text style={styles.lockTitle}>Live stream locked</Text>
          <Text style={styles.lockSubtitle}>
            Buy a ticket to watch {stream.chefName} cook {stream.dishName} live.
          </Text>
          {onBuyTicket ? (
            <Pressable onPress={onBuyTicket} style={styles.buyButton}>
              <Ionicons name="ticket-outline" size={18} color="#fff" />
              <Text style={styles.buyButtonText}>
                Get ticket · ${stream.ticketPrice ?? stream.minDonation}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <Image source={posterSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
  );
});

const FeedVideoPlayerActive = forwardRef<FeedVideoPlayerRef, Props>(function FeedVideoPlayerActive(
  { stream, posterUri, locked = false, onBuyTicket, isActive },
  ref,
) {
  const [userPaused, setUserPaused] = useState(false);
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const comingSoon = stream.isLive;
  const playbackSource = useMemo(() => {
    if (comingSoon || locked) return null;
    const resolved = resolveStreamVideoSource(stream.bunnyVideoId, stream.hlsUrl, stream.videoUrl, {
      preferHls: stream.isLive,
    });
    if (!resolved) return null;
    return {
      uri: resolved.uri,
      contentType: resolved.contentType,
      headers: isBunnyCdnUrl(resolved.uri) ? bunnyCdnRequestHeaders() : undefined,
    };
  }, [comingSoon, locked, stream.bunnyVideoId, stream.hlsUrl, stream.isLive, stream.videoUrl]);
  const posterSource = useMemo(() => posterSourceFor(posterUri), [posterUri]);

  const player = useVideoPlayer(playbackSource, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    setFirstFrameReady(false);
    setUserPaused(false);
  }, [stream.id, playbackSource?.uri]);

  useEffect(() => {
    const current = playerRef.current;
    if (!current || locked || !playbackSource) return;

    try {
      if (isActive && !userPaused) {
        current.muted = false;
        if (!current.playing) current.play();
        return;
      }
      if (current.playing) current.pause();
      current.muted = true;
    } catch (e) {
      console.warn('[FeedVideoPlayer] playback sync failed:', e);
    }
  }, [isActive, locked, playbackSource, userPaused]);

  const togglePlayback = useCallback(() => {
    if (!player || locked || !isActive) return;

    try {
      if (userPaused) {
        player.play();
        setUserPaused(false);
      } else {
        player.pause();
        setUserPaused(true);
      }
    } catch (e) {
      console.warn('[FeedVideoPlayer] toggle playback failed:', e);
    }
  }, [isActive, locked, player, userPaused]);

  useImperativeHandle(ref, () => ({ togglePlayback }), [togglePlayback]);

  if (comingSoon || locked || !playbackSource) {
    return (
      <FeedVideoPoster
        posterUri={posterUri}
        locked={locked}
        stream={stream}
        onBuyTicket={onBuyTicket}
        comingSoon={comingSoon}
      />
    );
  }

  const showPosterCover = !firstFrameReady || userPaused;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={posterSource} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        pointerEvents="none"
        onFirstFrameRender={() => setFirstFrameReady(true)}
      />
      {showPosterCover ? (
        <Image
          source={posterSource}
          style={[StyleSheet.absoluteFill, userPaused ? styles.posterOverlay : undefined]}
          resizeMode="cover"
        />
      ) : null}
      {userPaused ? (
        <View style={styles.playIndicator} pointerEvents="none">
          <Ionicons name="play" size={56} color="rgba(255,255,255,0.92)" />
        </View>
      ) : null}
    </View>
  );
});

export const FeedVideoPlayer = forwardRef<FeedVideoPlayerRef, Props>(function FeedVideoPlayer(
  props,
  ref,
) {
  const shouldMountPlayer = props.isActive || props.shouldPreload;

  if (!shouldMountPlayer) {
    return (
      <FeedVideoPoster
        posterUri={props.posterUri}
        locked={props.locked}
        stream={props.stream}
        onBuyTicket={props.onBuyTicket}
        comingSoon={props.stream.isLive}
      />
    );
  }

  return <FeedVideoPlayerActive ref={ref} {...props} />;
});

const styles = StyleSheet.create({
  posterOverlay: {
    opacity: 0.35,
  },
  playIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 32,
  },
  lockBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },
  lockTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
  },
  lockSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: cookTheme.accent,
  },
  buyButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: '#fff',
    marginLeft: 8,
  },
});
