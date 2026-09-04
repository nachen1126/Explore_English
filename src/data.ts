export type Topic={id:string; title:string; emoji:string; colour:string};
export type Vocabulary={id:string; word:string; ipa:string; meaning:string; accepted:string[]; emoji:string};
export type Target={vocabularyId:string; x:number;y:number;w:number;h:number};
export type Scene={id:string;topicId:string;title:string;subtitle:string;targets:Target[]};
export const topics:Topic[]=[
 {id:'kitchen',title:'Kitchen',emoji:'🍳',colour:'#f3b562'},{id:'airport',title:'Airport',emoji:'✈️',colour:'#8bb8d9'},
 {id:'supermarket',title:'Supermarket',emoji:'🛒',colour:'#b5c99a'},{id:'cafe',title:'Café',emoji:'☕',colour:'#d69a79'},
 {id:'gym',title:'Gym',emoji:'🏋️',colour:'#a9a7d1'},{id:'underwater',title:'Underwater World',emoji:'🐠',colour:'#72b7c9'}];
const words=['door','window','table','chair','bottle','bag','clock','plant','light','book'];
export const vocabulary:Record<string,Vocabulary>={};
topics.forEach((t)=>words.forEach((w,i)=>{const id=`${t.id}-${w}`; vocabulary[id]={id,word:w,ipa:`/${w}/`,meaning:['门','窗户','桌子','椅子','瓶子','包','时钟','植物','灯','书'][i],accepted:[w,`a ${w}`,`it's a ${w}`,`it is a ${w}`],emoji:['🚪','🪟','🪑','🪑','🧴','👜','🕒','🪴','💡','📖'][i]};}));
const layouts:Record<string,[number,number,number,number][]>={
 kitchen:[[.03,.1,.2,.65],[.48,.08,.2,.3],[.32,.58,.55,.3],[.72,.65,.2,.3],[.45,.52,.08,.25],[.54,.5,.16,.25],[.25,.08,.1,.16],[.25,.35,.16,.32],[.65,.03,.14,.2],[.64,.65,.15,.12]],
 airport:[[.02,.08,.18,.65],[.68,.1,.28,.45],[.33,.58,.42,.2],[.7,.58,.28,.38],[.5,.52,.08,.2],[.57,.48,.17,.18],[.27,.1,.12,.15],[.25,.28,.2,.45],[.44,.02,.18,.2],[.36,.59,.18,.1]],
 supermarket:[[.2,.08,.25,.58],[.68,.15,.2,.35],[.48,.58,.48,.2],[.35,.6,.18,.35],[.5,.48,.08,.18],[.6,.45,.15,.18],[.5,.12,.12,.15],[.77,.3,.2,.35],[.68,.0,.18,.18],[.67,.63,.17,.1]],
 cafe:[[.02,.05,.2,.65],[.74,.05,.24,.5],[.43,.55,.4,.2],[.7,.56,.22,.35],[.52,.43,.08,.18],[.22,.67,.18,.22],[.34,.1,.12,.15],[.27,.28,.2,.45],[.53,.0,.15,.2],[.55,.53,.2,.1]],
 gym:[[.03,.08,.2,.55],[.75,.08,.25,.33],[.18,.58,.3,.18],[.02,.56,.2,.4],[.28,.44,.08,.25],[.6,.7,.3,.22],[.28,.1,.12,.15],[.56,.2,.18,.4],[.43,.0,.16,.18],[.3,.58,.18,.12]],
 underwater:[[.03,.08,.15,.7],[.18,.12,.65,.5],[.25,.52,.55,.2],[.53,.61,.22,.32],[.32,.48,.08,.2],[.83,.65,.14,.25],[.91,.1,.08,.17],[.72,.42,.15,.2],[.62,.0,.16,.17],[.47,.49,.15,.12]]
 };
const centreOverrides:Record<string,Record<number,[number,number]>>={kitchen:{0:[.13,.42],1:[.55,.32],2:[.53,.72],3:[.83,.82],4:[.46,.68],5:[.61,.65],6:[.30,.20],7:[.31,.57],8:[.70,.15],9:[.70,.73]}};
 export const scenes:Scene[]=topics.flatMap((t)=>[1,2].map((n)=>({id:`${t.id}-${n}`,topicId:t.id,title:`${t.title} · Scene ${n}`,subtitle:n===1?'A first look around':'Look a little closer',targets:words.map((w,i)=>{const [x,y,wid,hei]=layouts[t.id][i];const [cx,cy]=centreOverrides[t.id]?.[i]??[x+wid/2,y+hei/2];return {vocabularyId:`${t.id}-${w}`,x:cx-.05,y:cy-.06,w:.10,h:.12};})})));
export const getTopic=(id:string)=>topics.find(t=>t.id===id);
export const getScene=(id:string)=>scenes.find(s=>s.id===id);
