package com.rastreador.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "locations")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val lat: Double,
    val lng: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val altitude: Double? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val synced: Boolean = false,
    val serverId: String? = null
)
