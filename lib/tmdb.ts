const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE = 'https://api.themoviedb.org/3';
export const IMAGE = 'https://image.tmdb.org/t/p/w500';
async function request(path: string) {
  if (!API_KEY) throw new Error('Add EXPO_PUBLIC_TMDB_API_KEY to your environment to enable series search.');
  const response = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}api_key=${API_KEY}`);
  if (!response.ok) throw new Error('The TV catalogue is temporarily unavailable.');
  return response.json();
}
export const searchShows = (query: string) => request(`/search/tv?query=${encodeURIComponent(query)}&include_adult=false`);
export const trendingShows = () => request('/trending/tv/week');
export const showDetails = (id: number) => request(`/tv/${id}?append_to_response=aggregate_credits,content_ratings`);
export const seasonDetails = (id: number, season: number) => request(`/tv/${id}/season/${season}`);
