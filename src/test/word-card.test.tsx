import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WordCard, type AudioPlaybackState } from '../components/WordCard';
import { vocabulary } from '../data';

const fridge = vocabulary['kitchen-fridge'];
const kettle = vocabulary['kitchen-kettle'];

describe('shared word-card pronunciation state', () => {
  it('shows playback only while audio is active and resets for a different word', () => {
    const view = render(<WordCard item={fridge} />);
    const button = screen.getByRole('button', { name: 'Play pronunciation of fridge' });
    expect(button).toHaveTextContent('播放发音');
    expect(screen.queryByText('正在播放...')).not.toBeInTheDocument();

    fireEvent.click(button);
    const utterance = vi.mocked(window.speechSynthesis.speak).mock.calls[0][0];
    act(() => utterance.onstart?.({} as SpeechSynthesisEvent));
    expect(button).toHaveTextContent('再次播放');
    expect(screen.getByText('正在播放...')).toBeVisible();
    act(() => utterance.onend?.({} as SpeechSynthesisEvent));
    expect(button).toHaveTextContent('再次播放');
    expect(screen.queryByText('正在播放...')).not.toBeInTheDocument();

    view.rerender(<WordCard item={kettle} />);
    expect(screen.getByRole('button', { name: 'Play pronunciation of kettle' })).toHaveTextContent('播放发音');
    expect(screen.queryByText('正在播放...')).not.toBeInTheDocument();
  });

  it('reflects one externally started auto-play without speaking again on rerender', () => {
    const active: AudioPlaybackState = { wordId: fridge.id, request: 7, isPlaying: true, error: false };
    const view = render(<WordCard item={fridge} playback={active} />);
    expect(screen.getByRole('button', { name: 'Play pronunciation of fridge' })).toHaveTextContent('再次播放');
    expect(screen.getByText('正在播放...')).toBeVisible();
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();

    view.rerender(<WordCard item={fridge} playback={{ ...active, isPlaying: false }} />);
    expect(screen.queryByText('正在播放...')).not.toBeInTheDocument();
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });
});
