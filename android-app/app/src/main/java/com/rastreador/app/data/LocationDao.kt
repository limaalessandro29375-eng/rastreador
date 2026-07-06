package com.rastreador.app.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface LocationDao {
    @Insert
    suspend fun insert(location: LocationEntity): Long

    @Insert
    suspend fun insertAll(locations: List<LocationEntity>)

    @Query("SELECT * FROM locations WHERE synced = 0 ORDER BY timestamp ASC")
    suspend fun getUnsynced(): List<LocationEntity>

    @Query("UPDATE locations SET synced = 1, serverId = :serverId WHERE id = :id")
    suspend fun markSynced(id: Long, serverId: String)

    @Query("UPDATE locations SET synced = 1, serverId = :serverId WHERE id IN (:ids)")
    suspend fun markBatchSynced(ids: List<Long>, serverId: String = "batch")

    @Query("SELECT * FROM locations ORDER BY timestamp DESC LIMIT 1")
    fun getLatestFlow(): Flow<LocationEntity?>

    @Query("SELECT * FROM locations ORDER BY timestamp DESC LIMIT 1")
    suspend fun getLatest(): LocationEntity?

    @Query("SELECT COUNT(*) FROM locations WHERE synced = 0")
    suspend fun countUnsynced(): Int

    @Query("DELETE FROM locations WHERE synced = 1")
    suspend fun deleteSynced()

    @Query("SELECT * FROM locations ORDER BY timestamp ASC")
    fun getAllFlow(): Flow<List<LocationEntity>>
}
