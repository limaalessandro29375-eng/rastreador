package com.rastreador.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.rastreador.app.data.PreferencesManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            CoroutineScope(Dispatchers.IO).launch {
                val prefs = PreferencesManager(context)
                val wasTracking = prefs.isTracking.first()
                if (wasTracking) {
                    TrackingService.start(context)
                }
            }
        }
    }
}
