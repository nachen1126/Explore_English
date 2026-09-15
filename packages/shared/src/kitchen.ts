import type { Hotspot, Scene, VocabularyItem } from './types';

const source = (slug: string) => `https://dictionary.cambridge.org/pronunciation/english/${slug}`;
const word = (id: string, text: string, ipa: string, meaning: string, example: string, aliases: string[]): VocabularyItem => ({
  id, word: text, partOfSpeech: 'noun', britishIPA: ipa, chineseMeaning: meaning,
  exampleSentence: example, acceptedAnswers: aliases, audioText: text,
  ipaSource: source(text.replaceAll(' ', '-')), ipaSources: [source(text.replaceAll(' ', '-'))],
});
const rect = (vocabularyId: string, x: number, y: number, width: number, height: number): Hotspot =>
  ({ vocabularyId, x: x / 1000, y: y / 1000, width: width / 1000, height: height / 1000, shape: 'rect' });
function polygon(vocabularyId: string, vertices: [number, number][]): Hotspot {
  const xs = vertices.map(([x]) => x), ys = vertices.map(([, y]) => y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return {
    ...rect(vocabularyId, x, y, Math.max(...xs) - x, Math.max(...ys) - y),
    shape: 'polygon', points: vertices.map(([a, b]) => [a / 1000, b / 1000]),
  };
}

/** Canonical Kitchen · Cooking content shared by the web and mini-program. */
export const kitchenVocabulary: VocabularyItem[] = [
  word('kitchen-fridge', 'fridge', '/frɪdʒ/', '冰箱', 'Keep the milk in the fridge.', ['fridges', 'refrigerator', 'refrigerators']),
  word('kitchen-sink', 'sink', '/sɪŋk/', '水槽', 'Rinse the vegetables in the sink.', ['sinks', 'kitchen sink']),
  word('kitchen-oven', 'oven', '/ˈʌv.ən/', '烤箱', 'The bread is baking in the oven.', ['ovens']),
  word('kitchen-hob', 'hob', '/hɒb/', '炉灶台面', 'Put the pan on the hob.', ['hobs', 'stovetop', 'stove top', 'cooktop']),
  word('kitchen-kettle', 'kettle', '/ˈket.əl/', '烧水壶', 'Fill the kettle for a cup of tea.', ['kettles', 'electric kettle']),
  word('kitchen-pan', 'pan', '/pæn/', '平底锅', 'Heat a little oil in the pan.', ['pans', 'frying pan', 'frying pans']),
  word('kitchen-chopping-board', 'chopping board', '/ˈtʃɒp.ɪŋ ˌbɔːd/', '砧板', 'Slice the carrots on the chopping board.', ['chopping boards', 'cutting board', 'cutting boards']),
  word('kitchen-cupboard', 'cupboard', '/ˈkʌb.əd/', '橱柜', 'Put the clean plates in the cupboard.', ['cupboards', 'cabinet', 'cabinets', 'wall cupboard', 'kitchen cupboard']),
  word('kitchen-spatula', 'spatula', '/ˈspætʃ.ə.lə/', '锅铲', 'Turn the pancake over with the spatula.', ['spatulas', 'turner', 'fish slice']),
  word('kitchen-microwave', 'microwave', '/ˈmaɪ.krə.weɪv/', '微波炉', 'Warm the soup in the microwave.', ['microwaves', 'microwave oven']),
];

export const kitchenScene: Scene = {
  id: 'kitchen-2', topicId: 'kitchen', title: 'Kitchen · Cooking',
  image: 'scenes/kitchen-cooking.webp', thumbnail: 'scenes/kitchen-cooking-thumb.webp',
  imageWidth: 1536, imageHeight: 1024, published: true, assetStatus: 'final', nextSceneId: null,
  imageVersion: 'kitchen-cooking-v1', hotspotImageVersion: 'kitchen-cooking-v1',
  vocabularyIds: kitchenVocabulary.map(item => item.id),
  hotspots: [
    polygon('kitchen-fridge', [[75,58],[220,56],[258,85],[258,398],[221,439],[221,660],[77,675]]),
    polygon('kitchen-sink', [[781,448],[903,448],[938,474],[868,504],[866,626],[850,622],[783,541]]),
    rect('kitchen-oven',407,441,165,207),
    polygon('kitchen-hob', [[425,386],[561,386],[574,431],[410,431]]),
    rect('kitchen-kettle',614,309,67,105),
    rect('kitchen-pan',602,92,64,187),
    polygon('kitchen-chopping-board', [[275,682],[487,718],[478,790],[537,793],[544,825],[468,849],[459,889],[195,825],[193,788]]),
    rect('kitchen-chopping-board',826,282,46,122),
    rect('kitchen-cupboard',673,17,229,261),
    rect('kitchen-cupboard',235,510,163,136),
    rect('kitchen-cupboard',686,444,78,226),
    polygon('kitchen-cupboard', [[768,542],[812,602],[812,790],[765,693]]),
    polygon('kitchen-cupboard', [[939,607],[1000,648],[1000,1000],[937,891]]),
    polygon('kitchen-spatula', [[546,709],[580,709],[601,740],[605,775],[724,869],[721,899],[697,909],[638,855],[589,794],[550,786],[522,755],[522,734]]),
    rect('kitchen-microwave',248,307,126,104),
  ],
};

export const kitchenVocabularyById = Object.fromEntries(kitchenVocabulary.map(item => [item.id, item])) as Record<string, VocabularyItem>;
