package com.cropdeal.priceservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "price_sync_metadata")
public class PriceSyncMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime lastSuccessfulSyncAt;

    @Column(nullable = false, length = 50)
    private String syncStatus;

    private int recordsFetched;
    private int recordsInserted;
    private int recordsUpdated;

    @Column(length = 1000)
    private String lastError;

    private LocalDateTime lastAttemptAt;

    public PriceSyncMetadata() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getLastSuccessfulSyncAt() { return lastSuccessfulSyncAt; }
    public void setLastSuccessfulSyncAt(LocalDateTime lastSuccessfulSyncAt) { this.lastSuccessfulSyncAt = lastSuccessfulSyncAt; }

    public String getSyncStatus() { return syncStatus; }
    public void setSyncStatus(String syncStatus) { this.syncStatus = syncStatus; }

    public int getRecordsFetched() { return recordsFetched; }
    public void setRecordsFetched(int recordsFetched) { this.recordsFetched = recordsFetched; }

    public int getRecordsInserted() { return recordsInserted; }
    public void setRecordsInserted(int recordsInserted) { this.recordsInserted = recordsInserted; }

    public int getRecordsUpdated() { return recordsUpdated; }
    public void setRecordsUpdated(int recordsUpdated) { this.recordsUpdated = recordsUpdated; }

    public String getLastError() { return lastError; }
    public void setLastError(String lastError) { this.lastError = lastError; }

    public LocalDateTime getLastAttemptAt() { return lastAttemptAt; }
    public void setLastAttemptAt(LocalDateTime lastAttemptAt) { this.lastAttemptAt = lastAttemptAt; }
}
