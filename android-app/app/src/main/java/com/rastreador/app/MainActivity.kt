package com.rastreador.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.rastreador.app.data.PreferencesManager
import com.rastreador.app.ui.screens.LoginScreen
import com.rastreador.app.ui.screens.MainScreen
import com.rastreador.app.ui.theme.RastreadorTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val preferencesManager = PreferencesManager(this)

        val hasToken = runBlocking {
            preferencesManager.token.first() != null
        }

        setContent {
            RastreadorTheme {
                var isLoggedIn by remember { mutableStateOf(hasToken) }

                if (isLoggedIn) {
                    MainScreen(
                        preferencesManager = preferencesManager,
                        onLogout = {
                            runBlocking { preferencesManager.clear() }
                            isLoggedIn = false
                        }
                    )
                } else {
                    LoginScreen(
                        preferencesManager = preferencesManager,
                        onLoginSuccess = { isLoggedIn = true }
                    )
                }
            }
        }
    }
}
