const BASE = 'https://api.tvmaze.com';
export const IMAGE = '';
function cleanSummary(value) { return (value || '').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim(); }
function normalize(show) {
  const episodes = show._embedded?.episodes || [];
  const seasons = episodes.reduce((m,e)=>Math.max(m,e.season||0),0);
  return {
    id: show.id,
    name: show.name,
    title: show.name,
    poster_path: show.image?.original || show.image?.medium || null,
    first_air_date: show.premiered || null,
    vote_average: show.rating?.average || 0,
    overview: cleanSummary(show.summary),
    genres: show.genres || [],
    number_of_seasons: seasons,
    tvmaze_url: show.url,
    _embedded: show._embedded
  };
}
async function request(path) {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) throw new Error(response.status === 429 ? 'Catalogue is busy. Please try again shortly.' : 'The TV catalogue is temporarily unavailable.');
  return response.json();
}
export async function searchShows(query) {
  const rows = await request(`/search/shows?q=${encodeURIComponent(query)}`);
  return { results: rows.map(row=>normalize(row.show)) };
}
export async function trendingShows() {
  const rows = await request('/shows?page=0');
  return { results: rows.slice(0,60).map(normalize) };
}
export async function showDetails(id) {
  return normalize(await request(`/shows/${id}?embed=episodes`));
}
export async function seasonDetails(id, season) {
  const rows = await request(`/shows/${id}/episodes?specials=0`);
  return rows.filter(row=>row.season===season);
}

