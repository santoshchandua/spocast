import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { request } from './api';
import { s, colors } from './styles';
import Account from './Account';
import Records from './Records';
import AudioCommentary from './AudioCommentary';
import { AuthProvider, useAuth } from './AuthContext';
import { AdSlot, MatchTools } from './Features';

function Button({ children, onPress, active, style }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={({ pressed }) => [s.button, active && s.buttonActive, style, pressed && { opacity: 0.65 }]}><Text style={[s.buttonText, active && s.white]}>{children}</Text></Pressable>;
}
function MatchCard({ match, onPress, featured }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${match.teams.map(t => t.name).join(' versus ')} match`} onPress={onPress} style={({ pressed }) => [s.card, featured && s.featured, pressed && { opacity: 0.85 }]}>
    <View style={s.rowBetween}><Text style={[s.eyebrow, featured && s.light]}>{match.stage.toUpperCase()} · {match.format}</Text><Text style={[s.status, match.status === 'live' && { color: featured ? colors.lime : colors.green }]}>{match.status === 'live' ? '● LIVE' : match.status.toUpperCase()}</Text></View>
    <Text style={[s.series, featured && s.light]}>{match.series}</Text>
    {match.teams.map(team => <View key={team.code} style={s.teamRow}><View style={[s.teamBadge, featured && { backgroundColor: '#30624f' }]}><Text style={[s.teamCode, featured && { color: colors.lime }]}>{team.code}</Text></View><Text style={[s.teamName, featured && s.white]}>{team.name}</Text><View style={s.scoreBlock}><Text style={[s.score, featured && s.white]}>{team.score}</Text>{!!team.overs && <Text style={[s.meta, featured && s.light]}>({team.overs} ov)</Text>}</View></View>)}
    <Text style={[s.matchSummary, featured && { color: colors.lime, borderTopColor: '#356650' }]}>{match.summary}</Text><Text style={[s.meta, featured && s.light, { marginTop: 10 }]}>Match centre  ›</Text>
  </Pressable>;
}
function Empty({ title, message }) { return <View style={s.empty}><Text style={s.heading}>{title}</Text><Text style={[s.body, { textAlign: 'center', marginTop: 8 }]}>{message}</Text></View>; }
function Scorecard({ innings }) {
  if (!innings.length) return <Empty title="Scorecard unavailable" message="This demo includes a full scorecard for India vs Australia. Other matches show summary scores only." />;
  return innings.map(inn => <View key={inn.team} style={s.card}><View style={s.rowBetween}><Text style={s.heading}>{inn.team} innings</Text><Text style={s.category}>{inn.total}</Text></View>
    <View style={s.tableRow}><Text style={[s.tableName, s.meta]}>BATTER</Text>{['R', 'B', '4s', '6s'].map(h => <Text key={h} style={[s.cell, s.meta]}>{h}</Text>)}</View>
    {inn.batting.map(p => <View key={p.name} style={s.tableRow}><View style={s.tableName}><Text style={s.player}>{p.name}</Text><Text style={s.meta}>{p.dismissal}</Text></View>{[p.runs, p.balls, p.fours, p.sixes].map((v, i) => <Text key={i} style={[s.cell, i === 0 && { fontWeight: '700' }]}>{v}</Text>)}</View>)}
    <Text style={[s.body, { marginVertical: 14 }]}>Extras {inn.extras} (4 byes, 4 leg byes)</Text>
    <View style={s.tableRow}><Text style={[s.tableName, s.meta]}>BOWLER</Text>{['O', 'M', 'R', 'W'].map(h => <Text key={h} style={[s.cell, s.meta]}>{h}</Text>)}</View>
    {inn.bowling.map(p => <View key={p.name} style={s.tableRow}><Text style={[s.tableName, s.player]}>{p.name}</Text>{[p.overs, p.maidens, p.runs, p.wickets].map((v, i) => <Text key={i} style={s.cell}>{v}</Text>)}</View>)}
  </View>);
}
function Main() {
  const auth = useAuth();
  const [tab, setTab] = useState('Scores');
  const [filter, setFilter] = useState('all');
  const [matches, setMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selection, setSelection] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [detailTab, setDetailTab] = useState('Overview');
  const [retry, setRetry] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const busy = useRef(false);
  const scroll = useRef(null);
  useEffect(() => { if (auth.user) request('/me/favorites').then(setFavorites).catch(()=>setFavorites([])); else setFavorites([]); }, [auth.user?.id, auth.revision, selection]);
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const [m, n] = await Promise.all([request('/matches'), request('/news')]);
      setMatches(m); setNews(n); setError('');
    } catch { setError('Cannot reach the scores API. Check that the backend is running and your phone is on the same Wi-Fi.'); }
    finally { busy.current = false; setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (AppState.currentState === 'active') load(); }, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [load]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (!selection) return;
    const controller = new AbortController();
    setDetail(null); setDetailError('');
    request(`/${selection.type}/${selection.id}`, controller.signal).then(data => { if (!controller.signal.aborted) setDetail(data); }).catch(() => { if (!controller.signal.aborted) setDetailError('Could not load this page. Please try again.'); });
    return () => controller.abort();
  }, [selection, retry]);
  useEffect(() => {
    if (selection?.type !== 'matches') return;
    const controller = new AbortController();
    const timer = setInterval(() => { if (AppState.currentState === 'active') request(`/matches/${selection.id}`, controller.signal).then(value=>{if(!controller.signal.aborted)setDetail(value);}).catch(()=>{}); }, 30000);
    return ()=>{controller.abort();clearInterval(timer);};
  }, [selection]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selection) { setSelection(null); return true; }
      if (tab !== 'Scores') { setTab('Scores'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [selection, tab]);
  const open = (type, id) => { setDetail(null); setDetailError(''); setDetailTab('Overview'); setSelection({ type, id }); };
  const visible = matches.filter(m => tab === 'Fixtures' ? m.status === 'upcoming' : filter === 'following' ? favorites.includes(m.id) : filter === 'all' || m.status === filter);
  const refresh = () => { if (selection) setRetry(r => r + 1); else { setRefreshing(true); load(); } };
  return <SafeAreaView style={s.safe}><StatusBar style="dark" />
    <View style={s.header}><View><Text style={s.brand}>cricket<Text style={{ color: colors.green }}>pulse /</Text></Text><Text style={s.meta}>EVERY BALL. EVERY MOMENT.</Text></View><View style={s.demoBadge}><Text style={s.demoText}>{matches.some(m=>m.dataMode==='licensed')?'PULSE':'DEMO'}</Text></View></View>
    <ScrollView ref={scroll} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} />}>
      {tab === 'Records' && !selection ? <Records /> : tab === 'Account' && !selection ? <Account /> : selection ? <><Button onPress={() => setSelection(null)} style={s.back}>‹ Back to {tab.toLowerCase()}</Button>
        {detailError ? <><Empty title="Connection interrupted" message={detailError} /><Button onPress={() => setRetry(r => r + 1)}>Try again</Button></> : !detail ? <ActivityIndicator style={s.loader} color={colors.green} size="large" /> : selection.type === 'news' ? <View style={s.newsCard}><Text style={s.category}>{detail.category} · SAMPLE ARTICLE</Text><Text style={s.readerTitle}>{detail.title}</Text><Text style={s.meta}>{detail.readMinutes} min read</Text>{detail.body.map((p, i) => <Text key={i} style={s.paragraph}>{p}</Text>)}</View> : <>
          <MatchCard match={detail} featured onPress={() => setDetailTab('Overview')} />
          <MatchTools match={detail} onAccount={()=>{setSelection(null);setTab('Account');}} />
          <View style={s.filters}>{['Overview', 'Scorecard', 'Commentary'].map(t => <Button key={t} active={detailTab === t} onPress={() => setDetailTab(t)}>{t}</Button>)}</View>
          {detailTab === 'Commentary' && <AudioCommentary key={detail.id} matchId={detail.id} />}
          {detailTab === 'Overview' ? <View style={s.card}><Text style={s.heading}>Match information</Text>{[['Series', detail.series], ['Venue', detail.venue], ['Format', detail.format], ['Starts', new Date(detail.startTime).toLocaleString()]].map(([k, v]) => <View key={k} style={s.infoRow}><Text style={s.body}>{k}</Text><Text style={s.infoValue}>{v}</Text></View>)}<Text style={[s.body, { marginTop: 16 }]}>Fictional demo fixture. Scores are fixed snapshots and do not represent a real live match.</Text></View> : detailTab === 'Scorecard' ? <Scorecard innings={detail.innings} /> : detail.commentary.length ? <View style={s.card}><Text style={s.heading}>Ball by ball</Text><Text style={[s.meta, { marginTop: 6 }]}>Latest first · Sample commentary</Text>{detail.commentary.map(ball => <View key={ball.over} style={s.commentRow}><View><Text style={s.player}>{ball.over}</Text><View style={[s.runBadge, ['4', '6'].includes(ball.runs) && { backgroundColor: colors.lime }]}><Text style={s.player}>{ball.runs}</Text></View></View><Text style={[s.body, { flex: 1 }]}>{ball.text}</Text></View>)}</View> : <Empty title={detail.status === 'upcoming' ? 'The first ball is still to come' : 'No commentary in this demo'} message="Open India vs Australia to explore sample ball-by-ball commentary." />}
        </>}
      </> : <>
        <View style={s.sectionHeader}><View><Text style={s.kicker}>THE CRICKET DESK</Text><Text style={s.pageTitle}>{tab === 'Scores' ? 'Match day' : tab === 'Fixtures' ? 'Coming up' : 'Inside the game'}</Text></View>{tab === 'Scores' && <Text style={s.liveCount}>{matches.filter(m => m.status === 'live').length} LIVE</Text>}</View>
        <View style={s.notice}><Text style={s.noticeText}>{matches.some(m=>m.dataMode==='licensed')?'Scores from your licensed feed · Check match update times':'Demo edition · Fictional matches and sample articles'}</Text></View>
        {!!error && <View style={s.error}><Text style={s.body}>{error}</Text>{!!matches.length && <Text style={s.meta}>Showing previously loaded demo data.</Text>}<Button onPress={load} style={{ marginTop: 12 }}>Retry connection</Button></View>}
        {loading ? <ActivityIndicator style={s.loader} size="large" color={colors.green} /> : tab === 'News' ? news.length ? news.map((a, i) => <Pressable accessibilityRole="button" key={a.id} onPress={() => open('news', a.id)} style={s.newsCard}><View style={s.rowBetween}><Text style={s.category}>{a.category}</Text><Text style={s.meta}>0{i + 1} / READ</Text></View><Text style={s.articleTitle}>{a.title}</Text><Text style={s.body}>{a.summary}</Text><Text style={[s.meta, { marginTop: 16 }]}>{a.readMinutes} min read  ↗</Text></Pressable>) : <Empty title="No articles available" message="Pull down to refresh or check the API connection." /> : <>
          {tab === 'Scores' && <View style={s.filters}>{[['all', 'All'], ['live', 'Live'], ['upcoming', 'Upcoming'], ['completed', 'Results'],['following','Following']].map(([value, label]) => <Button key={value} active={filter === value} onPress={() => setFilter(value)}>{label}</Button>)}</View>}
          {visible.length ? visible.map((m, i) => <MatchCard key={m.id} match={m} featured={tab === 'Scores' && i === 0 && m.status === 'live'} onPress={() => open('matches', m.id)} />) : <Empty title="No matches to show" message="Try another filter or pull down to refresh." />}
        </>}
        <AdSlot placement={tab==='News'?'news_inline':'scores_inline'} />
        <Text style={s.footer}>CRICKET PULSE / YOUR MATCH CENTRE</Text>
      </>}
    </ScrollView>
    <View style={s.navigation}>{[['Scores', '◉'], ['Fixtures', '▦'], ['News', '☰'],['Records','☆'],['Account','◎']].map(([name, icon]) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === name }} accessibilityLabel={name} key={name} onPress={() => { setSelection(null); setTab(name); scroll.current?.scrollTo({ y: 0, animated: false }); }} style={s.navItem}><Text style={[s.navIcon, tab === name && { color: colors.green }]}>{icon}</Text><Text style={[s.navLabel, tab === name && { color: colors.green, fontWeight: '700' }]}>{name}</Text></Pressable>)}</View>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><AuthProvider><Main /></AuthProvider></SafeAreaProvider>; }
