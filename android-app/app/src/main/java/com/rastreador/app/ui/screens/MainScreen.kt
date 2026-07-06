package com.rastreador.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.rastreador.app.*
import com.rastreador.app.api.ApiClient
import com.rastreador.app.api.Device
import com.rastreador.app.api.LocationResponse
import com.rastreador.app.data.AppDatabase
import com.rastreador.app.data.PreferencesManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    preferencesManager: PreferencesManager,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = remember { AppDatabase.getInstance(context) }
    val dao = remember { db.locationDao() }

    var devices by remember { mutableStateOf<List<Device>>(emptyList()) }
    var latestLocation by remember { mutableStateOf<LocationResponse?>(null) }
    var isTracking by remember { mutableStateOf(false) }
    var unsyncedCount by remember { mutableIntStateOf(0) }
    var newDeviceName by remember { mutableStateOf("") }

    val latestLocFlow = dao.getLatestFlow().collectAsState(initial = null)

    val locationPermissionGranted = remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        locationPermissionGranted.value = permissions.values.all { it }
    }

    fun requestPermissions() {
        val perms = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            perms.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(perms.toTypedArray())
    }

    fun loadDevices() {
        scope.launch {
            try {
                val token = preferencesManager.token.first() ?: return@launch
                devices = ApiClient.service.getDevices("Bearer $token")
            } catch (_: Exception) {}
        }
    }

    fun loadLatestLocation() {
        scope.launch {
            try {
                val token = preferencesManager.token.first() ?: return@launch
                val deviceId = preferencesManager.deviceId.first()
                if (deviceId != null) {
                    latestLocation = ApiClient.service.getLatestLocation("Bearer $token", deviceId)
                }
            } catch (_: Exception) {}
        }
    }

    fun toggleTracking() {
        if (isTracking) {
            TrackingService.stop(context)
            scope.launch { preferencesManager.setTracking(false) }
            isTracking = false
        } else {
            if (!locationPermissionGranted.value) {
                requestPermissions()
                return
            }
            TrackingService.start(context)
            scope.launch { preferencesManager.setTracking(true) }
            isTracking = true
        }
    }

    fun createDevice() {
        if (newDeviceName.isBlank()) return
        scope.launch {
            try {
                val token = preferencesManager.token.first() ?: return@launch
                val device = ApiClient.service.createDevice("Bearer $token", com.rastreador.app.api.DeviceRequest(newDeviceName))
                preferencesManager.saveDeviceId(device.id)
                newDeviceName = ""
                loadDevices()
            } catch (_: Exception) {}
        }
    }

    // Check tracking state on start
    LaunchedEffect(Unit) {
        isTracking = preferencesManager.isTracking.first()
        loadDevices()
        loadLatestLocation()
        unsyncedCount = dao.countUnsynced()
    }

    LaunchedEffect(latestLocFlow.value) {
        val loc = latestLocFlow.value
        if (loc != null) {
            unsyncedCount = dao.countUnsynced()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Rastreador") },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.Logout, contentDescription = "Sair")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.GpsFixed,
                            contentDescription = null,
                            tint = if (isTracking) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (isTracking) "Rastreamento Ativo" else "Rastreamento Inativo",
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    if (unsyncedCount > 0) {
                        Text(
                            "$unsyncedCount pendentes para sincronizar",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { toggleTracking() },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isTracking) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                        )
                    ) {
                        Text(if (isTracking) "Parar Rastreamento" else "Iniciar Rastreamento")
                    }
                    if (!locationPermissionGranted.value) {
                        Spacer(Modifier.height(8.dp))
                        TextButton(onClick = { requestPermissions() }) {
                            Text("Permitir localização", color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Latest Location
            if (latestLocation != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Última Localização", style = MaterialTheme.typography.titleSmall)
                        Spacer(Modifier.height(4.dp))
                        Text("Lat: ${String.format("%.6f", latestLocation!!.lat)}")
                        Text("Lng: ${String.format("%.6f", latestLocation!!.lng)}")
                        latestLocation!!.accuracy?.let {
                            Text("Precisão: ${String.format("%.0f", it)}m")
                        }
                        latestLocation!!.speed?.let {
                            Text("Velocidade: ${String.format("%.1f", it * 3.6)} km/h")
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }

            // Devices
            Text("Dispositivos", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))

            if (devices.isEmpty()) {
                Text(
                    "Nenhum dispositivo cadastrado",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall
                )
            } else {
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(devices) { device ->
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Text(
                                device.name,
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.bodyLarge
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Add device
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = newDeviceName,
                    onValueChange = { newDeviceName = it },
                    label = { Text("Novo dispositivo") },
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                Spacer(Modifier.width(8.dp))
                IconButton(onClick = { createDevice() }) {
                    Icon(Icons.Default.Add, contentDescription = "Adicionar")
                }
            }
        }
    }
}
