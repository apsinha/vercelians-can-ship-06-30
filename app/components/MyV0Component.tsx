"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Cloud, Sun, CloudRain, Wind, Eye, RefreshCw, MapPin, Thermometer, Droplets, Camera } from "lucide-react"
import { getUnsplashImage } from "@/lib/unsplash-api"

interface WeatherData {
  condition: string
  temperature: number
  description: string
  icon: any
  color: string
  humidity: number
  windSpeed: number
  feelsLike: number
  uvIndex: number
  visibility: number
}

interface UnsplashImage {
  url: string
  photographer: string
  photographerUrl: string
  description: string | null
}

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case "sunny":
    case "clear":
      return Sun
    case "foggy":
    case "mist":
    case "fog":
      return Eye
    case "cloudy":
    case "overcast":
    case "partly cloudy":
      return Cloud
    case "rainy":
    case "rain":
    case "drizzle":
      return CloudRain
    case "windy":
      return Wind
    default:
      return Sun
  }
}

// Real WeatherAPI.com integration
const fetchSFWeather = async (): Promise<WeatherData> => {
  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY

  if (!API_KEY) {
    throw new Error("Weather API key not found")
  }

  try {
    const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=San Francisco,CA&aqi=yes`)

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`)
    }

    const data = await response.json()

    // Map WeatherAPI conditions to our app conditions
    const weatherCondition = data.current.condition.text.toLowerCase()
    let appCondition = "sunny"

    if (weatherCondition.includes("fog") || weatherCondition.includes("mist")) {
      appCondition = "foggy"
    } else if (weatherCondition.includes("rain") || weatherCondition.includes("drizzle")) {
      appCondition = "rainy"
    } else if (weatherCondition.includes("cloud") || weatherCondition.includes("overcast")) {
      appCondition = "cloudy"
    } else if (weatherCondition.includes("clear") || weatherCondition.includes("sunny")) {
      appCondition = "sunny"
    } else if (data.current.wind_mph > 15) {
      appCondition = "windy"
    }

    const colorMap: Record<string, string> = {
      sunny: "bg-yellow-100 text-yellow-800",
      foggy: "bg-gray-100 text-gray-800",
      cloudy: "bg-blue-100 text-blue-800",
      rainy: "bg-indigo-100 text-indigo-800",
      windy: "bg-green-100 text-green-800",
    }

    return {
      condition: appCondition,
      temperature: Math.round(data.current.temp_f),
      description: data.current.condition.text,
      icon: getWeatherIcon(appCondition),
      color: colorMap[appCondition] || colorMap.sunny,
      humidity: data.current.humidity,
      windSpeed: Math.round(data.current.wind_mph),
      feelsLike: Math.round(data.current.feelslike_f),
      uvIndex: data.current.uv,
      visibility: Math.round(data.current.vis_miles),
    }
  } catch (error) {
    console.error("Weather API error:", error)
    throw error
  }
}

export default function SFWeatherImageApp() {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null)
  const [currentImage, setCurrentImage] = useState<UnsplashImage | null>(null)
  const [isLoadingWeather, setIsLoadingWeather] = useState(true)
  const [isLoadingImage, setIsLoadingImage] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  const loadWeatherAndImage = async () => {
    setIsLoadingWeather(true)
    setIsLoadingImage(true)
    setError(null)

    try {
      // Load weather data
      const weatherData = await fetchSFWeather()
      setCurrentWeather(weatherData)

      // Load matching image
      try {
        const imageData = await getUnsplashImage(weatherData.condition)
        setCurrentImage(imageData)
      } catch (imageError) {
        console.error("Image loading error:", imageError)
        // Continue with weather data even if image fails
        setCurrentImage(null)
      }

      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather data")
      console.error("Weather fetch error:", err)
    } finally {
      setIsLoadingWeather(false)
      setIsLoadingImage(false)
    }
  }

  const refreshImage = async () => {
    if (!currentWeather) return

    setIsLoadingImage(true)
    try {
      const imageData = await getUnsplashImage(currentWeather.condition)
      setCurrentImage(imageData)
    } catch (error) {
      console.error("Image refresh error:", error)
    } finally {
      setIsLoadingImage(false)
    }
  }

  useEffect(() => {
    loadWeatherAndImage()

    // Update weather and image every 30 minutes
    const interval = setInterval(loadWeatherAndImage, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoadingWeather && !currentWeather) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading live San Francisco weather...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching real photos from Unsplash...</p>
        </div>
      </div>
    )
  }

  if (error || !currentWeather) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || "Failed to load weather"}</p>
          <p className="text-sm text-gray-600 mb-4">Make sure your WeatherAPI.com key is configured correctly.</p>
          <Button onClick={loadWeatherAndImage}>Try Again</Button>
        </div>
      </div>
    )
  }

  const WeatherIcon = currentWeather.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="h-8 w-8 text-blue-600" />
                  San Francisco Live
                </h1>
                <p className="mt-2 text-gray-600">Real-time weather with authentic SF photography</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={refreshImage}
                  disabled={isLoadingImage}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Camera className={`h-4 w-4 ${isLoadingImage ? "animate-pulse" : ""}`} />
                  New Photo
                </Button>
                <Button
                  onClick={loadWeatherAndImage}
                  disabled={isLoadingWeather}
                  variant="outline"
                  className="flex items-center gap-2 bg-transparent"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingWeather ? "animate-spin" : ""}`} />
                  {isLoadingWeather ? "Updating..." : "Refresh"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Weather Info Card */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-50 rounded-full">
                  <WeatherIcon className="h-10 w-10 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-gray-900">{currentWeather.temperature}°F</h2>
                  <p className="text-gray-600 text-lg">{currentWeather.description}</p>
                  <Badge className={`${currentWeather.color} mt-2`}>
                    {currentWeather.condition.charAt(0).toUpperCase() + currentWeather.condition.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-gray-500" />
                  <span>Feels like {currentWeather.feelsLike}°F</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-gray-500" />
                  <span>Humidity {currentWeather.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-gray-500" />
                  <span>Wind {currentWeather.windSpeed} mph</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-gray-500" />
                  <span>Visibility {currentWeather.visibility} mi</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-right">
              <p className="text-sm text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Main Image Display */}
        <Card className="overflow-hidden bg-white/90 backdrop-blur-sm mb-8">
          <CardContent className="p-0">
            <div className="relative">
              {isLoadingImage && !currentImage ? (
                <div className="w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-8 w-8 animate-pulse text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Loading San Francisco photo...</p>
                  </div>
                </div>
              ) : currentImage ? (
                <>
                  <img
                    src={currentImage.url || "/placeholder.svg"}
                    alt={currentImage.description || `San Francisco on a ${currentWeather.condition} day`}
                    className="w-full aspect-[16/9] object-cover"
                    onError={(e) => {
                      console.log("Unsplash image failed to load")
                      const target = e.target as HTMLImageElement
                      target.src = `/placeholder.svg?height=720&width=1280&text=San Francisco ${currentWeather.condition} ${currentWeather.temperature}°F`
                    }}
                  />
                  {/* Photo Credit Overlay */}
                  <div className="absolute top-4 right-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                      <a
                        href={currentImage.photographerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white text-xs hover:underline flex items-center gap-1"
                      >
                        <Camera className="h-3 w-3" />
                        Photo by {currentImage.photographer}
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-gray-500">Unable to load image</p>
                    <Button onClick={refreshImage} size="sm" className="mt-2">
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Weather Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8">
                <div className="max-w-2xl">
                  <h3 className="text-white text-3xl font-bold mb-3">
                    San Francisco -{" "}
                    {currentWeather.condition.charAt(0).toUpperCase() + currentWeather.condition.slice(1)}{" "}
                    {currentWeather.temperature}°F
                  </h3>
                  <p className="text-white/90 text-lg leading-relaxed">
                    {currentWeather.condition === "foggy" &&
                      "The iconic Golden Gate Bridge emerges through San Francisco's famous marine layer fog, creating an ethereal and mystical atmosphere over the bay."}
                    {currentWeather.condition === "sunny" &&
                      "Crystal clear views of the Golden Gate Bridge and San Francisco skyline on a beautiful sunny California day with perfect visibility."}
                    {currentWeather.condition === "cloudy" &&
                      "The San Francisco skyline sits under a dramatic blanket of Pacific clouds, creating moody lighting across the urban landscape."}
                    {currentWeather.condition === "rainy" &&
                      "Rain-soaked streets reflect the city lights while storm clouds gather over the Golden Gate Bridge in this atmospheric SF scene."}
                    {currentWeather.condition === "windy" &&
                      "Strong Pacific winds create dramatic waves in San Francisco Bay while the Golden Gate Bridge stands resilient against the elements."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">Perfect For Today</h4>
              <p className="text-gray-600 leading-relaxed">
                {currentWeather.condition === "foggy" &&
                  "Cozy up with coffee in North Beach, explore the atmospheric streets of Chinatown, or visit the de Young Museum in Golden Gate Park."}
                {currentWeather.condition === "sunny" &&
                  "Perfect day for an Alcatraz tour, Golden Gate Park picnic, Lombard Street photos, or a bike ride across the Golden Gate Bridge."}
                {currentWeather.condition === "cloudy" &&
                  "Great weather for SFMOMA, the Exploratorium, shopping in Union Square, or exploring the Ferry Building Marketplace."}
                {currentWeather.condition === "rainy" &&
                  "Indoor day at California Academy of Sciences, browsing City Lights Bookstore, or visiting the Asian Art Museum."}
                {currentWeather.condition === "windy" &&
                  "Ideal for kitesurfing at Crissy Field, dramatic photos at Lands End, or watching surfers at Ocean Beach."}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">SF Weather Insight</h4>
              <p className="text-gray-600 leading-relaxed">
                {currentWeather.condition === "foggy" &&
                  "SF's famous fog forms when cold Pacific water meets warm Central Valley air. The marine layer acts as natural air conditioning for the city."}
                {currentWeather.condition === "sunny" &&
                  "September and October are SF's sunniest months. Locals call this period 'Indian Summer' when the fog clears and temperatures rise."}
                {currentWeather.condition === "cloudy" &&
                  "SF's unique microclimates mean it can be 20°F warmer just 10 miles inland. The city has dozens of distinct weather zones."}
                {currentWeather.condition === "rainy" &&
                  "Most rain falls November through March. SF gets only 20 inches annually compared to 40+ inches in the nearby hills."}
                {currentWeather.condition === "windy" &&
                  "The Golden Gate acts as a natural wind tunnel. The gap funnels Pacific winds, with gusts often reaching 35+ mph."}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">Best Photo Spots</h4>
              <p className="text-gray-600 leading-relaxed">
                {currentWeather.condition === "foggy" &&
                  "Hawk Hill or Crissy Field for classic fog-shrouded Golden Gate shots. The fog creates dramatic, ever-changing compositions."}
                {currentWeather.condition === "sunny" &&
                  "Battery Spencer or Baker Beach for crystal-clear bridge views. Twin Peaks offers panoramic city shots with perfect clarity."}
                {currentWeather.condition === "cloudy" &&
                  "Twin Peaks or Tank Hill for dramatic skyline shots under moody skies. The clouds add depth and character to photos."}
                {currentWeather.condition === "rainy" &&
                  "Nob Hill or Russian Hill for atmospheric urban reflections. Rain creates beautiful light patterns on the steep streets."}
                {currentWeather.condition === "windy" &&
                  "Lands End or Ocean Beach for dynamic wave shots. The Marin Headlands offer dramatic coastal and bridge views."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Data Status */}
        <Card className="mt-8 bg-green-50/50 backdrop-blur-sm border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-green-900">Live Data & Real Photography</h4>
            </div>
            <p className="text-sm text-green-800 mt-2">
              Weather from WeatherAPI.com • Photos from Unsplash.com • Updates every 30 minutes • Click "New Photo" for
              different images
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Live weather data with curated San Francisco photography from talented photographers</p>
          <p className="mt-1">Last updated: {lastUpdated.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

