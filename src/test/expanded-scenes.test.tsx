import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { SceneArt } from '../components/SceneArt';
import { getCategoryScenes, getScene, scenes, vocabulary } from '../data';
import { createAttempt, emptyState, learningReducer, loadState, recommendNext, saveState } from '../logic';

const expectedByCategory = {
  'home-living': ['living-room-1', 'bathroom-1', 'laundry-room-1'],
  'food-dining': ['supermarket-2', 'cafe-1'],
  'sports-fitness': ['swimming-pool-1'],
  'beauty-personal-care': ['skin-care-1'],
  'travel-transport': ['hotel-room-1', 'train-station-1'],
  animals: ['underwater-1'],
  'study-work': ['classroom-1'],
} as const;
const expandedIds = Object.values(expectedByCategory).flat();

function mount(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

describe('first scene expansion batch', () => {
  it.each(Object.entries(expectedByCategory))('%s shows every new scene card with its own thumbnail', (category, ids) => {
    mount(`/category/${category}`);
    const main = screen.getByRole('main');
    const cards = new Map<string, HTMLElement>();
    while (true) {
      within(main).getAllByRole('link').forEach(card => cards.set(card.getAttribute('href') ?? '', card));
      const next = within(main).queryByRole('button', { name: 'Next page' });
      if (!next || next.hasAttribute('disabled')) break;
      fireEvent.click(next);
    }
    for (const id of ids) {
      const scene = getScene(id)!;
      const card = cards.get(`/scene/${id}`)!;
      expect(card, id).toBeDefined();
      expect(card).toHaveAccessibleName(`${scene.title} · Start Exploring`);
      expect(within(card).getByRole('img')).toHaveAttribute('src', `/${scene.thumbnail}`);
      expect(card).toHaveTextContent('10 words');
    }
  });

  it.each(expandedIds)('%s renders the matching full image and one usable hotspot for every word', id => {
    const scene = getScene(id)!;
    mount(`/scene/${id}`);
    const image = screen.getByRole('img', { name: /an illustrated place/ });
    expect(image).toHaveAttribute('src', `/${scene.image}`);
    fireEvent.load(image);
    expect(screen.getAllByRole('button', { name: /^Explore / })).toHaveLength(scene.hotspots.length);
    for (const vocabularyId of scene.vocabularyIds) {
      expect(screen.getAllByRole('button', { name: `Explore ${vocabulary[vocabularyId].word}` }).length).toBeGreaterThanOrEqual(1);
    }
  });

  it.each(expandedIds)('%s uses the identical calibrated regions in Explore, Find It and hint states', id => {
    const scene = getScene(id)!;
    const view = render(<SceneArt scene={scene} onTap={() => undefined} />);
    const exploreStyles = [...view.container.querySelectorAll<HTMLElement>('.hotspot')].map(item => item.getAttribute('style'));
    view.rerender(<SceneArt scene={scene} challenge highlight={scene.vocabularyIds[0]} hintPulse onTap={() => undefined} />);
    const challengeStyles = [...view.container.querySelectorAll<HTMLElement>('.hotspot')].map(item => item.getAttribute('style'));
    expect(challengeStyles).toEqual(exploreStyles);
    expect(challengeStyles).toHaveLength(scene.hotspots.length);
  });

  it.each(expandedIds)('%s persists exploration and creates a complete ten-word challenge', id => {
    const scene = getScene(id)!;
    let state = learningReducer(emptyState(), { type: 'discover', sceneId: id, vocabularyId: scene.vocabularyIds[0], at: 1 });
    const attempt = createAttempt(scene, [], 'full', () => 0.9);
    state = learningReducer(state, { type: 'start', attempt });
    saveState(state);
    const restored = loadState(scenes).state;
    expect(restored.scenes[id].explored).toEqual([scene.vocabularyIds[0]]);
    expect(restored.attempts[attempt.id].questions).toHaveLength(10);
    expect(new Set(restored.attempts[attempt.id].questions.map(question => question.vocabularyId))).toEqual(new Set(scene.vocabularyIds));
  });

  it('recommends real published scenes and stays in the same category when one is available', () => {
    const state = emptyState();
    const livingRoom = getScene('living-room-1')!;
    expect(recommendNext(livingRoom, scenes, state)?.id).toBe('bathroom-1');
    for (const id of expandedIds) {
      const current = getScene(id)!;
      const next = recommendNext(current, scenes, state)!;
      expect(next.published).toBe(true);
      expect(next.id).not.toBe(id);
      expect(next.image).not.toBe(current.image);
    }
  });

  it('keeps the published category counts in sync with the expanded catalogue', () => {
    expect(getCategoryScenes('home-living')).toHaveLength(3);
    expect(getCategoryScenes('food-dining')).toHaveLength(3);
    expect(getCategoryScenes('travel-transport')).toHaveLength(3);
    expect(getCategoryScenes('study-work')).toHaveLength(1);
    expect(getCategoryScenes('sports-fitness')).toHaveLength(1);
    expect(getCategoryScenes('beauty-personal-care')).toHaveLength(1);
    expect(getCategoryScenes('animals')).toHaveLength(1);
  });
});
