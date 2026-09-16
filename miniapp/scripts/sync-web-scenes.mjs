import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../..');
const miniappRoot = path.resolve(scriptDirectory, '..');
const server = await createServer({
  root: repositoryRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const data = await server.ssrLoadModule('/src/data.ts');
  const categories = data.categories
    .map(category => ({ ...category, scenes: data.getCategoryScenes(category.id) }))
    .filter(category => category.scenes.length > 0);
  const topics = Object.fromEntries(data.topics.map(topic => [topic.id, topic]));
  const scenes = categories.flatMap(category => category.scenes.map(scene => ({
    ...scene,
    categoryId: category.id,
    chineseTitle: topics[scene.topicId]?.chineseTitle || scene.title,
  })));
  const vocabularyIds = new Set(scenes.flatMap(scene => scene.vocabularyIds));
  const vocabulary = Object.fromEntries([...vocabularyIds].map(id => [id, data.vocabulary[id]]));
  const generated = {
    generatedFrom: 'src/data.ts',
    schemaVersion: 1,
    categories: categories.map(({ scenes: _scenes, ...category }) => category),
    scenes,
    vocabulary,
  };
  const json = `${JSON.stringify(generated, null, 2)}\n`;
  const targets = [
    path.join(miniappRoot, 'src/data/catalog.generated.json'),
    path.join(miniappRoot, 'cloudfunctions/user-service/catalog.generated.json'),
    path.join(miniappRoot, 'cloudfunctions/speech-synthesize/catalog.generated.json'),
  ];
  await Promise.all(targets.map(async target => {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, json, 'utf8');
  }));
  console.log(`Synced ${scenes.length} published scenes and ${vocabularyIds.size} vocabulary items.`);
} finally {
  await server.close();
}
