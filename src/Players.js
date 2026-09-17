import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { request } from './api';
import { Action } from './Account';
import { s, colors } from './styles';

export default function Players() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [format, setFormat] = useState('T20');
  const [group, setGroup] = useState('Batting');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const path = selected ? `/history/${encodeURIComponent(selected)}` : `/history?kind=player&search=${encodeURIComponent(search.trim())}`;
  const data = result?.path === path ? result.data : null;

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    const timer = setTimeout(() => {
      request(path, controller.signal).then(value => {
        if (!controller.signal.aborted) setResult({ path, data: value });
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, selected ? 0 : 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [path, retry]);

  const open = id => { setError(''); setSelected(id); setFormat('T20'); setGroup('Batting'); };
  const statistics = selected && data ? data.statistics.filter(stat => stat.format === format) : [];
  const groups = [...new Set(statistics.map(stat => stat.group || 'Batting'))];
  const activeGroup = groups.includes(group) ? group : groups[0];
  const visibleStatistics = statistics.filter(stat => (stat.group || 'Batting') === activeGroup);
  return <View>
    <Text style={s.kicker}>THE PEOPLE BEHIND THE GAME</Text>
    <Text style={s.pageTitle}>{selected && data ? data.name : 'Players'}</Text>
    {selected ? <Action title="Back to players" secondary onPress={() => { setSelected(null); setError(''); }} /> : <>
      <Text style={[s.body, { marginTop: 10 }]}>Explore player biographies, individual statistics and career milestones.</Text>
      <TextInput accessibilityLabel="Search players" placeholder="Search players by name" value={search} onChangeText={setSearch} autoCorrect={false} maxLength={80} style={{ minHeight: 48, padding: 14, marginVertical: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#fff', color: colors.ink }} />
    </>}
    {!!error && <View style={s.card}><Text accessibilityRole="alert" style={s.body}>{error}</Text><Action title="Retry players" onPress={() => setRetry(n => n + 1)} /></View>}
    {!data && !error && <ActivityIndicator color={colors.green} style={s.loader} />}
    {data && !selected && <>
      {!data.length && <View style={s.card}><Text style={s.heading}>No players found</Text><Text style={s.body}>Try another name or clear your search.</Text></View>}
      {data.map(player => <Pressable key={player.id} accessibilityRole="button" accessibilityLabel={`View ${player.name} profile`} onPress={() => open(player.id)} style={[s.card, { marginTop: 8 }]}>
        <Text style={s.category}>{player.team} · {player.data_mode === 'demo' ? 'DEMO PLAYER' : 'PLAYER'}</Text>
        <Text style={[s.heading, { marginTop: 10 }]}>{player.name}</Text>
        <Text style={s.body}>Career: {player.career_start} – {player.career_end || 'present'}</Text>
        <Text style={s.meta}>{player.source_label}</Text>
        <Text style={[s.player, { color: colors.green, marginTop: 14 }]}>Biography & statistics ›</Text>
      </Pressable>)}
    </>}
    {data && selected && <>
      <View style={[s.card, { marginTop: 18 }]}>
        <Text style={s.category}>{data.team} · {data.data_mode === 'demo' ? 'FICTIONAL DEMO PROFILE' : 'PLAYER PROFILE'}</Text>
        <Text style={[s.heading, { marginTop: 16 }]}>Biography</Text>
        <Text style={s.paragraph}>{data.biography || 'Biography is not available from the data provider yet.'}</Text>
        <Text style={[s.body, { marginTop: 14 }]}>Career: {data.career_start} – {data.career_end || 'present'}</Text>
        <Text style={s.meta}>{data.source_label}</Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Individual statistics</Text>
        <View style={s.filters}>{['T20', 'ODI', 'TEST'].map(value => <Action key={value} title={value} secondary={format !== value} onPress={() => setFormat(value)} />)}</View>
        <View style={s.filters}>{groups.map(value => <Action key={value} title={value} secondary={activeGroup !== value} onPress={() => setGroup(value)} />)}</View>
        {visibleStatistics.length ? visibleStatistics.map((stat, i) => <View key={`${stat.label}-${i}`} style={s.infoRow}><View style={{ flex: 2 }}><Text style={s.body}>{stat.label}</Text>{!!stat.definition && <Text style={s.meta}>{stat.definition}</Text>}</View><Text style={[s.infoValue, stat.value == null && { color: colors.muted, fontSize: 13 }]}>{stat.value ?? 'Not available'}</Text></View>) : <Text style={s.body}>No {format} statistics are available yet.</Text>}
        <Text style={[s.meta, { marginTop: 18 }]}>Statistics reflect the available provider snapshot. Missing figures are not treated as zero.</Text>
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Achievements & milestones</Text>
        {data.achievements.length ? data.achievements.map((item, i) => <View key={`${item.year}-${i}`} style={s.infoRow}><Text style={s.category}>{item.year}</Text><View style={{ flex: 1 }}><Text style={s.player}>{item.title}</Text><Text style={s.body}>{item.description}</Text></View></View>) : <Text style={s.body}>No achievements are available yet.</Text>}
      </View>
      <View style={s.card}>
        <Text style={s.heading}>Personal records</Text>
        {data.records.length ? data.records.map((record, i) => <View key={i} style={{ marginTop: 16 }}><Text style={s.category}>{record.format}</Text><Text style={s.player}>{record.title}</Text><Text style={s.score}>{record.value}</Text>{record.achieved_on && <Text style={s.meta}>{new Date(record.achieved_on).toLocaleDateString()}</Text>}</View>) : <Text style={s.body}>No records are available yet.</Text>}
      </View>
    </>}
  </View>;
}
