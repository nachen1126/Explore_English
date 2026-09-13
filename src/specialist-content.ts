import type { Scene, VocabularyItem } from './types';
import { polygon as p, region as r } from './hotspots';

const source = (slug: string) => `https://dictionary.cambridge.org/pronunciation/english/${slug}`;
function word(id: string, text: string, ipa: string, meaning: string, example: string, aliases: string[], sources = [text.replaceAll(' ', '-')]): VocabularyItem {
  return { id, word: text, partOfSpeech: 'noun', britishIPA: ipa, chineseMeaning: meaning, exampleSentence: example,
    acceptedAnswers: aliases, audioText: text, ipaSource: source(sources[0]), ipaSources: sources.map(source) };
}
// Compound transcriptions combine verified UK component pronunciations; sources
// for every component are retained. Standalone linking-r is not pronounced.
export const specialistVocabulary: VocabularyItem[] = [
  word('kitchen-fridge','fridge','/frɪdʒ/','冰箱','Keep the milk in the fridge.', ['fridges','refrigerator','refrigerators']),
  word('kitchen-sink','sink','/sɪŋk/','水槽','Rinse the vegetables in the sink.', ['sinks','kitchen sink']),
  word('kitchen-oven','oven','/ˈʌv.ən/','烤箱','The bread is baking in the oven.', ['ovens']),
  word('kitchen-hob','hob','/hɒb/','炉灶台面','Put the pan on the hob.', ['hobs','stovetop','stove top','cooktop']),
  word('kitchen-kettle','kettle','/ˈket.əl/','烧水壶','Fill the kettle for a cup of tea.', ['kettles','electric kettle']),
  word('kitchen-pan','pan','/pæn/','平底锅','Heat a little oil in the pan.', ['pans','frying pan','frying pans']),
  word('kitchen-chopping-board','chopping board','/ˈtʃɒp.ɪŋ ˌbɔːd/','砧板','Slice the carrots on the chopping board.', ['chopping boards','cutting board','cutting boards']),
  word('kitchen-cupboard','cupboard','/ˈkʌb.əd/','橱柜','Put the clean plates in the cupboard.', ['cupboards','cabinet','cabinets','wall cupboard','kitchen cupboard']),
  word('kitchen-spatula','spatula','/ˈspætʃ.ə.lə/','锅铲','Turn the pancake over with the spatula.', ['spatulas','turner','fish slice']),
  word('kitchen-microwave','microwave','/ˈmaɪ.krə.weɪv/','微波炉','Warm the soup in the microwave.', ['microwaves','microwave oven']),
  word('airport-suitcase','suitcase','/ˈsuːt.keɪs/','行李箱','My suitcase is ready to check in.', ['suitcases','case','luggage']),
  word('airport-passport','passport','/ˈpɑːs.pɔːt/','护照','Keep your passport somewhere safe.', ['passports']),
  word('airport-boarding-pass','boarding pass','/ˈbɔː.dɪŋ ˌpɑːs/','登机牌','Show your boarding pass at the gate.', ['boarding passes','boarding card','boarding cards']),
  word('airport-check-in-desk','check-in desk','/ˈtʃek.ɪn ˌdesk/','值机柜台','We leave our suitcases at the check-in desk.', ['check in desk','check-in counter','check in counter','check-in desks','check-in counters']),
  word('airport-departure-board','departure board','/dɪˈpɑː.tʃə ˌbɔːd/','航班出发信息屏','Check the departure board for your flight.', ['departure boards','departures board','flight information board','flight board'], ['departure','board']),
  word('airport-security-checkpoint','security checkpoint','/sɪˈkjʊə.rə.ti ˌtʃek.pɔɪnt/','安检区','Have your bags ready at the security checkpoint.', ['security checkpoints','security','security check','security scanner','metal detector'], ['security','checkpoint']),
  word('airport-gate','gate','/ɡeɪt/','登机口','Our gate is at the end of the terminal.', ['gates','boarding gate','departure gate']),
  word('airport-luggage-trolley','luggage trolley','/ˈlʌɡ.ɪdʒ ˌtrɒl.i/','行李推车','Use a luggage trolley for your heavy bags.', ['luggage trolleys','trolley','trolleys','luggage cart','baggage trolley'], ['luggage','trolley']),
  word('airport-baggage-carousel','baggage carousel','/ˌbæɡ.ɪdʒ ˌkær.əˈsel/','行李传送带','Collect your suitcase from the baggage carousel.', ['baggage carousels','carousel','luggage carousel','baggage belt','conveyor belt'], ['baggage','carousel']),
];

export const specialistScenes: Scene[] = [
  { id:'kitchen-2', topicId:'kitchen', title:'Kitchen · Cooking', image:'scenes/kitchen-cooking.webp', thumbnail:'scenes/kitchen-cooking-thumb.webp', imageWidth:1536, imageHeight:1024, published:true, assetStatus:'final', nextSceneId:null,
    imageVersion:'kitchen-cooking-v1', hotspotImageVersion:'kitchen-cooking-v1',
    vocabularyIds: ['kitchen-fridge','kitchen-sink','kitchen-oven','kitchen-hob','kitchen-kettle','kitchen-pan','kitchen-chopping-board','kitchen-cupboard','kitchen-spatula','kitchen-microwave'],
    hotspots: [
      p('kitchen-fridge',[[75,58],[220,56],[258,85],[258,398],[221,439],[221,660],[77,675]]),
      p('kitchen-sink',[[781,448],[903,448],[938,474],[868,504],[866,626],[850,622],[783,541]]),
      r('kitchen-oven',407,441,165,207),
      p('kitchen-hob',[[425,386],[561,386],[574,431],[410,431]]),
      r('kitchen-kettle',614,309,67,105),
      r('kitchen-pan',602,92,64,187),
      p('kitchen-chopping-board',[[275,682],[487,718],[478,790],[537,793],[544,825],[468,849],[459,889],[195,825],[193,788]]),
      r('kitchen-chopping-board',826,282,46,122),
      r('kitchen-cupboard',673,17,229,261),
      r('kitchen-cupboard',235,510,163,136),
      r('kitchen-cupboard',686,444,78,226),
      p('kitchen-cupboard',[[768,542],[812,602],[812,790],[765,693]]),
      p('kitchen-cupboard',[[939,607],[1000,648],[1000,1000],[937,891]]),
      p('kitchen-spatula',[[546,709],[580,709],[601,740],[605,775],[724,869],[721,899],[697,909],[638,855],[589,794],[550,786],[522,755],[522,734]]),
      r('kitchen-microwave',248,307,126,104),
    ] },
  { id:'airport-2', topicId:'airport', title:'Airport · Departures', image:'scenes/airport-departures.webp', thumbnail:'scenes/airport-departures-thumb.webp', imageWidth:1536, imageHeight:1024, published:true, assetStatus:'final', nextSceneId:null,
    imageVersion:'airport-departures-v1', hotspotImageVersion:'airport-departures-v1',
    vocabularyIds: ['airport-suitcase','airport-passport','airport-boarding-pass','airport-check-in-desk','airport-departure-board','airport-security-checkpoint','airport-gate','airport-luggage-trolley','airport-baggage-carousel','airport-aeroplane'],
    hotspots: [
      p('airport-suitcase',[[23,518],[43,501],[113,480],[169,495],[191,521],[194,803],[180,837],[158,848],[143,872],[68,881],[26,845],[17,800]]),
      r('airport-suitcase',73,363,62,34),
      r('airport-suitcase',75,384,10,116),
      r('airport-suitcase',117,384,10,111),
      p('airport-passport',[[286,727],[445,680],[471,706],[541,892],[541,919],[330,972]]),
      p('airport-boarding-pass',[[516,830],[559,746],[618,752],[889,831],[884,940],[874,975],[536,879]]),
      p('airport-check-in-desk',[[30,278],[109,278],[114,297],[131,297],[131,320],[165,324],[165,456],[27,468]]),
      p('airport-check-in-desk',[[172,278],[205,278],[204,318],[249,319],[249,416],[174,436]]),
      p('airport-check-in-desk',[[238,283],[267,283],[266,314],[296,317],[296,398],[247,416],[247,319],[238,319]]),
      p('airport-departure-board',[[27,12],[280,87],[280,225],[26,194]]),
      p('airport-security-checkpoint',[[620,182],[718,183],[718,253],[794,252],[806,279],[806,447],[676,474],[657,415],[655,220],[644,220],[644,410],[620,410]]),
      r('airport-gate',812,57,166,343),
      p('airport-luggage-trolley',[[891,398],[1000,409],[985,639],[989,679],[974,711],[904,727],[888,716],[809,696],[798,676],[798,624],[813,607],[878,601]]),
      p('airport-baggage-carousel',[[326,455],[382,422],[640,435],[653,458],[707,483],[715,515],[706,560],[678,580],[444,560],[327,525]]),
      p('airport-aeroplane',[[368,149],[391,152],[411,224],[544,223],[586,253],[590,270],[571,294],[490,306],[386,300],[369,270],[336,263],[336,232],[385,243]]),
    ] },
];
