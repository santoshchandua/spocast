import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { request } from './api';
import { s, colors } from './styles';

function Choice({children,active,onPress}) { return <Pressable accessibilityRole="button" accessibilityState={{selected:!!active}} onPress={onPress} style={[s.button,active&&s.buttonActive]}><Text style={[s.buttonText,active&&s.white]}>{children}</Text></Pressable>; }
export default function Series() {
  const [list,setList]=useState([]),[selected,setSelected]=useState(null),[metric,setMetric]=useState('runs'),[data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[loading,setLoading]=useState(true),[qualified,setQualified]=useState(false),[offset,setOffset]=useState(0),[nextSeries,setNextSeries]=useState(null),[listOffset,setListOffset]=useState(0);
  useEffect(()=>{
    const c=new AbortController(); setLoading(true); setError('');
    const path=selected?`/series/${encodeURIComponent(selected.id)}/statistics?metric=${metric}&offset=${offset}${qualified?'&minInnings=3&minBalls=30':''}`:`/series?offset=${listOffset}`;
    request(path,c.signal).then(value=>{if(c.signal.aborted)return; if(selected)setData(value);else {setList(value.series);setNextSeries(value.nextOffset);} }).catch(()=>{if(!c.signal.aborted)setError('Could not load series statistics. Please try again.');}).finally(()=>{if(!c.signal.aborted)setLoading(false);});
    return()=>c.abort();
  },[selected,metric,qualified,offset,listOffset,retry]);
  const changeMetric=key=>{setMetric(key);setOffset(0);};
  return <View><Text style={s.kicker}>THE SERIES DESK</Text><Text style={s.pageTitle}>Series statistics</Text>
    {selected&&<Choice onPress={()=>{setSelected(null);setData(null);setOffset(0);}}>‹ All series</Choice>}
    {!!error&&<View style={s.error}><Text style={s.body}>{error}</Text><Choice onPress={()=>setRetry(r=>r+1)}>Retry</Choice></View>}
    {loading?<ActivityIndicator style={s.loader} color={colors.green}/>:error?null:!selected?<>
      <Text style={[s.body,{marginVertical:16}]}>Choose a competition to explore batting, bowling and fielding leaders.</Text>
      {list.map(item=><Pressable key={item.id} accessibilityRole="button" onPress={()=>{setSelected(item);setMetric('runs');setOffset(0);setQualified(false);setData(null);}} style={s.card}><Text style={s.category}>{item.format} · {item.data_mode==='demo'?'FICTIONAL DEMO':'LICENSED DATA'}</Text><Text style={[s.heading,{marginVertical:10}]}>{item.name}</Text><Text style={s.meta}>{item.source_label} · View statistics ›</Text></Pressable>)}
      {!list.length&&<Text style={s.body}>No series statistics available yet.</Text>}
      <View style={s.filters}>{listOffset>0&&<Choice onPress={()=>setListOffset(Math.max(0,listOffset-100))}>Previous series</Choice>}{nextSeries!==null&&<Choice onPress={()=>setListOffset(nextSeries)}>More series</Choice>}</View>
    </>:data&&<>
      <Text style={[s.heading,{marginTop:18}]}>{data.series.name}</Text><Text style={s.meta}>{data.series.format} · {data.series.data_mode==='demo'?'Fictional demo figures':data.series.source_label}</Text><Text style={s.meta}>Updated {new Date(data.series.updated_at).toLocaleString()}</Text>
      {['Batting','Bowling','Fielding'].map(group=><View key={group}><Text style={[s.category,{marginTop:16}]}>{group}</Text><View style={s.filters}>{data.metrics.filter(m=>m.group===group).map(m=><Choice key={m.key} active={metric===m.key} onPress={()=>changeMetric(m.key)}>{m.label}</Choice>)}</View></View>)}
      <Choice active={qualified} onPress={()=>{setQualified(v=>!v);setOffset(0);}}>Minimum sample: {qualified?'3 batting innings + 30 balls':'All players'}</Choice>
      <Text style={[s.meta,{marginVertical:12}]}>Balls means legal balls bowled for bowling; balls faced otherwise. Rates use series totals. Economy is runs conceded per 6 legal balls. Hauls count innings with 3+ or 5+ wickets (overlapping). Unknown values are excluded; zero is retained. No official qualification threshold is implied.</Text>
      <View style={s.card}><Text style={s.heading}>{data.metric.label}</Text><Text style={s.meta}>{data.metric.direction==='asc'?'Lowest first':'Highest first'} · Equal values are ordered by player name.</Text>
        {data.players.map(player=><View key={player.player_id} style={s.infoRow}><View style={{flex:1}}><Text style={s.player}>{player.name}</Text><Text style={s.meta}>{player.team} · {player.statistics.matches??'—'} matches</Text></View><Text style={s.heading}>{Number(player.value).toLocaleString(undefined,{maximumFractionDigits:2})}</Text></View>)}
        {!data.players.length&&<Text style={s.body}>No available statistics for this selection.</Text>}
      </View><View style={s.filters}>{offset>0&&<Choice onPress={()=>setOffset(Math.max(0,offset-100))}>Previous</Choice>}{data.nextOffset!==null&&<Choice onPress={()=>setOffset(data.nextOffset)}>Next</Choice>}</View>
    </>}
  </View>;
}
