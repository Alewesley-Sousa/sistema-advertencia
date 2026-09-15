export async function obterEnderecoPorCoordenadas(latitude?: number, longitude?: number): Promise<string> {
  if (!latitude || !longitude) return 'Localização não informada'

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    
    // O Nominatim exige um User-Agent válido nas requisições HTTP
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GeradorOficiosWialon/1.0'
      }
    })

    if (!response.ok) {
      return `Lat: ${latitude}, Lon: ${longitude}`
    }

    const data = (await response.json()) as any
    
    if (data && data.display_name) {
      // Retorna o endereço legível retornado pela API
      return data.display_name
    }

    return `Lat: ${latitude}, Lon: ${longitude}`
  } catch (error) {
    console.error('[Geocoding Error] Falha ao buscar endereço:', error)
    return `Lat: ${latitude}, Lon: ${longitude}`
  }
}