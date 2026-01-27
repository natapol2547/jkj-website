import { Client, Language } from '@googlemaps/google-maps-services-js';
import { GOOGLE_MAPS_API_KEY } from '$env/static/private';

// Initialize Google Maps client
const mapsClient = new Client({});

// Get API key from environment
const getApiKey = () => GOOGLE_MAPS_API_KEY;

// In-memory cache for geocoded locations (to reduce API calls)
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

// Default location: Bangkok coordinates (fallback)
export const DEFAULT_LOCATION = {
	lat: 13.7563,
	lng: 100.5018
};

export interface GeocodingResult {
	lat: number;
	lng: number;
	formattedAddress?: string;
}

/**
 * Geocode a location string to coordinates using Google Maps Geocoding API
 * @param location - The location string to geocode (e.g., "กรุงเทพมหานคร", "Bangkok, Thailand")
 * @returns Coordinates object with lat/lng, or null if geocoding fails
 */
export async function geocodeLocation(location: string): Promise<GeocodingResult | null> {
	// Check cache first
	const cacheKey = location.toLowerCase().trim();
	if (geocodeCache.has(cacheKey)) {
		const cached = geocodeCache.get(cacheKey);
		return cached ? { lat: cached.lat, lng: cached.lng } : null;
	}

	// Validate API key
	const apiKey = getApiKey();
	if (!apiKey) {
		console.warn('Google Maps API key is not configured (GOOGLE_MAPS_API_KEY). Using default location.');
		return null;
	}

	try {
		// Append ", Thailand" to improve geocoding accuracy for Thai locations
		const searchQuery = location.includes('Thailand') || location.includes('ประเทศไทย')
			? location
			: `${location}, Thailand`;

		const response = await mapsClient.geocode({
			params: {
				address: searchQuery,
				key: apiKey,
				language: Language.th, // Prefer Thai language results
				region: 'th' // Bias results to Thailand
			}
		});

		if (response.data.status === 'OK' && response.data.results.length > 0) {
			const result = response.data.results[0];
			const coords = {
				lat: result.geometry.location.lat,
				lng: result.geometry.location.lng
			};

			// Cache the result
			geocodeCache.set(cacheKey, coords);

			return {
				...coords,
				formattedAddress: result.formatted_address
			};
		}

		if (response.data.status === 'ZERO_RESULTS') {
			console.log(`No geocoding results for: ${location}`);
		} else if (response.data.status !== 'OK') {
			console.error(`Geocoding API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
		}

		// Cache null result to avoid repeated API calls for invalid locations
		geocodeCache.set(cacheKey, null);
		return null;
	} catch (error) {
		console.error('Geocoding request failed:', error);
		geocodeCache.set(cacheKey, null);
		return null;
	}
}

/**
 * Get coordinates for a location, falling back to default if geocoding fails
 * @param location - The location string to geocode
 * @returns Coordinates object with lat/lng (never null)
 */
export async function getLocationCoordinates(location: string): Promise<{ lat: number; lng: number }> {
	const result = await geocodeLocation(location);
	return result || DEFAULT_LOCATION;
}

/**
 * Clear the geocoding cache (useful for testing or memory management)
 */
export function clearGeocodeCache(): void {
	geocodeCache.clear();
}

/**
 * Get the current cache size (for monitoring)
 */
export function getGeocacheCacheSize(): number {
	return geocodeCache.size;
}
