import type { Scene, VocabularyItem } from './types';
import { calibratedHotspots } from './hotspots';
import { specialistScenes, specialistVocabulary } from './specialist-content';

// Legacy scene and vocabulary IDs stay immutable so stored progress and attempts remain valid.
// Standalone British door/chair/jar omit Cambridge's linking-r superscript.
const legacyVocabulary: VocabularyItem[] = [
  {
    "id": "kitchen-door",
    "word": "door",
    "partOfSpeech": "noun",
    "britishIPA": "/dɔː/",
    "chineseMeaning": "门",
    "exampleSentence": "Please close the door behind you.",
    "acceptedAnswers": [
      "doors"
    ],
    "audioText": "door",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/door"
  },
  {
    "id": "kitchen-window",
    "word": "window",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈwɪn.dəʊ/",
    "chineseMeaning": "窗户",
    "exampleSentence": "Open the window to let some fresh air in.",
    "acceptedAnswers": [
      "windows"
    ],
    "audioText": "window",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/window"
  },
  {
    "id": "kitchen-table",
    "word": "table",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈteɪ.bəl/",
    "chineseMeaning": "桌子",
    "exampleSentence": "Put the shopping on the table.",
    "acceptedAnswers": [
      "tables"
    ],
    "audioText": "table",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/table"
  },
  {
    "id": "kitchen-chair",
    "word": "chair",
    "partOfSpeech": "noun",
    "britishIPA": "/tʃeə/",
    "chineseMeaning": "椅子",
    "exampleSentence": "Pull up a chair and sit with me.",
    "acceptedAnswers": [
      "chairs"
    ],
    "audioText": "chair",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/chair"
  },
  {
    "id": "kitchen-bottle",
    "word": "bottle",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈbɒt.əl/",
    "chineseMeaning": "瓶子",
    "exampleSentence": "There is a bottle of water on the table.",
    "acceptedAnswers": [
      "bottles",
      "water bottle",
      "water bottles"
    ],
    "audioText": "bottle",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/bottle"
  },
  {
    "id": "kitchen-bag",
    "word": "bag",
    "partOfSpeech": "noun",
    "britishIPA": "/bæɡ/",
    "chineseMeaning": "包",
    "exampleSentence": "I left my bag on the kitchen table.",
    "acceptedAnswers": [
      "bags",
      "handbag",
      "handbags"
    ],
    "audioText": "bag",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/bag"
  },
  {
    "id": "kitchen-clock",
    "word": "clock",
    "partOfSpeech": "noun",
    "britishIPA": "/klɒk/",
    "chineseMeaning": "时钟",
    "exampleSentence": "The clock on the wall says it is nearly lunchtime.",
    "acceptedAnswers": [
      "clocks"
    ],
    "audioText": "clock",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/clock"
  },
  {
    "id": "kitchen-plant",
    "word": "plant",
    "partOfSpeech": "noun",
    "britishIPA": "/plɑːnt/",
    "chineseMeaning": "植物",
    "exampleSentence": "This plant grows well beside the window.",
    "acceptedAnswers": [
      "plants",
      "potted plant",
      "potted plants"
    ],
    "audioText": "plant",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/plant"
  },
  {
    "id": "kitchen-light",
    "word": "light",
    "partOfSpeech": "noun",
    "britishIPA": "/laɪt/",
    "chineseMeaning": "吊灯",
    "exampleSentence": "Switch on the light above the table.",
    "acceptedAnswers": [
      "lights",
      "lamp",
      "lamps",
      "pendant light"
    ],
    "audioText": "light",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/light"
  },
  {
    "id": "kitchen-book",
    "word": "book",
    "partOfSpeech": "noun",
    "britishIPA": "/bʊk/",
    "chineseMeaning": "书",
    "exampleSentence": "I like to read a book while I wait for lunch.",
    "acceptedAnswers": [
      "books"
    ],
    "audioText": "book",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/book"
  },
  {
    "id": "airport-door",
    "word": "door",
    "partOfSpeech": "noun",
    "britishIPA": "/dɔː/",
    "chineseMeaning": "门",
    "exampleSentence": "Go through the door to the waiting area.",
    "acceptedAnswers": [
      "doors"
    ],
    "audioText": "door",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/door"
  },
  {
    "id": "airport-window",
    "word": "window",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈwɪn.dəʊ/",
    "chineseMeaning": "窗户",
    "exampleSentence": "We can watch the planes through this window.",
    "acceptedAnswers": [
      "windows"
    ],
    "audioText": "window",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/window"
  },
  {
    "id": "airport-aeroplane",
    "word": "aeroplane",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈeə.rə.pleɪn/",
    "chineseMeaning": "飞机",
    "exampleSentence": "Our aeroplane is waiting outside the terminal.",
    "acceptedAnswers": [
      "aeroplanes",
      "airplane",
      "airplanes",
      "plane",
      "planes"
    ],
    "audioText": "aeroplane",
    "ipaSource": "https://dictionary.cambridge.org/dictionary/english/aeroplane"
  },
  {
    "id": "airport-plant",
    "word": "plant",
    "partOfSpeech": "noun",
    "britishIPA": "/plɑːnt/",
    "chineseMeaning": "植物",
    "exampleSentence": "A tall plant stands beside the airport lounge door.",
    "acceptedAnswers": [
      "plants",
      "potted plant"
    ],
    "audioText": "plant",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/plant"
  },
  {
    "id": "airport-table",
    "word": "table",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈteɪ.bəl/",
    "chineseMeaning": "桌子",
    "exampleSentence": "We put our things on the table before boarding.",
    "acceptedAnswers": [
      "tables"
    ],
    "audioText": "table",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/table"
  },
  {
    "id": "airport-travel-bag",
    "word": "travel bag",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈtræv.əl ˌbæɡ/",
    "chineseMeaning": "旅行包",
    "exampleSentence": "My travel bag is small enough to carry on board.",
    "acceptedAnswers": [
      "travel bags",
      "bag",
      "bags",
      "hand luggage",
      "luggage"
    ],
    "audioText": "travel bag",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/travel-bag"
  },
  {
    "id": "airport-water-bottle",
    "word": "water bottle",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈwɔː.tə ˌbɒt.əl/",
    "chineseMeaning": "水瓶",
    "exampleSentence": "Fill your water bottle before the flight.",
    "acceptedAnswers": [
      "water bottles",
      "bottle",
      "bottles"
    ],
    "audioText": "water bottle",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/water-bottle"
  },
  {
    "id": "airport-chair",
    "word": "chair",
    "partOfSpeech": "noun",
    "britishIPA": "/tʃeə/",
    "chineseMeaning": "椅子",
    "exampleSentence": "There is an empty chair by the window.",
    "acceptedAnswers": [
      "chairs",
      "seat",
      "seats"
    ],
    "audioText": "chair",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/chair"
  },
  {
    "id": "airport-book",
    "word": "book",
    "partOfSpeech": "noun",
    "britishIPA": "/bʊk/",
    "chineseMeaning": "书",
    "exampleSentence": "I brought a book to read while I wait.",
    "acceptedAnswers": [
      "books"
    ],
    "audioText": "book",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/book"
  },
  {
    "id": "airport-clock",
    "word": "clock",
    "partOfSpeech": "noun",
    "britishIPA": "/klɒk/",
    "chineseMeaning": "时钟",
    "exampleSentence": "Check the clock so you do not miss your flight.",
    "acceptedAnswers": [
      "clocks"
    ],
    "audioText": "clock",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/clock"
  },
  {
    "id": "gym-exercise-mat",
    "word": "exercise mat",
    "partOfSpeech": "noun",
    "britishIPA": null,
    "chineseMeaning": "运动垫",
    "exampleSentence": "Roll out your exercise mat before you stretch.",
    "acceptedAnswers": [
      "exercise mats",
      "mat",
      "mats",
      "yoga mat",
      "yoga mats"
    ],
    "audioText": "exercise mat"
  },
  {
    "id": "gym-dumbbell",
    "word": "dumbbell",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈdʌm.bel/",
    "chineseMeaning": "哑铃",
    "exampleSentence": "Choose a light dumbbell for your first set.",
    "acceptedAnswers": [
      "dumbbells",
      "weight",
      "weights"
    ],
    "audioText": "dumbbell",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/dumbbell"
  },
  {
    "id": "gym-exercise-ball",
    "word": "exercise ball",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈek.sə.saɪz ˌbɔːl/",
    "chineseMeaning": "健身球",
    "exampleSentence": "Sit on the exercise ball to practise your balance.",
    "acceptedAnswers": [
      "exercise balls",
      "gym ball",
      "gym balls",
      "fitness ball",
      "ball",
      "balls"
    ],
    "audioText": "exercise ball",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/exercise-ball"
  },
  {
    "id": "gym-weight-bench",
    "word": "weight bench",
    "partOfSpeech": "noun",
    "britishIPA": null,
    "chineseMeaning": "训练凳",
    "exampleSentence": "Sit on the weight bench and hold a weight in each hand.",
    "acceptedAnswers": [
      "weight benches",
      "bench",
      "benches",
      "workout bench",
      "exercise bench"
    ],
    "audioText": "weight bench"
  },
  {
    "id": "gym-water-bottle",
    "word": "water bottle",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈwɔː.tə ˌbɒt.əl/",
    "chineseMeaning": "水瓶",
    "exampleSentence": "Keep your water bottle nearby during your workout.",
    "acceptedAnswers": [
      "water bottles",
      "bottle",
      "bottles"
    ],
    "audioText": "water bottle",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/water-bottle"
  },
  {
    "id": "gym-gym-bag",
    "word": "gym bag",
    "partOfSpeech": "noun",
    "britishIPA": null,
    "chineseMeaning": "健身包",
    "exampleSentence": "My trainers and a towel are in my gym bag.",
    "acceptedAnswers": [
      "gym bags",
      "bag",
      "bags",
      "sports bag",
      "sports bags"
    ],
    "audioText": "gym bag"
  },
  {
    "id": "gym-chair",
    "word": "chair",
    "partOfSpeech": "noun",
    "britishIPA": "/tʃeə/",
    "chineseMeaning": "椅子",
    "exampleSentence": "Take a short rest on the chair.",
    "acceptedAnswers": [
      "chairs",
      "seat"
    ],
    "audioText": "chair",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/chair"
  },
  {
    "id": "gym-book",
    "word": "book",
    "partOfSpeech": "noun",
    "britishIPA": "/bʊk/",
    "chineseMeaning": "书",
    "exampleSentence": "There is a book on the small table.",
    "acceptedAnswers": [
      "books"
    ],
    "audioText": "book",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/book"
  },
  {
    "id": "gym-plant",
    "word": "plant",
    "partOfSpeech": "noun",
    "britishIPA": "/plɑːnt/",
    "chineseMeaning": "植物",
    "exampleSentence": "A green plant brightens up the gym.",
    "acceptedAnswers": [
      "plants",
      "potted plant"
    ],
    "audioText": "plant",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/plant"
  },
  {
    "id": "gym-clock",
    "word": "clock",
    "partOfSpeech": "noun",
    "britishIPA": "/klɒk/",
    "chineseMeaning": "时钟",
    "exampleSentence": "Watch the clock between sets.",
    "acceptedAnswers": [
      "clocks"
    ],
    "audioText": "clock",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/clock"
  },
  {
    "id": "supermarket-orange",
    "word": "orange",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈɒr.ɪndʒ/",
    "chineseMeaning": "橙子",
    "exampleSentence": "I would like an orange with my lunch.",
    "acceptedAnswers": [
      "oranges"
    ],
    "audioText": "orange",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/orange"
  },
  {
    "id": "supermarket-apple",
    "word": "apple",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈæp.əl/",
    "chineseMeaning": "苹果",
    "exampleSentence": "Choose a fresh green apple.",
    "acceptedAnswers": [
      "apples",
      "green apple",
      "green apples"
    ],
    "audioText": "apple",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/apple"
  },
  {
    "id": "supermarket-tomato",
    "word": "tomato",
    "partOfSpeech": "noun",
    "britishIPA": "/təˈmɑː.təʊ/",
    "chineseMeaning": "番茄",
    "exampleSentence": "We need a tomato for the salad.",
    "acceptedAnswers": [
      "tomatoes"
    ],
    "audioText": "tomato",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/tomato"
  },
  {
    "id": "supermarket-jar",
    "word": "jar",
    "partOfSpeech": "noun",
    "britishIPA": "/dʒɑː/",
    "chineseMeaning": "罐子",
    "exampleSentence": "The glass jar has a lid to keep the food fresh.",
    "acceptedAnswers": [
      "jars",
      "glass jar",
      "glass jars"
    ],
    "audioText": "jar",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/jar"
  },
  {
    "id": "supermarket-shopping-bag",
    "word": "shopping bag",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈʃɒp.ɪŋ ˌbæɡ/",
    "chineseMeaning": "购物袋",
    "exampleSentence": "Remember to bring your shopping bag.",
    "acceptedAnswers": [
      "shopping bags",
      "bag",
      "bags",
      "reusable bag"
    ],
    "audioText": "shopping bag",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/shopping-bag"
  },
  {
    "id": "supermarket-bottle",
    "word": "bottle",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈbɒt.əl/",
    "chineseMeaning": "瓶子",
    "exampleSentence": "Put the bottle in your shopping bag.",
    "acceptedAnswers": [
      "bottles",
      "water bottle"
    ],
    "audioText": "bottle",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/bottle"
  },
  {
    "id": "supermarket-clock",
    "word": "clock",
    "partOfSpeech": "noun",
    "britishIPA": "/klɒk/",
    "chineseMeaning": "时钟",
    "exampleSentence": "The clock is on the wall above the table.",
    "acceptedAnswers": [
      "clocks"
    ],
    "audioText": "clock",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/clock"
  },
  {
    "id": "supermarket-door",
    "word": "door",
    "partOfSpeech": "noun",
    "britishIPA": "/dɔː/",
    "chineseMeaning": "门",
    "exampleSentence": "The door leads out of the shop.",
    "acceptedAnswers": [
      "doors"
    ],
    "audioText": "door",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/door"
  },
  {
    "id": "supermarket-window",
    "word": "window",
    "partOfSpeech": "noun",
    "britishIPA": "/ˈwɪn.dəʊ/",
    "chineseMeaning": "窗户",
    "exampleSentence": "Daylight comes in through the window.",
    "acceptedAnswers": [
      "windows"
    ],
    "audioText": "window",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/window"
  },
  {
    "id": "supermarket-chair",
    "word": "chair",
    "partOfSpeech": "noun",
    "britishIPA": "/tʃeə/",
    "chineseMeaning": "椅子",
    "exampleSentence": "There is a chair beside the table.",
    "acceptedAnswers": [
      "chairs"
    ],
    "audioText": "chair",
    "ipaSource": "https://dictionary.cambridge.org/pronunciation/english/chair"
  }
];

const legacyScenes: Scene[] = [
  {
    "id": "kitchen-1",
    "topicId": "kitchen",
    "title": "Kitchen",
    "image": "scenes/development/kitchen.webp",
    "thumbnail": "scenes/development/kitchen-thumb.webp",
    "imageWidth": 1586,
    "imageHeight": 992,
    "published": true,
    "assetStatus": "development",
    "vocabularyIds": [
      "kitchen-door",
      "kitchen-window",
      "kitchen-table",
      "kitchen-chair",
      "kitchen-bottle",
      "kitchen-bag",
      "kitchen-clock",
      "kitchen-plant",
      "kitchen-light",
      "kitchen-book"
    ],
    "nextSceneId": "kitchen-2"
  },
  {
    "id": "airport-1",
    "topicId": "airport",
    "title": "Airport",
    "image": "scenes/development/airport.webp",
    "thumbnail": "scenes/development/airport-thumb.webp",
    "imageWidth": 1536,
    "imageHeight": 1024,
    "published": true,
    "assetStatus": "development",
    "vocabularyIds": [
      "airport-door",
      "airport-window",
      "airport-aeroplane",
      "airport-plant",
      "airport-table",
      "airport-travel-bag",
      "airport-water-bottle",
      "airport-chair",
      "airport-book",
      "airport-clock"
    ],
    "nextSceneId": "airport-2"
  },
  {
    "id": "gym-1",
    "topicId": "gym",
    "title": "Gym",
    "image": "scenes/development/gym.webp",
    "thumbnail": "scenes/development/gym-thumb.webp",
    "imageWidth": 1329,
    "imageHeight": 1183,
    "published": true,
    "assetStatus": "development",
    "vocabularyIds": [
      "gym-exercise-mat",
      "gym-dumbbell",
      "gym-exercise-ball",
      "gym-weight-bench",
      "gym-water-bottle",
      "gym-gym-bag",
      "gym-chair",
      "gym-book",
      "gym-plant",
      "gym-clock"
    ],
    "nextSceneId": null
  },
  {
    "id": "supermarket-1",
    "topicId": "supermarket",
    "title": "Supermarket",
    "image": "scenes/development/supermarket.webp",
    "thumbnail": "scenes/development/supermarket-thumb.webp",
    "imageWidth": 1536,
    "imageHeight": 1024,
    "published": true,
    "assetStatus": "development",
    "vocabularyIds": [
      "supermarket-orange",
      "supermarket-apple",
      "supermarket-tomato",
      "supermarket-jar",
      "supermarket-shopping-bag",
      "supermarket-bottle",
      "supermarket-clock",
      "supermarket-door",
      "supermarket-window",
      "supermarket-chair"
    ],
    "nextSceneId": null
  }
].map(scene => ({ ...scene, assetStatus: scene.assetStatus as Scene['assetStatus'], hotspots: calibratedHotspots[scene.id] }));

export const readyVocabulary = [...legacyVocabulary, ...specialistVocabulary];
export const readyScenes = [...legacyScenes, ...specialistScenes];
