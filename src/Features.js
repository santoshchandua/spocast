import React, { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { request, mutate } from './api';
import { useAuth } from './AuthContext';
import { Action } from './Account';
import { s, colors } from './styles';
export function AdSlot({ placement }) {
  const [ad,setAd]=useState(null), auth=useAuth();
  useEffect(()=>{let live=true;request(`/ads/${placement}`).then(v=>{if(live)setAd(v);}).catch(()=>{if(live)setAd(null);});return()=>{live=false;};},[placement,auth.user?.id,auth.revision]);
  if(!ad)return null;
  return <View style={[s.card,{borderStyle:'dashed',backgroundColor:'#edf0ed'}]}><Text style={[s.meta,{letterSpacing:2}]}>ADVERTISEMENT</Text><Text style={[s.heading,{marginVertical:8}]}>{ad.headline}</Text><Text style={s.body}>{ad.body}</Text>{ad.destination_url?.startsWith('https://') && <Action secondary title="Visit sponsor" onPress={()=>Linking.openURL(ad.destination_url)} />}</View>;
}
export function MatchTools({ match, onAccount }) {
  const auth=useAuth(),[saved,setSaved]=useState(false),[insight,setInsight]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;setSaved(false);setInsight(null);setError('');request(`/matches/${match.id}/insights`).then(v=>{if(live)setInsight(v);}).catch(e=>{if(live)setError(e.message);});if(auth.user)request('/me/favorites').then(v=>{if(live)setSaved(v.includes(match.id));}).catch(()=>{});return()=>{live=false;};},[match.id,match.providerUpdatedAt,auth.user?.id,auth.revision]);
  const toggle=async()=>{if(!auth.user)return onAccount();if(busy)return;setBusy(true);setError('');try{if(saved)await mutate(`/me/favorites/${match.id}`,{},'DELETE');else await mutate('/me/favorites',{matchId:match.id});setSaved(!saved);}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <View style={s.card}><Text style={s.heading}>Your match centre</Text><Action secondary title={saved?'★ Remove from favorites':'☆ Follow this match'} disabled={busy} onPress={toggle} />
    {!!error&&<Text style={s.body}>{error}</Text>}
    {insight?.projection&&<><Text style={[s.kicker,{marginTop:22}]}>PACE PROJECTION · {insight.dataMode === 'demo'?'DEMO':'LIVE DATA'}</Text><Text style={[s.pageTitle,{color:colors.green}]}>{insight.projection.projectedTotal} runs</Text><Text style={s.body}>{insight.projection.team} · {insight.projection.currentRunRate} runs / over</Text><Text style={[s.meta,{marginTop:8}]}>{insight.projection.method}</Text>{insight.projection.scenarios ? insight.projection.scenarios.map(v=><Text key={v.runsPerOver} style={s.body}>{v.runsPerOver} RPO from here → {v.total} runs</Text>) : <Action secondary title="Explore Plus scenarios" onPress={onAccount} />}</>}
    <Text style={[s.meta,{marginTop:16}]}>{match.dataMode==='demo'?'Fixed demonstration snapshot':`Last received ${new Date(match.fetchedAt).toLocaleTimeString()}${match.stale?' · Update delayed':''}`}</Text>
  </View>;
}
