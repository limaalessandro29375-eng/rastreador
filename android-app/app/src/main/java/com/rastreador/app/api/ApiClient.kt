package com.rastreador.app.api

import com.google.gson.annotations.SerializedName
import com.rastreador.app.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

data class AuthRequest(val email: String, val password: String)
data class AuthResponse(val token: String, val user: UserInfo)
data class UserInfo(val id: String, val email: String, val name: String)

data class LocationRequest(
    val deviceId: String,
    val lat: Double,
    val lng: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val altitude: Double? = null,
    val timestamp: String? = null
)

data class BatchLocationRequest(
    val locations: List<LocationRequest>
)

data class BatchResponse(val inserted: Int)

data class DeviceRequest(val name: String)

data class Device(
    val id: String,
    val name: String,
    @SerializedName("_count") val count: LocationCount? = null
)

data class LocationResponse(
    val id: String,
    val deviceId: String,
    val lat: Double,
    val lng: Double,
    val accuracy: Double?,
    val speed: Double?,
    val altitude: Double?,
    val timestamp: String
)

data class LocationCount(val locations: Int)

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: AuthRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body request: AuthRequest): AuthResponse

    @GET("devices")
    suspend fun getDevices(@Header("Authorization") token: String): List<Device>

    @POST("devices")
    suspend fun createDevice(@Header("Authorization") token: String, @Body request: DeviceRequest): Device

    @POST("locations")
    suspend fun sendLocation(@Header("Authorization") token: String, @Body location: LocationRequest): LocationResponse

    @POST("locations/batch")
    suspend fun sendBatch(@Header("Authorization") token: String, @Body batch: BatchLocationRequest): BatchResponse

    @GET("locations/latest/{deviceId}")
    suspend fun getLatestLocation(
        @Header("Authorization") token: String,
        @Path("deviceId") deviceId: String
    ): LocationResponse?
}

object ApiClient {
    private val baseUrl: String by lazy {
        if (BuildConfig.API_URL.isNotEmpty()) BuildConfig.API_URL else "http://10.0.2.2:3001/"
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val service: ApiService = retrofit.create(ApiService::class.java)
}
