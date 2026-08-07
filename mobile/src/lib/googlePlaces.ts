const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export const googlePlacesConfigured = !!API_KEY;

export interface PlaceSuggestion {
  placeId: string;
  description: string;
}

/** Google's legacy Place Autocomplete API — a plain GET+JSON fetch, no native module needed. */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!API_KEY || !query.trim()) return [];
  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.predictions)) return [];
    return data.predictions.map((p: { place_id: string; description: string }) => ({
      placeId: p.place_id,
      description: p.description,
    }));
  } catch {
    return [];
  }
}
