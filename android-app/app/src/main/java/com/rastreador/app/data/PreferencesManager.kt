package com.rastreador.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "rastreador_prefs")

class PreferencesManager(private val context: Context) {
    companion object {
        private val TOKEN_KEY = stringPreferencesKey("token")
        private val DEVICE_ID_KEY = stringPreferencesKey("device_id")
        private val TRACKING_KEY = stringPreferencesKey("tracking")
    }

    val token: Flow<String?> = context.dataStore.data.map { it[TOKEN_KEY] }
    val deviceId: Flow<String?> = context.dataStore.data.map { it[DEVICE_ID_KEY] }
    val isTracking: Flow<Boolean> = context.dataStore.data.map { it[TRACKING_KEY] == "true" }

    suspend fun saveToken(token: String) {
        context.dataStore.edit { it[TOKEN_KEY] = token }
    }

    suspend fun saveDeviceId(deviceId: String) {
        context.dataStore.edit { it[DEVICE_ID_KEY] = deviceId }
    }

    suspend fun setTracking(active: Boolean) {
        context.dataStore.edit { it[TRACKING_KEY] = if (active) "true" else "false" }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
