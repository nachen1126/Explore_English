import type { Scene, VocabularyItem } from './types';
import { polygon as p, region as r } from './hotspots';

const source = (slug: string) => `https://dictionary.cambridge.org/pronunciation/english/${slug}`;
function word(id: string, text: string, ipa: string, meaning: string, example: string, aliases: string[] = [], sources = [text.replaceAll(' ', '-')]): VocabularyItem {
  return { id, word: text, partOfSpeech: 'noun', britishIPA: ipa, chineseMeaning: meaning, exampleSentence: example,
    acceptedAnswers: aliases, audioText: text, ipaSource: source(sources[0]), ipaSources: sources.map(source) };
}

export const firstBatchVocabulary: VocabularyItem[] = [
  word('classroom-teachers-desk', "teacher's desk", "/ˈtiː.tʃəz ˌdesk/", '讲台', "The teacher's desk is at the front of the classroom.", ['teacher desk', 'desk'], ['teacher', 'desk']),
  word('classroom-chair', 'office chair', '/ˈɒf.ɪs ˌtʃeər/', '办公椅', 'The office chair is behind the desk.', ['chair', 'desk chair'], ['office', 'chair']),
  word('classroom-whiteboard', 'whiteboard', '/ˈwaɪt.bɔːd/', '白板', 'Write the new words on the whiteboard.', ['whiteboards']),
  word('classroom-clock', 'wall clock', '/ˈwɔːl ˌklɒk/', '挂钟', 'The wall clock is above the bookshelf.', ['clock'], ['wall', 'clock']),
  word('classroom-bookshelf', 'bookshelf', '/ˈbʊk.ʃelf/', '书架', 'The bookshelf holds the class books.', ['bookcase', 'bookshelves']),
  word('classroom-backpack', 'backpack', '/ˈbæk.pæk/', '双肩包', 'The backpack is beside the bookshelf.', ['school bag', 'rucksack']),
  word('classroom-globe', 'globe', '/ɡləʊb/', '地球仪', 'The globe shows the continents.', ['world globe']),
  word('classroom-projector', 'projector', '/prəˈdʒek.tər/', '投影仪', 'The projector hangs from the ceiling.', ['ceiling projector']),
  word('classroom-laptop', 'laptop', '/ˈlæp.tɒp/', '笔记本电脑', 'The laptop is open on the desk.', ['laptop computer']),
  word('classroom-pencil-case', 'pencil case', '/ˈpen.səl ˌkeɪs/', '铅笔盒', 'The pencil case is next to the laptop.', ['pencil box'], ['pencil', 'case']),

  word('station-ticket-machine', 'ticket machine', '/ˈtɪk.ɪt məˌʃiːn/', '自动售票机', 'Buy a ticket from the ticket machine.', ['ticket kiosk'], ['ticket', 'machine']),
  word('station-departures-board', 'departures board', '/dɪˈpɑː.tʃəz ˌbɔːd/', '出发信息屏', 'Check the departures board for your train.', ['departure board', 'information board'], ['departure', 'board']),
  word('station-clock', 'station clock', '/ˈsteɪ.ʃən ˌklɒk/', '车站时钟', 'The station clock shows the departure time.', ['clock'], ['station', 'clock']),
  word('station-bench', 'bench', '/bentʃ/', '长椅', 'Wait for the train on the bench.', ['seat']),
  word('station-suitcase', 'suitcase', '/ˈsuːt.keɪs/', '行李箱', 'The blue suitcase is ready for the journey.', ['luggage', 'case']),
  word('station-information-desk', 'information desk', '/ˌɪn.fəˈmeɪ.ʃən ˌdesk/', '问讯处', 'Ask for help at the information desk.', ['help desk'], ['information', 'desk']),
  word('station-escalator', 'escalator', '/ˈes.kə.leɪ.tər/', '自动扶梯', 'Take the escalator to the next floor.', ['moving staircase']),
  word('station-rubbish-bin', 'rubbish bin', '/ˈrʌb.ɪʃ ˌbɪn/', '垃圾桶', 'Put the empty cup in the rubbish bin.', ['bin', 'trash can'], ['rubbish', 'bin']),
  word('station-vending-machine', 'vending machine', '/ˈven.dɪŋ məˌʃiːn/', '自动售货机', 'Buy a drink from the vending machine.', ['drinks machine'], ['vending', 'machine']),
  word('station-train', 'train', '/treɪn/', '火车', 'The train is waiting at the platform.', ['passenger train']),
];

export const firstBatchScenes: Scene[] = [
  {
    id: 'classroom-1', topicId: 'classroom', title: 'Classroom', image: 'scenes/study-work/classroom-1.webp',
    thumbnail: 'scenes/study-work/classroom-1-thumb.webp', imageWidth: 1536, imageHeight: 1024,
    imageVersion: 'classroom-1-v1', hotspotImageVersion: 'classroom-1-v1', published: true, assetStatus: 'final', nextSceneId: null,
    vocabularyIds: ['classroom-teachers-desk', 'classroom-chair', 'classroom-whiteboard', 'classroom-clock', 'classroom-bookshelf', 'classroom-backpack', 'classroom-globe', 'classroom-projector', 'classroom-laptop', 'classroom-pencil-case'],
    hotspots: [
      p('classroom-teachers-desk', [[241,590],[686,590],[686,741],[241,741]]),
      p('classroom-chair', [[447,446],[541,446],[554,463],[552,549],[443,549],[442,464]]),
      p('classroom-whiteboard', [[286,151],[719,151],[719,438],[286,438]]),
      r('classroom-clock', 751, 121, 83, 126, 'ellipse'),
      p('classroom-bookshelf', [[808,307],[990,307],[990,745],[808,745]]),
      p('classroom-backpack', [[754,578],[786,578],[803,601],[805,710],[795,740],[735,740],[724,711],[729,615]]),
      r('classroom-globe', 890, 157, 91, 146, 'ellipse'),
      p('classroom-projector', [[474,19],[520,18],[520,50],[543,57],[551,100],[539,113],[469,112],[459,99],[460,58],[474,50]]),
      p('classroom-laptop', [[311,469],[381,468],[393,548],[436,556],[436,567],[326,565]]),
      p('classroom-pencil-case', [[593,533],[641,529],[656,538],[657,567],[646,576],[594,575],[585,566],[586,541]]),
    ],
  },
  {
    id: 'train-station-1', topicId: 'train-station', title: 'Train Station', image: 'scenes/travel-transport/train-station-1.webp',
    thumbnail: 'scenes/travel-transport/train-station-1-thumb.webp', imageWidth: 1536, imageHeight: 1024,
    imageVersion: 'train-station-1-v1', hotspotImageVersion: 'train-station-1-v1', published: true, assetStatus: 'final', nextSceneId: null,
    vocabularyIds: ['station-ticket-machine', 'station-departures-board', 'station-clock', 'station-bench', 'station-suitcase', 'station-information-desk', 'station-escalator', 'station-rubbish-bin', 'station-vending-machine', 'station-train'],
    hotspots: [
      p('station-ticket-machine', [[11,299],[133,299],[139,318],[139,595],[132,614],[10,614],[8,594],[8,319]]),
      p('station-departures-board', [[22,32],[279,64],[290,103],[290,264],[23,227]]),
      r('station-clock', 397, 98, 70, 146, 'ellipse'),
      p('station-bench', [[71,669],[139,620],[407,649],[424,678],[423,899],[341,899],[342,824],[129,821],[128,864],[62,833]]),
      p('station-suitcase', [[656,511],[692,511],[696,620],[710,633],[716,826],[705,856],[633,856],[617,837],[618,639],[653,621]]),
      p('station-information-desk', [[235,452],[250,432],[529,432],[552,452],[552,579],[536,597],[251,597],[235,579]]),
      p('station-escalator', [[729,442],[741,442],[831,242],[839,258],[757,455],[747,544],[728,557]]),
      p('station-rubbish-bin', [[927,545],[981,545],[989,561],[989,731],[981,749],[928,749],[921,731],[921,561]]),
      p('station-vending-machine', [[840,315],[918,315],[918,651],[840,651]]),
      p('station-train', [[291,342],[710,342],[710,428],[291,428]]),
    ],
  },
];
