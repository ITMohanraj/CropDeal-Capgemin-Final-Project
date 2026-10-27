package com.cropdeal.priceservice.dto;

public class SyncStatusResponse {

    private String lastSuccessfulSyncAt;
    private String syncStatus;
    private int recordsFetched;
    private int recordsInserted;
    private int recordsUpdated;
    private String lastError;

    public SyncStatusResponse() {}

    public SyncStatusResponse(String lastSuccessfulSyncAt, String syncStatus, int recordsFetched, int recordsInserted, int recordsUpdated, String lastError) {
        this.lastSuccessfulSyncAt = lastSuccessfulSyncAt;
        this.syncStatus = syncStatus;
        this.recordsFetched = recordsFetched;
        this.recordsInserted = recordsInserted;
        this.recordsUpdated = recordsUpdated;
        this.lastError = lastError;
    }

    public String getLastSuccessfulSyncAt() { return lastSuccessfulSyncAt; }
    public void setLastSuccessfulSyncAt(String lastSuccessfulSyncAt) { this.lastSuccessfulSyncAt = lastSuccessfulSyncAt; }

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
}
