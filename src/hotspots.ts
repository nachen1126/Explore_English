import type { Hotspot } from './types';

/** Calibration units are 1/1000 of the original image, for every aspect ratio.
 * Multiple regions may name one vocabulary item: every visible equivalent is valid.
 * Small objects render above large surfaces; polygons exclude empty floor areas. */
export const region = (vocabularyId: string, x: number, y: number, width: number, height: number, shape: 'rect' | 'ellipse' = 'rect'): Hotspot =>
  ({ vocabularyId, x: x / 1000, y: y / 1000, width: width / 1000, height: height / 1000, shape });
export function polygon(vocabularyId: string, vertices: [number, number][]): Hotspot {
  const xs = vertices.map(([x]) => x), ys = vertices.map(([, y]) => y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { ...region(vocabularyId, x, y, Math.max(...xs) - x, Math.max(...ys) - y), shape: 'polygon', points: vertices.map(([a, b]) => [a / 1000, b / 1000]) };
}

export const calibratedHotspots: Record<string, Hotspot[]> = {
  'kitchen-1': [
    polygon('kitchen-door', [[25,50],[198,96],[198,743],[27,800]]),
    region('kitchen-window', 443,43,211,446),
    polygon('kitchen-table', [[328,705],[535,612],[733,606],[909,653],[690,863],[374,759],[328,733]]),
    polygon('kitchen-table', [[381,744],[407,755],[385,1000],[363,1000]]),
    polygon('kitchen-table', [[637,838],[662,846],[670,1000],[645,1000]]),
    region('kitchen-table',601,841,18,89),
    polygon('kitchen-chair', [[860,665],[872,630],[950,609],[958,627],[924,874],[915,1000],[896,1000],[897,945],[792,945],[786,1000],[771,1000],[775,941],[716,931],[710,1000],[697,1000],[712,884],[717,861],[856,791]]),
    region('kitchen-bottle',412,515,80,200),
    region('kitchen-bag',523,494,126,222),
    region('kitchen-clock',239,124,86,153,'ellipse'),
    polygon('kitchen-plant', [[230,490],[247,361],[292,375],[338,383],[379,450],[369,575],[341,632],[338,716],[313,745],[269,740],[256,676],[252,618],[232,574]]),
    region('kitchen-plant',468,368,70,103),
    region('kitchen-plant',805,106,101,221),
    region('kitchen-light',637,0,133,222),
    polygon('kitchen-book', [[671,675],[728,660],[794,681],[794,715],[745,731],[672,707]]),
  ],
  'airport-1': [
    polygon('airport-door', [[16,70],[210,92],[210,738],[16,758]]),
    region('airport-window',529,0,471,718),
    polygon('airport-aeroplane', [[750,378],[813,378],[832,458],[934,470],[978,512],[984,558],[972,584],[801,582],[749,539]]),
    region('airport-plant',210,296,182,461),
    polygon('airport-table', [[328,677],[351,654],[414,641],[665,641],[704,677],[705,713],[677,740],[591,748],[414,748],[329,716]]),
    region('airport-table',504,737,42,205),
    region('airport-table',428,887,192,105,'ellipse'),
    region('airport-travel-bag',543,468,151,219),
    region('airport-water-bottle',485,510,61,167),
    polygon('airport-chair', [[720,688],[763,619],[875,586],[925,586],[928,620],[876,893],[860,1000],[841,1000],[844,919],[650,907],[606,1000],[591,1000],[607,871],[585,837],[590,758],[618,721]]),
    polygon('airport-book', [[385,653],[454,645],[521,675],[520,712],[451,720],[387,690]]),
    region('airport-clock',262,109,92,141,'ellipse'),
  ],
  'gym-1': [
    polygon('gym-exercise-mat', [[442,608],[558,586],[1000,691],[1000,728],[780,751]]),
    region('gym-dumbbell',582,598,112,66),
    region('gym-exercise-ball',849,445,151,169,'ellipse'),
    polygon('gym-weight-bench', [[747,532],[804,525],[1000,575],[1000,625],[797,574],[748,555]]),
    polygon('gym-weight-bench', [[779,569],[806,574],[790,641],[821,638],[829,662],[741,672],[736,648],[765,642]]),
    polygon('gym-weight-bench', [[845,591],[877,597],[979,703],[994,700],[1000,705],[1000,739],[934,749],[932,725],[956,718],[854,613]]),
    region('gym-water-bottle',281,488,80,189),
    polygon('gym-gym-bag', [[611,812],[644,757],[700,755],[725,716],[771,710],[827,744],[836,782],[901,811],[922,864],[938,957],[914,989],[775,1000],[621,942]]),
    polygon('gym-gym-bag', [[700,769],[717,734],[735,718],[763,713],[789,727],[826,771],[818,785],[785,745],[762,730],[741,732],[727,744],[713,775]]),
    polygon('gym-chair', [[8,600],[42,578],[109,588],[159,642],[173,743],[259,744],[300,779],[288,826],[292,929],[277,930],[265,848],[232,852],[237,926],[222,926],[213,853],[88,848],[75,930],[61,930],[62,848],[55,980],[36,994],[42,837],[25,788]]),
    polygon('gym-book', [[362,669],[430,647],[515,672],[514,698],[451,717],[362,695]]),
    region('gym-plant',570,215,204,361),
    region('gym-clock',324,120,118,144,'ellipse'),
  ],
  'supermarket-1': [
    polygon('supermarket-orange', [[0,674],[39,667],[81,698],[100,737],[91,765],[0,820]]),
    polygon('supermarket-orange', [[105,635],[133,637],[159,657],[160,687],[132,710],[111,684]]),
    polygon('supermarket-apple', [[16,665],[60,643],[97,655],[128,690],[133,720],[99,741],[79,705],[45,677]]),
    region('supermarket-tomato',916,554,84,73),
    region('supermarket-jar',47,337,112,97),
    region('supermarket-jar',76,486,88,86),
    region('supermarket-jar',895,174,105,92),
    region('supermarket-shopping-bag',592,434,126,242),
    region('supermarket-bottle',534,478,62,185),
    region('supermarket-bottle',0,305,53,118),
    region('supermarket-bottle',0,457,60,148),
    polygon('supermarket-door', [[186,84],[453,84],[453,802],[205,802],[184,756]]),
    region('supermarket-window',601,66,172,435),
    region('supermarket-window',239,173,152,270),
    polygon('supermarket-chair', [[399,610],[450,632],[483,653],[505,704],[520,796],[580,800],[612,831],[634,872],[639,1000],[622,1000],[616,923],[462,963],[471,1000],[451,1000],[441,961],[413,923],[407,1000],[390,1000],[411,870],[416,787],[415,699]]),
    region('supermarket-clock',482,141,98,144,'ellipse'),
  ],
};
