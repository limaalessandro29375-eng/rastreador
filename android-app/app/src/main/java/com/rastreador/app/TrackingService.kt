package com.rastreador.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.rastreador.app.api.ApiClient
import com.rastreador.app.api.LocationRequest
import com.rastreador.app.data.AppDatabase
import com.rastreador.app.data.LocationEntity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import java.text.SimpleDateFormat
import java.util.*

class TrackingService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var isTracking = false
    private var lastLocation: Location? = null

    companion object {
        const val CHANNEL_ID = "tracking_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "START_TRACKING"
        const val ACTION_STOP = "STOP_TRACKING"

        fun start(context: Context) {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, TrackingService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                startForeground(NOTIFICATION_ID, createNotification(false, 0f))
                startTracking()
            }
            ACTION_STOP -> {
                stopTracking()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun startTracking() {
        if (isTracking) return
        isTracking = true

        val request = com.google.android.gms.location.LocationRequest.create().apply {
            interval = 5000
            fastestInterval = 3000
            maxWaitTime = 10000
            priority = com.google.android.gms.location.LocationRequest.PRIORITY_HIGH_ACCURACY
        }

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.locations.forEach { location ->
                    lastLocation = location
                    scope.launch {
                        saveLocation(location)
                        updateNotification(location)
                    }
                }
            }
        }

        fusedLocationClient.requestLocationUpdates(
            request,
            locationCallback,
            Looper.getMainLooper()
        )
    }

    private fun stopTracking() {
        isTracking = false
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        } catch (_: Exception) {}
    }

    private suspend fun saveLocation(location: Location) {
        val db = AppDatabase.getInstance(this)
        val dao = db.locationDao()

        val entity = LocationEntity(
            lat = location.latitude,
            lng = location.longitude,
            accuracy = location.accuracy,
            speed = if (location.hasSpeed()) location.speed else null,
            altitude = if (location.hasAltitude()) location.altitude else null,
            timestamp = System.currentTimeMillis()
        )
        dao.insert(entity)

        syncPending()
    }

    private suspend fun syncPending() {
        try {
            val prefs = com.rastreador.app.data.PreferencesManager(this)
            val token = prefs.token.first() ?: return
            val deviceId = prefs.deviceId.first() ?: return

            val dao = AppDatabase.getInstance(this).locationDao()
            val unsynced = dao.getUnsynced()
            if (unsynced.isEmpty()) return

            val requests = unsynced.map { entity ->
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                sdf.timeZone = TimeZone.getTimeZone("UTC")
                LocationRequest(
                    deviceId = deviceId,
                    lat = entity.lat,
                    lng = entity.lng,
                    accuracy = entity.accuracy,
                    speed = entity.speed,
                    altitude = entity.altitude,
                    timestamp = sdf.format(Date(entity.timestamp))
                )
            }

            val response = ApiClient.service.sendBatch("Bearer $token", com.rastreador.app.api.BatchLocationRequest(requests))
            if (response.inserted > 0) {
                dao.markBatchSynced(unsynced.map { it.id })
                dao.deleteSynced()
            }
        } catch (_: Exception) {
            // Sem internet - tenta depois
        }
    }

    private fun updateNotification(location: Location) {
        val notification = createNotification(true, location.accuracy ?: 0f)
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun createNotification(hasLocation: Boolean, accuracy: Float): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = PendingIntent.getService(
            this, 1,
            Intent(this, TrackingService::class.java).apply { action = ACTION_STOP },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val info = if (hasLocation) "Precisão: ${accuracy.toInt()}m | GPS ativo"
        else "Aguardando localização..."

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Rastreamento Ativo")
            .setContentText(info)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Parar", stopIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Rastreamento",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Notificação do serviço de rastreamento"
            }
            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopTracking()
        scope.cancel()
        super.onDestroy()
    }
}
