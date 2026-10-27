package com.cropdeal.priceservice.repository;

import com.cropdeal.priceservice.entity.PriceSyncMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PriceSyncMetadataRepository extends JpaRepository<PriceSyncMetadata, Long> {
    Optional<PriceSyncMetadata> findTopByOrderByIdDesc();
    Optional<PriceSyncMetadata> findTopBySyncStatusOrderByIdDesc(String syncStatus);
}
