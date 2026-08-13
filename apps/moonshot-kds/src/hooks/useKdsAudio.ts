import { DEFAULT_KDS_AUDIO } from '@moonshot/domain';
import type { KdsConfig } from '@moonshot/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadKdsSoundMuted, saveKdsSoundMuted } from '../lib/audio/audio-prefs.js';
import {
  createKdsAudioPlayer,
  type KdsAudioPlayerState,
} from '../lib/audio/kds-audio-player.js';

export type { KdsAudioPlayerState };

export function useKdsAudio(kdsConfig: KdsConfig | null): {
  status: KdsAudioPlayerState;
  muted: boolean;
  cafeEnabled: boolean;
  unlock: () => void;
  onHeaderClick: () => void;
  playNewOrder: () => void;
  playOverdue: () => void;
} {
  const playerRef = useRef<ReturnType<typeof createKdsAudioPlayer> | null>(null);
  if (!playerRef.current) {
    playerRef.current = createKdsAudioPlayer();
  }
  const player = playerRef.current;

  const [status, setStatus] = useState<KdsAudioPlayerState>(() => player.getState());
  const [muted, setMuted] = useState(() => loadKdsSoundMuted());

  const configRef = useRef(kdsConfig);
  configRef.current = kdsConfig;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => player.subscribe(() => setStatus(player.getState())), [player]);

  useEffect(() => {
    player.setVolume(kdsConfig?.audio.volume ?? DEFAULT_KDS_AUDIO.volume);
  }, [player, kdsConfig?.audio.volume]);

  const unlock = useCallback((): void => {
    player.unlock();
  }, [player]);

  const playCue = useCallback(
    (kind: 'newOrderSound' | 'overdueSound'): void => {
      const audio = configRef.current?.audio;
      if (!audio?.enabled) return;
      if (mutedRef.current) return;
      const soundId = audio[kind];
      if (!soundId) return;
      player.play(soundId);
    },
    [player],
  );

  const playNewOrder = useCallback((): void => {
    playCue('newOrderSound');
  }, [playCue]);

  const playOverdue = useCallback((): void => {
    playCue('overdueSound');
  }, [playCue]);

  const onHeaderClick = useCallback((): void => {
    // Locked + unmuted: this tap is the iOS unlock gesture, not a mute toggle.
    // Locked + muted: treat as unmute so one tap both resumes and turns sound on.
    if (player.getState() === 'locked' && !mutedRef.current) {
      player.unlock();
      return;
    }
    setMuted((prev) => {
      const next = !prev;
      saveKdsSoundMuted(next);
      if (!next) player.unlock();
      return next;
    });
  }, [player]);

  return {
    status,
    muted,
    cafeEnabled: kdsConfig?.audio.enabled ?? DEFAULT_KDS_AUDIO.enabled,
    unlock,
    onHeaderClick,
    playNewOrder,
    playOverdue,
  };
}
