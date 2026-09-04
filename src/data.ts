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
export const scenes:Scene[]=topics.flatMap((t,si)=>[1,2].map((n)=>({id:`${t.id}-${n}`,topicId:t.id,title:`${t.title} · Scene ${n}`,subtitle:n===1?'A first look around':'Look a little closer',targets:words.map((w,i)=>({vocabularyId:`${t.id}-${w}`,x:0.08+((i*0.19)%0.82),y:0.16+(((i*0.31+n*0.1)%0.68)),w:0.14,h:0.16}))})));
export const getTopic=(id:string)=>topics.find(t=>t.id===id);
export const getScene=(id:string)=>scenes.find(s=>s.id===id);
