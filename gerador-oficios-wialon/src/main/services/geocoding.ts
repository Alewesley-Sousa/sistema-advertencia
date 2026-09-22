export async function obterEnderecoPorCoordenadas(latitude?: number, longitude?: number): Promise<string> {
  if (!latitude || !longitude) return 'Localização não informada'

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GeradorOficiosWialon/1.0 (seu_email@dominio.com)' // É recomendável incluir um e-mail no User-Agent para seguir a política do OSM
      }
    })

    if (!response.ok) {
      console.warn(`[Geocoding Warning] HTTP Status: ${response.status} ${response.statusText}`)
      return `Lat: ${latitude}, Lon: ${longitude}`
    }

    const data = (await response.json()) as any
    
    if (data && data.display_name) {
      return data.display_name
    }

    return `Lat: ${latitude}, Lon: ${longitude}`
  } catch (error) {
    console.error('[Geocoding Error] Falha de rede/desconhecida ao buscar endereço:', error)
    return `Lat: ${latitude}, Lon: ${longitude}`
  }
}