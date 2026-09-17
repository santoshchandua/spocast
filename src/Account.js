import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useAuth } from './AuthContext';
import { mutate, request } from './api';
import { s, colors } from './styles';
export function Action({ title, onPress, disabled, secondary }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={disabled ? undefined : onPress} style={[a.action, secondary && a.secondary, disabled && { opacity: 0.5 }]}><Text style={{ color: secondary ? colors.green : '#fff', fontWeight: '700', fontSize: 15 }}>{title}</Text></Pressable>; }
function Field({ label, value, onChangeText, secret, email }) { return <View style={{ marginTop: 12 }}><Text style={s.body}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} secureTextEntry={secret} autoCapitalize={email || secret ? 'none' : 'sentences'} autoCorrect={false} keyboardType={email ? 'email-address' : 'default'} style={a.input} maxLength={secret ? 128 : 254} /></View>; }
export default function Account() {
  const auth = useAuth(), [email, setEmail] = useState(''), [phone, setPhone] = useState('+91'), [challenge, setChallenge] = useState(null), [deleteChallenge, setDeleteChallenge] = useState(null), [resendAt, setResendAt] = useState(0), [now, setNow] = useState(Date.now()), [name, setName] = useState(''), [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [problem, setProblem] = useState(false), [plans, setPlans] = useState(null), [subscription, setSubscription] = useState(null), [sessions, setSessions] = useState([]), [preferences, setPreferences] = useState(null), [payments, setPayments] = useState([]), [exported, setExported] = useState(null), [deleteConfirm, setDeleteConfirm] = useState(false);
  const checkoutKeys = useRef({});
  const reload = async () => {
    setPlans(await request('/plans'));
    if (auth.user) { const [sub, devices, prefs, history] = await Promise.all([request('/me/subscription'), request('/me/sessions'), request('/me/preferences'), request('/me/payments')]); setSubscription(sub); setSessions(devices); setPreferences(prefs); setPayments(history); setName(auth.user.name); setEmail(auth.user.email || ''); }
  };
  useEffect(() => { reload().catch(e=>{setMessage(e.message);setProblem(true);}); }, [auth.user?.id, auth.revision]);
  const run = async fn => { if (busy) return; setBusy(true); setMessage(''); setProblem(false); try { const result = await fn(); if (result?.message) setMessage(result.message); } catch (e) { setMessage(e.message); setProblem(true); } finally { setBusy(false); } };
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const sendOtp=()=>run(async()=>{const result=await mutate('/auth/otp/request',{fullName:name,phone,...(email.trim()?{email:email.trim()}: {})});setChallenge(result);setResendAt(Date.now()+result.resendAfter*1000);setCode('');return result;});
  const submit=()=>run(async()=>{await auth.login(challenge.challengeId,code.trim());setCode('');setChallenge(null);});
  const openBilling = async (path, body={}, headers={}) => { const {url}=await mutate(path,body,'POST',headers); if (!url?.startsWith('https://')) throw new Error('Invalid payment URL'); await Linking.openURL(url); };
  if (!auth.ready) return <ActivityIndicator color={colors.green} />;
  return <View><Text style={s.kicker}>YOUR CRICKET, YOUR WAY</Text><Text style={s.pageTitle}>{auth.user ? `Hi, ${auth.user.name}` : 'Your account'}</Text>
    {!!message && <View accessibilityRole="alert" style={[a.message, problem && { backgroundColor:'#fff0dc' }]}><Text style={s.body}>{message}</Text></View>}
    {busy && <ActivityIndicator color={colors.green} style={{marginVertical:10}} />}
    {!auth.user ? <View style={s.card}><Text style={s.heading}>Sign in with your mobile</Text><Text style={s.body}>New here? Your account is created after you verify your number.</Text>
      {!challenge ? <><Field label="Full name" value={name} onChangeText={setName} /><Field label="Mobile number with country code" value={phone} onChangeText={setPhone} /><Field label="Email (optional)" email value={email} onChangeText={setEmail} /><Action title="Send OTP" onPress={sendOtp} disabled={busy || name.trim().length<2 || !/^\+[1-9]\d{7,14}$/.test(phone)} /></> : <><Text style={s.body}>Code sent to {challenge.destination}. Expires in five minutes.</Text><Field label="Six-digit OTP" value={code} onChangeText={setCode} /><Action title="Verify & sign in" onPress={submit} disabled={busy || !/^\d{6}$/.test(code)} /><Action secondary title={now<resendAt ? 'Resend in '+Math.ceil((resendAt-now)/1000)+'s' : 'Resend OTP'} onPress={sendOtp} disabled={busy || now<resendAt} /><Action secondary title="Change details" disabled={busy} onPress={()=>{setChallenge(null);setCode('');}} /></>}
      <Text style={[s.meta,{marginTop:12}]}>Your mobile number is your sign-in identity. Email is optional. Never share your OTP.</Text>
    </View> : <>
      <View style={s.card}><Text style={s.heading}>Your profile</Text><Text style={s.body}>{auth.user.phone}</Text><Text style={s.category}>MOBILE VERIFIED</Text>
        <Field label="Full name" value={name} onChangeText={setName} /><Field label="Email (optional)" email value={email} onChangeText={setEmail} /><Action title="Save profile" disabled={busy} onPress={()=>run(async()=>{await mutate('/me',{name,email},'PATCH');await auth.refresh();return {message:'Profile saved.'};})} />
        <Action secondary title="Sign out" disabled={busy} onPress={()=>run(()=>auth.logout())} />
      </View>
      <View style={s.card}><Text style={s.heading}>Your membership</Text><Text style={s.body}>{subscription?.entitlements.plus ? 'Pulse Plus is active' : 'Free membership'}</Text>
        {subscription?.subscriptions.map(sub=><View key={sub.id} style={a.section}><Text style={s.player}>{sub.plan_id} · {sub.status}</Text><Text style={s.meta}>{sub.current_period_end ? `Period ends ${new Date(sub.current_period_end).toLocaleDateString()}` : 'Awaiting payment confirmation'}</Text>{sub.cancel_at_period_end ? <Text style={s.meta}>Renewal cancellation requested</Text> : <Action secondary title="Cancel renewal" disabled={busy} onPress={()=>run(async()=>{const result=await mutate('/billing/cancel',{subscriptionId:sub.id});await reload();return result;})} />}</View>)}
        {Platform.OS === 'web' && plans?.provider === 'stripe' && subscription?.subscriptions.length>0 && <Action title="Open secure billing portal" disabled={busy} onPress={()=>run(()=>openBilling('/billing/portal'))} />}
        <Action secondary title="Refresh payment status" disabled={busy} onPress={()=>run(reload)} />
      </View>
      <View style={s.card}><Text style={s.heading}>Privacy controls</Text><Text style={s.body}>Optional tracking starts off. Sponsor slots do not load third-party tracking scripts.</Text>
        {preferences && [['analytics_consent','Allow optional analytics'],['marketing_consent','Allow marketing emails']].map(([key,label])=><View key={key} style={a.switchRow}><Text style={[s.body,{flex:1}]}>{label}</Text><Switch accessibilityLabel={label} value={preferences[key]} disabled={busy} onValueChange={value=>run(async()=>{await mutate('/me/preferences',{[key]:value},'PATCH');setPreferences({...preferences,[key]:value});})} /></View>)}
        <Action secondary title="View my data export" disabled={busy} onPress={()=>run(async()=>setExported(await request('/me/export')))} />
        {exported && <><Text selectable style={a.export}>{JSON.stringify(exported,null,2)}</Text><Action secondary title="Hide export" onPress={()=>setExported(null)} /></>}
        <Action secondary title="Request account deletion" disabled={busy} onPress={()=>setDeleteConfirm(v=>!v)} />
        {deleteConfirm && <><Text style={s.body}>This suspends access immediately. Support must complete deletion and subscription cancellation.</Text><Action secondary title="Send deletion OTP" disabled={busy} onPress={()=>run(async()=>{const result=await mutate('/me/deletion-otp');setDeleteChallenge(result.challengeId);setCode('');return result;})} />{deleteChallenge && <><Field label="Deletion OTP" value={code} onChangeText={setCode} /><Action title="Confirm deletion request" disabled={busy || !/^\d{6}$/.test(code)} onPress={()=>run(async()=>{const result=await mutate('/me/deletion-request',{challengeId:deleteChallenge,code});await auth.forget();setCode('');setDeleteConfirm(false);setDeleteChallenge(null);return result;})} /></>}</>}
      </View>
      <View style={s.card}><Text style={s.heading}>Account security</Text><Text style={s.body}>Sign-in uses a one-time mobile verification code.</Text>
        <Text style={[s.heading,{marginTop:20}]}>Active sessions</Text>{sessions.map(session=><View key={session.id} style={a.section}><Text style={s.player}>{session.device_label}{session.current ? ' · This session' : ''}</Text><Text style={s.meta}>Expires {new Date(session.expires_at).toLocaleString()}</Text><Action secondary title="Revoke session" disabled={busy} onPress={()=>run(async()=>{await mutate(`/me/sessions/${session.id}`,{},'DELETE');if(session.current) await auth.forget();else await reload();})} /></View>)}
        <Action secondary title="Sign out all devices" disabled={busy} onPress={()=>run(async()=>{await mutate('/auth/logout-all');await auth.forget();})} />
      </View>
      <View style={s.card}><Text style={s.heading}>Payment history</Text>{payments.length ? payments.map(p=><Text key={p.id} style={s.body}>{p.currency} {(Number(p.amount_minor)/100).toFixed(2)} · {p.status} · {new Date(p.created_at).toLocaleDateString()}</Text>) : <Text style={s.body}>No payments yet.</Text>}</View>
    </>}
    <View style={[s.card,{backgroundColor:'#e5f0e7'}]}><Text style={s.kicker}>PULSE PLUS</Text><Text style={[s.heading,{marginVertical:10}]}>More cricket. Fewer distractions.</Text><Text style={s.body}>UPI and UPI AutoPay are available through eligible Razorpay hosted checkouts when enabled for the business. Never enter your UPI PIN in this app.</Text>
      {plans?.plans.map(plan=><View key={plan.id} style={a.section}><Text style={s.heading}>{plan.name}</Text><Text style={s.body}>{plan.currency} {(plan.amount_minor/100).toFixed(2)} / {plan.interval}</Text>{plan.features.map(f=><Text key={f} style={s.body}>✓ {f}</Text>)}
        {Platform.OS === 'web' && plans.checkoutEnabled && auth.user?.verified ? <Action title={plans.provider==='razorpay'?'Pay securely · UPI / other methods':'Continue to secure checkout'} disabled={busy} onPress={()=>run(async()=>{checkoutKeys.current[plan.id] ||= Crypto.randomUUID();await openBilling('/billing/checkout',{planId:plan.id},{'Idempotency-Key':checkoutKeys.current[plan.id]});})} /> : <Text style={[s.meta,{marginTop:10}]}>{Platform.OS !== 'web' ? 'In-app purchases are not enabled in this build.' : !plans.checkoutEnabled ? 'Preview pricing · checkout is not enabled yet.' : 'Sign in with your mobile to subscribe.'}</Text>}
      </View>)}
    </View>
  </View>;
}
const a=StyleSheet.create({input:{borderWidth:1,borderColor:colors.line,backgroundColor:'#fff',borderRadius:8,padding:12,fontSize:16,color:colors.ink,minHeight:48},action:{backgroundColor:colors.green,borderRadius:8,padding:13,minHeight:44,alignItems:'center',marginTop:10},secondary:{backgroundColor:'#e7ede8'},message:{padding:16,backgroundColor:'#e5f0e7',borderRadius:10,marginVertical:14},section:{borderTopWidth:1,borderTopColor:colors.line,marginTop:16,paddingTop:16},switchRow:{flexDirection:'row',alignItems:'center',gap:12,marginTop:14},export:{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:12,lineHeight:18,padding:10,color:colors.ink}});
