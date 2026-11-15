import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { isBackendConfigured, supabase } from './lib/supabase';
import { IMAGE, searchShows, trendingShows, showDetails } from './lib/tmdb';

const C = { bg:'#101116', panel:'#1b1c24', line:'#2b2c36', text:'#f3f0e9', muted:'#858691', gold:'#d9a66c', red:'#d87979' };
const TABS = ['Home','Discover','Watchlist','Activity','Profile'];
const STATUSES = [{id:'watchlist',label:'Plan to watch'},{id:'watching',label:'Watching'},{id:'completed',label:'Completed'},{id:'paused',label:'Paused'},{id:'dropped',label:'Dropped'}];
const poster = p => p ? IMAGE + p : null;

export default function App() {
  const [session,setSession] = useState(null), [profile,setProfile] = useState(null);
  const [tab,setTab] = useState('Home'), [query,setQuery] = useState('');
  const [items,setItems] = useState([]), [library,setLibrary] = useState([]);
  const [activity,setActivity] = useState([]), [selected,setSelected] = useState(null);
  const [busy,setBusy] = useState(false), [email,setEmail] = useState(''), [password,setPassword] = useState('');
  const [username,setUsername] = useState(''), [authMode,setAuthMode] = useState('signin');
  const [review,setReview] = useState(''), [rating,setRating] = useState('8'), [status,setStatus] = useState('watchlist');
  const [season,setSeason] = useState('1'), [episode,setEpisode] = useState('1');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => setSession(s));
    return () => subscription.unsubscribe();
  },[]);
  useEffect(() => { if (session?.user) { loadProfile(); loadLibrary(); loadActivity(); } else { setProfile(null); setLibrary([]); } },[session]);
  useEffect(() => { loadHome(); },[]);
  async function loadHome() {
    try { const data = await trendingShows(); setItems(data.results || []); }
    catch (e) { setItems([]); }
  }
  async function loadProfile() {
    const {data} = await supabase.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
    if (data) setProfile(data);
    else {
      const base = (session.user.email || 'episodia').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,18) || 'episodia';
      const candidate = base + Math.floor(Math.random()*900+100);
      const {data:created} = await supabase.from('profiles').insert({id:session.user.id,username:candidate,display_name:base}).select().single();
      if (created) setProfile(created);
    }
  }
  async function loadLibrary() {
    const {data,error} = await supabase.from('user_shows').select('*').eq('user_id',session.user.id).order('updated_at',{ascending:false});
    if (!error) setLibrary(data || []);
  }
  async function loadActivity() {
    const {data} = await supabase.from('reviews').select('*,profiles(username,display_name,avatar_url)').order('created_at',{ascending:false}).limit(40);
    setActivity(data || []);
  }
  async function authenticate() {
    if (!supabase) return Alert.alert('Backend not connected','The app backend still needs to be created and configured.');
    if (!email.trim() || password.length < 8) return Alert.alert('Check your details','Enter an email and a password with at least 8 characters.');
    setBusy(true);
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({email:email.trim(),password})
      : await supabase.auth.signInWithPassword({email:email.trim(),password});
    setBusy(false);
    if (result.error) Alert.alert('Could not continue',result.error.message);
    else if (authMode === 'signup' && !result.data.session) Alert.alert('Check your email','Confirm your email address, then sign in.');
  }
  async function saveShow(show,nextStatus=status) {
    if (!session) return Alert.alert('Sign in first','Create a free account to save series and track episodes.');
    const row = {user_id:session.user.id,tmdb_id:show.tmdb_id || show.id,title:show.title || show.name,poster_path:show.poster_path,first_air_date:show.first_air_date || null,status:nextStatus,current_season:Number(season)||0,current_episode:Number(episode)||0};
    const {error} = await supabase.from('user_shows').upsert(row,{onConflict:'user_id,tmdb_id'});
    if (error) Alert.alert('Could not save',error.message); else { await loadLibrary(); Alert.alert('Saved',row.title + ' added to your library.'); }
  }
  async function removeShow(id) {
    const {error} = await supabase.from('user_shows').delete().eq('id',id);
    if (!error) loadLibrary(); else Alert.alert('Could not remove',error.message);
  }
  async function updateProgress(show) {
    const {error} = await supabase.from('user_shows').update({current_season:Number(season)||0,current_episode:Number(episode)||0,status:'watching',updated_at:new Date().toISOString()}).eq('id',show.id);
    if (!error) { await loadLibrary(); Alert.alert('Progress saved','Your episode progress has been updated.'); }
  }
  async function publishReview() {
    if (!session || !selected) return Alert.alert('Sign in first','You need an account to post a review.');
    if (!review.trim()) return Alert.alert('Write something first','Your review is empty.');
    const {error} = await supabase.from('reviews').insert({user_id:session.user.id,tmdb_id:selected.id,show_title:selected.name || selected.title,body:review.trim(),rating:Number(rating),spoiler:false});
    if (error) Alert.alert('Could not post',error.message);
    else {setReview(''); await loadActivity(); Alert.alert('Published','Your review is now live.');}
  }
  async function runSearch() {
    if (!query.trim()) return loadHome();
    setBusy(true);
    try { const data = await searchShows(query.trim()); setItems(data.results || []); }
    catch(e) { Alert.alert('Search unavailable',e.message); }
    setBusy(false);
  }
  async function openShow(show) {
    setSelected(show); setReview('');
    try { const d = await showDetails(show.id); setSelected(d); }
    catch(e) {}
  }
  const shownLibrary = useMemo(() => tab==='Watchlist' ? library.filter(x=>x.status==='watchlist') : tab==='Home' ? library.filter(x=>x.status==='watching') : library,[library,tab]);
  const heading = tab==='Home' ? 'Your next obsession.' : tab==='Discover' ? 'Find your next favourite.' : tab==='Watchlist' ? 'Saved for later.' : tab==='Activity' ? 'The community diary.' : 'Your viewing world.';
  const Card = ({item,owned=false}) => <Pressable style={s.card} onPress={()=>openShow(owned ? {id:item.tmdb_id,name:item.title,poster_path:item.poster_path,first_air_date:item.first_air_date} : item)}>
    <View style={s.poster}>{poster(item.poster_path) ? <Image source={{uri:poster(item.poster_path)}} style={s.posterImg}/> : <View style={s.posterFallback}><Text style={s.posterLetter}>{(item.name||item.title||'?').slice(0,1)}</Text></View>}
      <Pressable style={s.add} onPress={e=>{e.stopPropagation(); owned ? removeShow(item.id) : saveShow(item,'watchlist')}}><Text style={s.addText}>{owned?'−':'＋'}</Text></Pressable>
    </View><Text style={s.cardTitle} numberOfLines={1}>{item.name||item.title}</Text><Text style={s.muted}>{(item.first_air_date||'').slice(0,4)} · {owned ? STATUSES.find(x=>x.id===item.status)?.label : (item.vote_average||0).toFixed(1)+' ★'}</Text>
  </Pressable>;
  const Header = () => <View style={s.header}><View><Text style={s.wordmark}>EPISODIA<Text style={{color:C.gold}}>.</Text></Text><Text style={s.tagline}>A LITTLE WORLD OF WHAT YOU WATCH</Text></View><View style={s.avatar}><Text style={s.avatarText}>{profile?.username?.[0]?.toUpperCase()||'E'}</Text></View></View>;
  const Auth = () => <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={s.auth}><Text style={s.eyebrow}>WELCOME TO YOUR TV DIARY</Text><Text style={s.hero}>Stories worth remembering.</Text><Text style={s.muted}>Create an account to save shows, track episodes and share your reviews.</Text>
    <TextInput style={s.field} placeholder="Email address" placeholderTextColor={C.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
    <TextInput style={s.field} placeholder="Password (8+ characters)" placeholderTextColor={C.muted} secureTextEntry value={password} onChangeText={setPassword}/>
    <Button title={authMode==='signup'?'Create account':'Sign in'} onPress={authenticate} disabled={busy}/>
    <Pressable onPress={()=>setAuthMode(authMode==='signup'?'signin':'signup')}><Text style={s.switch}>{authMode==='signup'?'Already have an account? Sign in':'New here? Create an account'}</Text></Pressable>
    <Text style={s.small}>By continuing, you agree to use Episodia respectfully. Account deletion and privacy controls will be available in settings.</Text>
  </KeyboardAvoidingView>;
  return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content"/><Header/>
    {!session ? <Auth/> : <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {selected ? <>
        <Pressable onPress={()=>setSelected(null)}><Text style={s.back}>‹  BACK</Text></Pressable>
        <View style={s.detailHero}>{poster(selected.poster_path)&&<Image source={{uri:poster(selected.poster_path)}} style={s.detailBackdrop}/>}<View style={s.detailShade}/><Text style={s.hero}>{selected.name||selected.title}</Text><Text style={s.muted}>{(selected.first_air_date||'').slice(0,4)} · {selected.number_of_seasons||'?'} seasons · ★ {(selected.vote_average||0).toFixed(1)}</Text></View>
        <Text style={s.section}>OVERVIEW</Text><Text style={s.body}>{selected.overview||'No description available.'}</Text>
        <Text style={s.section}>ADD TO YOUR LIBRARY</Text>
        <View style={s.statuses}>{STATUSES.map(x=><Pressable key={x.id} onPress={()=>setStatus(x.id)} style={[s.pill,status===x.id&&s.pillOn]}><Text style={[s.pillText,status===x.id&&s.pillTextOn]}>{x.label}</Text></Pressable>)}</View>
        <Button title="Save series" onPress={()=>saveShow(selected,status)}/>
        <Text style={s.section}>TRACK YOUR EPISODES</Text><View style={s.row}><TextInput style={[s.field,s.number]} keyboardType="number-pad" value={season} onChangeText={setSeason} placeholder="Season"/><TextInput style={[s.field,s.number]} keyboardType="number-pad" value={episode} onChangeText={setEpisode} placeholder="Episode"/></View>
        {library.filter(x=>x.tmdb_id===selected.id).map(x=><Button key={x.id} title="Update my progress" onPress={()=>updateProgress(x)}/>)}
        <Text style={s.section}>WRITE A REVIEW</Text><TextInput multiline style={[s.field,s.review]} placeholder="What did you think?" placeholderTextColor={C.muted} value={review} onChangeText={setReview}/><TextInput style={s.field} keyboardType="decimal-pad" value={rating} onChangeText={setRating} placeholder="Your rating out of 10"/><Button title="Publish review" onPress={publishReview}/>
      </> : <>
        <Text style={s.eyebrow}>{tab.toUpperCase()} / YOUR TV DIARY</Text><Text style={s.hero}>{heading}</Text><Text style={s.body}>Keep track of the stories that stay with you.</Text>
        {(tab==='Discover'||tab==='Home')&&<View style={s.search}><TextInput style={s.searchInput} placeholder="Search series..." placeholderTextColor={C.muted} value={query} onChangeText={setQuery} onSubmitEditing={runSearch}/><Pressable onPress={runSearch}><Text style={s.searchGo}>SEARCH</Text></Pressable></View>}
        {tab==='Activity' ? <>{activity.map(r=><View key={r.id} style={s.reviewCard}><Text style={s.cardTitle}>{r.profiles?.display_name||r.profiles?.username||'A viewer'} · {r.show_title}</Text><Text style={s.gold}>★ {r.rating ?? '—'}/10</Text><Text style={s.body}>{r.body}</Text></View>)}</> :
        <><Text style={s.section}>{tab==='Watchlist'?'YOUR WATCHLIST':tab==='Profile'?'YOUR LIBRARY':tab==='Home'?'CURRENTLY WATCHING':'EXPLORE SERIES'}</Text>
          {tab==='Profile'&&<View style={s.stats}><View><Text style={s.statNum}>{library.length}</Text><Text style={s.muted}>IN LIBRARY</Text></View><View><Text style={s.statNum}>{library.filter(x=>x.status==='completed').length}</Text><Text style={s.muted}>COMPLETED</Text></View><View><Text style={s.statNum}>{library.filter(x=>x.status==='watching').length}</Text><Text style={s.muted}>WATCHING</Text></View></View>}
          <View style={s.grid}>{(tab==='Watchlist'||tab==='Profile'||tab==='Home'&&library.length ? shownLibrary : items).map(item=><Card key={item.id||item.tmdb_id} item={item} owned={Boolean(item.tmdb_id)}/>)}</View>
          {busy&&<ActivityIndicator color={C.gold}/>}
          {tab==='Profile'&&<><Text style={s.section}>ACCOUNT</Text><Text style={s.body}>@{profile?.username||session.user.email}</Text><Button title="Sign out" onPress={()=>supabase.auth.signOut()} secondary/></>}
        </>}
      </>}
    </ScrollView>}
    {session&&<View style={s.nav}>{TABS.map(t=><Pressable key={t} onPress={()=>{setTab(t);setSelected(null);}} style={s.navItem}><Text style={[s.navLabel,tab===t&&s.navOn]}>{t==='Watchlist'?'♡':t==='Activity'?'◎':t==='Profile'?'◉':t==='Discover'?'⌕':'⌂'}</Text><Text style={[s.navCaption,tab===t&&s.navOn]}>{t}</Text></Pressable>)}</View>}
  </SafeAreaView>;
}
function Button({title,onPress,secondary=false,disabled=false}) { return <Pressable disabled={disabled} onPress={onPress} style={[s.button,secondary&&s.buttonSecondary,disabled&&{opacity:.5}]}><Text style={[s.buttonText,secondary&&{color:C.text}]}>{title}</Text></Pressable>; }
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},header:{paddingHorizontal:22,paddingTop:12,paddingBottom:15,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:'#252630'},wordmark:{color:C.text,fontSize:22,fontWeight:'900',letterSpacing:3},tagline:{color:C.muted,fontSize:8,letterSpacing:2,marginTop:4},avatar:{width:35,height:35,borderRadius:18,backgroundColor:C.gold,alignItems:'center',justifyContent:'center'},avatarText:{color:C.bg,fontWeight:'900'},
 content:{padding:21,paddingBottom:34},eyebrow:{color:C.gold,fontSize:9,letterSpacing:2,fontWeight:'800'},hero:{color:C.text,fontSize:31,fontWeight:'800',letterSpacing:-1,marginTop:12},body:{color:'#b0b0b8',fontSize:13,marginTop:8,lineHeight:21},muted:{color:C.muted,fontSize:10,marginTop:5},section:{color:'#e7e2d8',fontSize:11,fontWeight:'800',letterSpacing:2,marginTop:26,marginBottom:13},
 search:{height:48,backgroundColor:C.panel,borderRadius:12,marginTop:22,flexDirection:'row',alignItems:'center',paddingHorizontal:14,borderWidth:1,borderColor:C.line},searchInput:{flex:1,color:C.text},searchGo:{color:C.gold,fontSize:10,fontWeight:'900',letterSpacing:1},
 grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},card:{width:'48%',marginBottom:21},poster:{height:220,borderRadius:10,overflow:'hidden',backgroundColor:C.panel},posterImg:{width:'100%',height:'100%'},posterFallback:{flex:1,alignItems:'center',justifyContent:'center'},posterLetter:{fontSize:60,color:C.gold,fontWeight:'900'},add:{position:'absolute',right:8,top:8,width:30,height:30,borderRadius:15,backgroundColor:'rgba(16,17,22,.9)',alignItems:'center',justifyContent:'center'},addText:{color:C.text,fontSize:18},cardTitle:{color:C.text,fontSize:14,fontWeight:'800',marginTop:8},gold:{color:C.gold,fontSize:11,marginTop:6},
 nav:{height:67,borderTopWidth:1,borderColor:'#252630',backgroundColor:'#14151b',flexDirection:'row',justifyContent:'space-around',alignItems:'center'},navItem:{alignItems:'center',gap:3,minWidth:52},navLabel:{fontSize:20,color:C.muted},navCaption:{fontSize:9,color:C.muted},navOn:{color:C.gold},
 auth:{flex:1,padding:24,justifyContent:'center'},field:{backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:11,padding:14,color:C.text,marginTop:12,fontSize:14},switch:{color:C.gold,textAlign:'center',marginTop:20,fontSize:12},small:{color:C.muted,fontSize:10,lineHeight:16,marginTop:26},button:{backgroundColor:C.gold,padding:15,borderRadius:11,alignItems:'center',marginTop:14},buttonSecondary:{backgroundColor:'transparent',borderWidth:1,borderColor:C.line},buttonText:{color:C.bg,fontWeight:'900',fontSize:12},
 detailHero:{minHeight:220,justifyContent:'flex-end',padding:17,backgroundColor:C.panel,borderRadius:14,overflow:'hidden',marginTop:14},detailBackdrop:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%',opacity:.32},detailShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(16,17,22,.35)'},back:{color:C.gold,fontSize:12,letterSpacing:1,marginBottom:12},statuses:{flexDirection:'row',flexWrap:'wrap',gap:7},pill:{borderWidth:1,borderColor:C.line,paddingVertical:9,paddingHorizontal:11,borderRadius:20},pillOn:{backgroundColor:C.gold,borderColor:C.gold},pillText:{color:C.muted,fontSize:10},pillTextOn:{color:C.bg,fontWeight:'800'},row:{flexDirection:'row',gap:10},number:{flex:1},review:{minHeight:100,textAlignVertical:'top'},stats:{flexDirection:'row',justifyContent:'space-between',padding:17,backgroundColor:C.panel,borderRadius:12,marginTop:18},statNum:{fontSize:25,color:C.text,fontWeight:'800'},reviewCard:{padding:15,backgroundColor:C.panel,borderRadius:12,marginBottom:12}
});
