import React,{useEffect,useState} from 'react';
import {AppState,Text,View} from 'react-native';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {API,request} from './api';
import {Action} from './Account';
import {s} from './styles';
export default function AudioCommentary({matchId}){
  const player=useAudioPlayer(null,{crossOrigin:'anonymous'}),status=useAudioPlayerStatus(player);
  const [data,setData]=useState(null),[error,setError]=useState(''),[selected,setSelected]=useState(null);
  useEffect(()=>{const controller=new AbortController();const load=()=>request(`/matches/${matchId}/audio`,controller.signal).then(v=>{if(!controller.signal.aborted){setData(v);setError('');}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});load();const timer=setInterval(()=>{if(AppState.currentState==='active')load();},15000);return()=>{controller.abort();clearInterval(timer);};},[matchId]);
  const play=clip=>{try{if(!__DEV__&&!API.startsWith('https://'))throw new Error('Secure audio connection required');player.replace({uri:API+clip.url});player.play();setSelected(clip.id);setError('');}catch{setError('Audio could not start. Please retry.');}};
  const ready=data?.clips.filter(c=>c.status==='ready')||[];
  return <View style={s.card}><Text style={s.heading}>Listen to commentary</Text><Text style={s.category}>AI-GENERATED AUDIO</Text><Text style={s.body}>{data?.disclosure||'AI narration of ball-by-ball commentary.'}</Text>{data?.dataMode==='demo'&&<Text style={s.meta}>Fictional demo commentary, not a real broadcast.</Text>}{!!error&&<Text accessibilityRole="alert" style={s.body}>{error}</Text>}{data&&!data.enabled&&<Text style={s.body}>Voice generation is not enabled yet. Text commentary remains available below.</Text>}{data?.enabled&&!ready.length&&<Text style={s.body}>Waiting for generated commentary.</Text>}{selected&&<Action title={status.playing?'Pause audio':'Resume audio'} secondary onPress={async()=>{try{if(status.playing)player.pause();else{if(status.didJustFinish)await player.seekTo(0);player.play();}}catch{setError('Unable to play this clip.');}}} />}{ready.slice(-6).reverse().map(c=><Action key={c.id} title={`▶ Over ${c.ball_label}${selected===c.id?' · Selected':''}`} secondary onPress={()=>play(c)} />)}</View>;
}
