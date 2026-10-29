import {insightRecords,insightStats,insightPeriod,insightFilter,insightGroups,insightKeys,insightPriorities,insightConditionLabel,insightTrend,insightKeyComparison,insightEfficiency,insightEligible,insightStratum,insightSetupId,type InsightRecord,type InsightFamily,type InsightRun,type InsightFilters} from './insights.js';
import {exerciseNames,modeForExercise} from './exercise-names.js';
import type {Attempt,Session} from './model.js';
const families:InsightFamily[]=['Degree Recognition','Degree Audiation','Play by Ear'];
type View={family:'Overall'|InsightFamily;context:'Single Chord'|'Progression';days:number;dimension:string;key:string;root:string;quality:string;chord:string;degree:string;production:string;sort:string;all:boolean;baseline:string;chordView:string;comparable:boolean;condition:string;setup:string};
const initial:View={family:'Overall',context:'Single Chord',days:28,dimension:'Key',key:'',root:'',quality:'',chord:'',degree:'',production:'all',sort:'Errors',all:false,baseline:'',chordView:'Chord quality',comparable:false,condition:'',setup:''};
let view:View={...initial};
let scopeNotice='';
try{const saved=JSON.parse(sessionStorage.getItem('jazzEarLab:v2:insightView')??'null');if(saved&&['Overall',...families].includes(saved.family)&&[7,28,90,0].includes(saved.days))view={...initial,...saved};}catch{/* View preferences never block history. */}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls=''){const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;}
function details(title:string,...nodes:HTMLElement[]){const n=el('details');n.append(el('summary',title),...nodes);return n;}
const percent=(m:ReturnType<typeof insightStats>)=>m.n?Math.round(100*m.correct/m.n)+'%':'—';
export function renderInsights(host:HTMLElement,sessions:Session[],runs:InsightRun[],evidence:Attempt[],onSetup?:(record:InsightRecord,label:string,filters:InsightFilters)=>void){
 const all=insightRecords(sessions,runs,evidence);
 function render(){
  const focus=(document.activeElement as HTMLElement)?.dataset.insightControl;
  const open=Array.from(host.querySelectorAll('details[open]')).map(n=>n.querySelector('summary')?.textContent);
  const finish=()=>{for(const d of Array.from(host.querySelectorAll('details')))if(open.includes(d.querySelector('summary')?.textContent))d.open=true;if(focus){const restored=Array.from(host.querySelectorAll<HTMLElement>('[data-insight-control]')).find(n=>n.dataset.insightControl===focus);const target=restored??host.querySelector<HTMLElement>('.insight-analysis h2')??host.querySelector<HTMLElement>('h2');if(target){if(!restored)target.tabIndex=-1;target.focus({preventScroll:true});}}};
  host.replaceChildren();host.classList.add('insights-work');
  try{sessionStorage.setItem('jazzEarLab:v2:insightView',JSON.stringify(view));}catch{/* Nonessential view preference. */}
  const button=(text:string,action:()=>void,selected=false)=>{const b=el('button',text,'secondary');b.type='button';b.dataset.insightControl=text;b.setAttribute('aria-pressed',String(selected));b.onclick=()=>{action();render();};return b;};
  const select=(name:string,value:string,values:string[],change:(v:string)=>void)=>{const l=el('label',name),s=el('select');s.setAttribute('aria-label',name);s.dataset.insightControl=name;for(const v of values){const o=el('option',v);o.value=v;s.append(o);}s.value=value;s.onchange=()=>{change(s.value);render();};l.append(s);return l;};
  const reset=()=>{scopeNotice='';view.key=view.root=view.quality=view.chord=view.degree='';view.all=false;view.baseline='';view.comparable=false;view.condition=view.setup='';};
  const changeScope=(family:View['family'],context=view.context)=>{
   if(family===view.family&&context===view.context)return;
   const cleared:string[]=[];
   if(context==='Single Chord'&&view.key){view.key='';cleared.push('playback key (Single Chord uses chord roots)');}
   if(view.condition||view.setup){view.condition=view.setup='';cleared.push('exercise-specific practice conditions');}
   if((family!=='Degree Audiation'||context!=='Single Chord')&&view.production!=='all'){view.production='all';cleared.push('Audiation production category');}
   view.family=family;view.context=context;view.baseline='';view.comparable=false;view.all=false;
   scopeNotice=cleared.length?'Cleared incompatible filters: '+cleared.join('; ')+'. Other musical filters were retained.':'';
  };
  const bar=el('div','','insight-toolbar');
  bar.append(select('Practice family',view.family,['Overall',...families],v=>changeScope(v as View['family'])),select('Period',view.days?`Last ${view.days} days`:'All time',['Last 7 days','Last 28 days','Last 90 days','All time'],v=>{view.days=v==='All time'?0:Number(v.match(/\d+/)![0]);}));
  host.append(bar);if(scopeNotice){const notice=el('p',scopeNotice,'insight-scope-note');notice.setAttribute('role','status');host.append(notice);}
  if(view.family!=='Overall'){
   const contexts=el('div','','insight-contexts');for(const c of ['Single Chord','Progression'] as const)contexts.append(button(c,()=>changeScope(view.family,c),view.context===c));host.append(contexts);
  }
  const period=insightPeriod(view.days||28),scope=view.days?all.filter(r=>r.time!==null&&r.time>=period.start&&r.time<period.end):all;
  const dateLabel=(n:number)=>new Date(n).toLocaleDateString();
  host.append(el('p',(view.days?`${dateLabel(period.start)} – ${dateLabel(period.end-1)}`:'All recorded dates')+' · Records in this browser','insight-scope-note'));
  if(all.some(r=>r.dateSource==='session'))host.append(el('p','Some older records use session-start dates. Exact question dates were not recorded.','insight-scope-note'));
  if(all.some(r=>r.time===null))host.append(el('p',`${all.filter(r=>r.time===null).length} records have no usable date; available in All time.`,'insight-scope-note'));
  const outcome=(records:InsightRecord[],title:string,compact=false)=>{const m=insightStats(records),block=el('section','','insight-outcome');block.setAttribute('aria-label',title);if(compact&&!m.questions){block.append(el('h2',title),el('p','No records in this period','insight-scope-note'));return block;}block.append(el('h2',title),el('p',percent(m),'metric-number'),el('p',`${m.correct} / ${m.n} assessed`,'assessment-count'),el('p',`${m.questions} questions · ${m.sessions} sessions · ${m.unassessed} unassessed`,'insight-scope-note'));if(!compact||m.replayed)block.append(el('p',`Replay-assisted first responses: ${m.replayed} / ${m.n}`,'insight-scope-note'));block.dataset.assessed=String(m.n);block.dataset.correct=String(m.correct);return block;};
  if(view.family==='Overall'){
   const overviewRows=insightFilter(scope,{root:view.root,quality:view.quality,chord:view.chord,degree:view.degree}).filter(r=>!view.key||r.context==='Single Chord'||r.key===view.key);
   host.append(el('h2','Recent performance'));
   const active=Object.entries({key:view.key,root:view.root,quality:view.quality,chord:view.chord,degree:view.degree}).filter(([,value])=>value);if(active.length)host.append(el('p','Filters: '+active.map(([key,value])=>key+': '+value+(key==='key'?' (progression only)':'')).join(' · ')),button('Clear filters',reset));
   if(!scope.length){host.append(el('p',all.length?'No matching records in this period. Try a wider period.':'No V2 records in this browser. Choose an exercise to begin.'),button('Show all time',()=>{view.days=0;}));const link=el('a','Choose an exercise');link.href='#home';host.append(link);finish();return;}
   for(const family of families){const section=el('section','','insight-family');section.append(el('h3',family),el('p',family==='Degree Recognition'?'System graded':'Self-rated · not pitch-verified','insight-scope-note'));const grid=el('div','','insight-family-contexts');for(const context of ['Single Chord','Progression'] as const){const records=overviewRows.filter(r=>r.family===family&&r.context===context),block=outcome(records,context,true);const enter=button('View '+context+' · '+family,()=>changeScope(family,context));enter.setAttribute('aria-label','View '+context+' · '+family);enter.textContent='View '+context;block.append(enter);grid.append(block);}section.append(grid);host.append(section);}
   host.append(details('Combined degree accuracy',outcome(overviewRows,'Mixed practice including self-ratings')));
  }else{
   const mode=Object.entries(exerciseNames).find(([,name])=>name===view.context+' · '+view.family)![0];
   const allMode=all.filter(r=>r.a.exercise===mode).filter(r=>(!view.condition||insightStratum(r)===view.condition)&&(!view.setup||insightSetupId(r)===view.setup)).filter(r=>mode!=='m1'||view.production==='all'||(view.production==='played'?r.a.responseMethod==='played':['imagined','sung'].includes(r.a.responseMethod)));
   const modeRows=scope.filter(r=>allMode.includes(r));
   let rows=insightFilter(modeRows,{key:view.key,root:view.root,quality:view.quality,chord:view.chord,degree:view.degree});
   if(mode==='m1'&&view.production!=='all')rows=rows.filter(r=>view.production==='played'?r.a.responseMethod==='played':['imagined','sung'].includes(r.a.responseMethod));
   host.append(el('h2',view.context+' · '+view.family),el('p',view.family==='Degree Recognition'?'System graded':'Self-rated · not pitch-verified','insight-assessment'));
   const result=outcome(rows,view.family==='Degree Recognition'?'First-answer accuracy':'Self-rated accuracy');host.append(result);
   if(!modeRows.length||!rows.length){
    host.append(el('p',Object.entries({key:view.key,root:view.root,quality:view.quality,chord:view.chord,degree:view.degree}).filter(([,value])=>value).map(([key,value])=>key+': '+value).join(' · '),'insight-scope-note'));
    host.append(el('p',!rows.length&&modeRows.length?'No records match these filters.':all.some(r=>r.a.exercise===mode)?'No matching records in this period. Try a wider period.':'No records for this exercise yet.'),button('Show all time',()=>{view.days=0;}),button('Clear filters',()=>{reset();view.production='all';}),button('Practice '+exerciseNames[mode as keyof typeof exerciseNames],()=>{const progression=modeForExercise(mode);location.hash=progression?'progression/'+progression:'home';}));finish();return;
   }
   const trend=insightTrend(insightFilter(allMode,{key:view.key,root:view.root,quality:view.quality,chord:view.chord,degree:view.degree}),view.days),trendSection=el('section','','insight-trend');
   trendSection.append(el('h3','Comparable recorded change'));
   if(trend.delta===null)trendSection.append(el('p',view.days?'Not enough matching-condition evidence to compare periods.':'All time has no automatic previous-period comparison.'));
   else trendSection.append(el('strong',`${Math.abs(trend.delta).toFixed(1)} percentage points ${trend.delta<0?'lower':trend.delta>0?'higher':'change'}`),el('p',`Matched current: ${trend.current.correct}/${trend.current.n} · ${trend.current.questions} questions · ${trend.current.sessions} sessions; previous: ${trend.previous.correct}/${trend.previous.n} · ${trend.previous.questions} questions · ${trend.previous.sessions} sessions. Current coverage: ${trend.current.n}/${trend.totalCurrent} assessed notes.`),details('Compared practice conditions',...trend.details.map(g=>el('p',`${g.label}: ${g.previous.correct}/${g.previous.n} → ${g.current.correct}/${g.current.n}`))));
   if(trend.delta!==null)trendSection.append(el('p','Recorded observations only; not proof of learning or transfer.','insight-scope-note'));host.append(trendSection);
   const priorities=insightPriorities(rows,view.baseline,{key:view.key,root:view.root,quality:view.quality,chord:view.chord,degree:view.degree}),next=el('section','','insight-priorities');next.append(el('h2','What to practise next'));
   if(!priorities.errors.length)next.append(el('p',insightEligible(rows)?'No recurrent error pattern meets the evidence thresholds.':'Not enough evidence to identify recurrent errors. Small samples are not weaknesses.'));
   if(priorities.stratum)next.append(el('p','Recurrent errors within: '+insightConditionLabel(priorities.stratum[0]),'insight-scope-note'));
   if(priorities.baselines.length>1){const l=el('label','Coverage setup'),s=el('select');s.setAttribute('aria-label','Coverage setup');s.dataset.insightControl='Coverage setup';for(const r of priorities.baselines){const o=el('option',insightConditionLabel(r));o.value=r.a.id;s.append(o);}s.value=priorities.baseline!.a.id;s.onchange=()=>{view.baseline=s.value;render();};l.append(s);next.append(l);}
   else if(priorities.baseline)next.append(details('Coverage setup',el('p',insightConditionLabel(priorities.baseline))));
   for(const item of [...priorities.errors,...priorities.gaps]){
    const row=el('article','','insight-priority');row.append(el('h3',item.label),el('p',item.kind==='error'?'Repeated first-response errors':'Coverage gap · insufficient practice, not a weakness'),el('p',item.m.questions?`${item.m.correct} / ${item.m.n} assessed · ${item.m.questions} questions · ${item.m.sessions} sessions`:'No assessed records under this setup'));
    if(onSetup&&item.basis.sourceKnown){const setup=button('Setup practice: '+item.label,()=>onSetup(item.basis,item.label,item.filters));setup.setAttribute('aria-label','Setup practice: '+item.label);setup.textContent='Setup practice';setup.classList.remove('secondary');row.append(setup);}
    const evidenceButton=button('View evidence: '+item.label,()=>{reset();Object.assign(view,item.filters);if(item.kind==='error')view.condition=insightStratum(item.basis)??'';else view.setup=insightSetupId(item.basis);view.dimension=item.filters.degree?'Degree':'Chord';});evidenceButton.setAttribute('aria-label','View evidence: '+item.label);evidenceButton.textContent='View evidence';row.append(evidenceButton);
    next.append(row);
   }const lead=el('div','','insight-lead'),performance=el('div');performance.append(result,trendSection);lead.append(performance,next);host.append(lead);
   const analysis=el('section','','insight-analysis');analysis.append(el('h2','Explore the music'));
   const tabs=el('div','','insight-tabs');
   for(const name of ['Key','Chord','Degree'])tabs.append(button(name==='Key'&&view.context==='Single Chord'?'Chord root':name,()=>{view.dimension=name;view.all=false;},view.dimension===name));analysis.append(tabs);
   const chips=el('div','','insight-chips');if(view.condition)chips.append(button('Matching practice conditions · remove',()=>{view.condition='';}));if(view.setup)chips.append(button('Coverage setup · remove',()=>{view.setup='';}));for(const name of ['key','root','quality','chord','degree'] as const)if(view[name])chips.append(button(name+': '+view[name]+' · remove',()=>{view[name]='';}));if(chips.children.length)chips.append(button('Clear filters',reset));analysis.append(chips);
   const filters=el('div','','insight-filters');
   filters.append(select('Root',view.root||'All roots',['All roots',...new Set(modeRows.map(r=>r.root))],v=>{view.root=v==='All roots'?'':v;}),select('Chord quality',view.quality||'All qualities',['All qualities',...new Set(modeRows.map(r=>r.quality))],v=>{view.quality=v==='All qualities'?'':v;}));
   if(mode==='m1')filters.append(select('Production category',view.production,['all','imagined-sung','played'],v=>{view.production=v;}));
   analysis.append(details('More filters',filters));
   if(view.dimension==='Key'){
    analysis.append(el('p',view.context==='Single Chord'?'Grouped by chord root; tonality is not inferred.':'Actual playback key, not chord root. Mixed conditions are descriptive.','insight-scope-note'));
    const dimension=view.context==='Single Chord'?'root':'key';
    let keyRows=insightFilter(modeRows,{...{key:view.key,root:view.root,quality:view.quality,chord:view.chord,degree:view.degree},[dimension]:''});
    if(view.context==='Progression'){analysis.append(button('Compare matching conditions',()=>{view.comparable=!view.comparable;},view.comparable));if(view.comparable){const report=insightKeyComparison(keyRows);keyRows=report.items;analysis.append(el('p',report.label??'No comparable keys yet. Each key needs sufficient questions and sessions under the same conditions.'));}}
    const groups=insightGroups(keyRows,dimension);
    const grid=el('div','','insight-key-grid');
    for(const name of [...insightKeys,...(groups.some(g=>g.label==='Not recorded')?['Not recorded']:[])]){
     const group=groups.find(g=>g.label===name),m=insightStats(group?.items??[]);
     const item=button(name,()=>{view[dimension]=name;view.dimension='Chord';},view[dimension]===name);item.setAttribute('aria-label','Inspect '+name);if(dimension==='root'&&group&&group.displayLabel!==name)item.append(el('small','Recorded as '+group.displayLabel));
     item.append(el(m.n?'strong':'span',m.n?percent(m):m.unassessed?'Unassessed only':'No records'));if(m.questions)item.append(el('span',`${m.correct}/${m.n} assessed`),el('small',`${m.questions} questions`),el('small',!insightEligible(group?.items??[])?'Limited sample':'Recorded'));grid.append(item);
    }analysis.append(grid);
   }else{
    if(view.dimension==='Chord')analysis.append(select('Chord view',view.chordView,['Chord quality','Full chord'],v=>{view.chordView=v;}));
    analysis.append(select('Sort',view.sort,['Errors','Practice volume','Name'],v=>{view.sort=v;}));
    const dimension=view.dimension==='Degree'?'degree':view.chordView==='Full chord'?'chord':'quality';
    const groups=insightGroups(rows,dimension).sort((a,b)=>view.sort==='Name'?a.label.localeCompare(b.label):view.sort==='Practice volume'?b.m.n-a.m.n||a.label.localeCompare(b.label):((b.m.n-b.m.correct)/(b.m.n||1)-(a.m.n-a.m.correct)/(a.m.n||1))||(b.m.n-b.m.correct)-(a.m.n-a.m.correct)||b.m.n-a.m.n||a.label.localeCompare(b.label));
    analysis.append(el('p','Recorded outcomes, not an ability ranking. Conditions and sample sizes may differ.','insight-scope-note'));
    for(const group of view.all?groups:groups.slice(0,5)){
     const row=el('article','','insight-data-row');row.append(el('h3',group.displayLabel),el('strong',percent(group.m)),el('p',`${group.m.correct} / ${group.m.n} assessed · ${group.m.questions} questions · ${group.m.sessions} sessions`));
     if(!insightEligible(group.items))row.append(el('small','Insufficient sample'));
     row.append(button('Inspect '+group.label,()=>{if(dimension==='degree'){const [quality,degree]=group.label.split(' / ');view.quality=quality;view.degree=degree;}else{view[dimension]=group.label;view.dimension='Degree';}}));analysis.append(row);
    }
    if(groups.length>5)analysis.append(button(view.all?'Show fewer':'All '+(view.dimension==='Chord'?'chords':'degrees'),()=>{view.all=!view.all;}));
    const wrong=rows.filter(r=>r.a.firstCorrect===false),confusions=new Map<string,number>();let unknown=0,unspecified=0;
    for(const r of wrong){const answer=r.a.gradingSource==='self'?r.a.imaginedWrongDegree:r.a.firstAnswer;if(!answer)unspecified++;else if(answer==='unknown')unknown++;else{const label=r.chordLabel+' · '+r.degree+' → '+answer;confusions.set(label,(confusions.get(label)||0)+1);}}
    analysis.append(details('Degree confusions',...Array.from(confusions).sort((a,b)=>b[1]-a[1]).map(([label,count])=>el('p',label+' · '+count)),el('p',`Unknown: ${unknown} · Incorrect without annotation: ${unspecified} · Unassessed: ${insightStats(rows).unassessed}`)));
   }
   host.append(analysis);
   if(view.context==='Single Chord'||view.family==='Play by Ear'){
    const selected=insightFilter(modeRows,{key:view.key,root:view.root,quality:view.quality,chord:view.chord});
    const ids=new Set(selected.map(r=>r.questionId));
    const timingRows=view.family==='Play by Ear'?modeRows.filter(r=>ids.has(r.questionId)):selected.filter(r=>!view.degree||r.degree===view.degree);
    const report=insightEfficiency(timingRows),efficiency=el('section','','insight-efficiency');
    efficiency.append(el('h2',view.family==='Play by Ear'?'Post-accompaniment completion delay':'Correct-response completion time'));
    efficiency.append(el('p',view.family==='Play by Ear'?'Whole questions only · all-correct, unassisted and uninterrupted · includes button interaction. Not per-note or per-chord playing speed.':'Valid first-correct responses only · includes interaction. Audiation is self-rated; methods remain separate.','insight-scope-note'));
    if(view.family==='Play by Ear')efficiency.append(el('p',view.degree?'Timing scope: parent questions; the degree filter is not applied to time.':'Timing scope: whole questions'+(view.chord||view.root||view.quality?' containing the selected chords.':'.')));
    if(!report.groups.length)efficiency.append(el('p','Unavailable · n=0 eligible questions'));
    const values=report.groups.map(g=>el('p',`${(g.median/1000).toFixed(2)}s median · n=${g.n} · ${g.label}`));
    efficiency.append(...values.slice(0,3));if(values.length>3)efficiency.append(details('All timing conditions',...values.slice(3)));
    efficiency.append(details('Timing exclusions',...report.excluded.map(x=>el('p',x.reason+': '+x.n))));host.append(efficiency);
   }

   const table=(caption:string,groups:ReturnType<typeof insightGroups>)=>{
    const scroll=el('div','','table-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',caption);
    const t=el('table');t.append(el('caption',caption));const thead=el('thead'),tr=el('tr');for(const title of ['Music','Correct / assessed','Questions','Sessions','Replay-assisted']){const th=el('th',title);th.scope='col';tr.append(th);}thead.append(tr);t.append(thead);const body=el('tbody');
    for(const g of groups){const row=el('tr');row.append(el('th',g.displayLabel),el('td',`${g.m.correct}/${g.m.n}`),el('td',String(g.m.questions)),el('td',String(g.m.sessions)),el('td',`${g.m.replayed}/${g.m.n}`));(row.firstChild as HTMLTableCellElement).scope='row';body.append(row);}t.append(body);scroll.append(t);return scroll;
   };
   const fullGroups=new Map<string,InsightRecord[]>();for(const r of rows){const label=(r.context==='Progression'?(r.key??'Not recorded'):r.root)+' / '+r.chord;const items=fullGroups.get(label)??[];items.push(r);fullGroups.set(label,items);}
   const full=details('Detailed breakdown',table('Chord quality × degree',insightGroups(rows,'degree')),table(view.context==='Progression'?'Practice key × chord':'Chord root × chord',[...fullGroups].map(([label,items])=>({label,displayLabel:[...new Set(items.map(r=>(r.context==='Progression'?(r.key??'Not recorded'):r.rootLabel)+' / '+r.chordLabel))].join('; '),items,m:insightStats(items)}))));const chordDegrees=new Map<string,InsightRecord[]>();for(const r of rows){const label=r.chord+' / '+r.degree,items=chordDegrees.get(label)??[];items.push(r);chordDegrees.set(label,items);}full.append(table('Full chord × degree',[...chordDegrees].map(([label,items])=>({label,displayLabel:[...new Set(items.map(r=>r.chordLabel+' / '+r.degree))].join('; '),items,m:insightStats(items)}))));host.append(full);
   const sources=new Map<string,InsightRecord>();for(const r of rows){const identity=JSON.stringify(r.source);if(!sources.has(identity))sources.set(identity,r);}
   const conditions=details('Source conditions');
   for(const r of sources.values()){const label=insightConditionLabel(r),c=r.source,section=el('section');section.append(el('h3',label));if('mode'in c)section.append(el('p','Target pools: '+Object.entries(c.pools).map(([q,p])=>q+': '+p?.join(', ')).join('; ')),el('p','Voicing mix: '+c.levels.map(n=>Math.round(n*100)+'%').join(', ')),el('p','Volume: '+Math.round(c.volume*100)+'%'));
    else section.append(el('p','Voicing mix: '+(c.voiceLevels??[1,1,1,1,1]).map(n=>Math.round(n*100)+'%').join(', ')),el('p','Volume: '+Math.round(c.volume*100)+'%'));
    section.append(el('p',r.sourceKnown?'Source setup recorded':'Original C-source not recorded'),el('p','Date attribution: '+r.dateSource));conditions.append(section);
   }
   const versions=[...new Set(rows.map(r=>(r.generator??'Generator not recorded')+' · '+(r.timing??'Timing version not recorded')+' · exposure '+(r.exposure??'not recorded')))];
   conditions.append(details('Technical versions',...versions.map(v=>el('p',v))));host.append(conditions);
   if(view.chord||view.quality)host.append(details('Recorded harmonic contexts',...Array.from(new Set(Array.from(sources.values()).map(insightConditionLabel))).map(label=>el('p',label))));
   const history=details('Sessions'),list=el('ul','','session-history');
   const matched=[...new Set(rows.map(r=>r.sessionId))].map(id=>({id,items:rows.filter(r=>r.sessionId===id),whole:all.filter(r=>r.sessionId===id)})).sort((a,b)=>Math.max(...b.items.map(r=>r.time??0))-Math.max(...a.items.map(r=>r.time??0)));
   for(const [i,session] of matched.entries()){
    const first=session.items[0],date=first.time===null?'Date not recorded':dateLabel(first.time),m=insightStats(session.items),whole=insightStats(session.whole),li=el('li'),link=el('a',`${date} · ${exerciseNames[first.a.exercise]} · matching ${m.n} assessed notes / ${whole.n} session assessed notes · ${m.questions} matching questions`);link.href=first.href;li.append(link);list.append(li);
    if(i===0){const latest=el('a','View latest matching session','session-link');latest.href=first.href;history.append(latest);}
   }history.append(list);host.append(history);
   if(!rows.length){host.append(el('p',all.some(r=>r.a.exercise===mode)?'No matching records in this period. Try a wider period.':'No records for this exercise yet.'),button('Show all time',()=>{view.days=0;}),button('Practice '+exerciseNames[mode as keyof typeof exerciseNames],()=>{const progression=modeForExercise(mode);location.hash=progression?'progression/'+progression:'home';}));}
  }
  if(!all.length)host.prepend(el('p','No V2 records in this browser. Choose an exercise to begin.'));
  finish();
 }
 render();
}
