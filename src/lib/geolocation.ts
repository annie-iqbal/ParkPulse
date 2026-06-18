export interface GeoPosition {
  lat: number;
  lng: number;
  address: string;
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const address = await reverseGeocode(lat, lng);
        resolve({ lat, lng, address });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'ParkWiseAI/1.0' } }
    );
    const data = await res.json();
    const road = data.address?.road ?? data.address?.pedestrian ?? '';
    const suburb = data.address?.suburb ?? data.address?.city_district ?? data.address?.city ?? '';
    return [road, suburb].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Unknown location';
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export async function checkPublicHoliday(countryCode = 'AU'): Promise<boolean> {
  try {
    const year = new Date().getFullYear();
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    if (!res.ok) return false;
    const holidays: Array<{ date: string }> = await res.json();
    const today = new Date().toISOString().split('T')[0];
    return holidays.some((h) => h.date === today);
  } catch {
    return false;
  }
}
