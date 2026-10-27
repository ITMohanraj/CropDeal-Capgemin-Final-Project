package com.cropdeal.priceservice.dto;

import java.time.LocalDate;

public class PriceRecommendationResponse {

    private String commodity;
    private Double recommendedPricePerKg;
    private Double minPricePerKg;
    private Double maxPricePerKg;
    private String currency = "INR";
    private String unit = "kg";
    private String sourceMarket;
    private String sourceDistrict;
    private String sourceState;
    private LocalDate sourceArrivalDate;
    private String matchType; // "SAME_DISTRICT", "NEAREST_MARKET", "REGIONAL_ESTIMATE", "NO_DATA"
    private String matchTypeLabel;
    private Double distanceKm;
    private boolean fallback;
    private String message;
    private String confidence; // "HIGH", "MEDIUM", "LOW", "NONE"

    public PriceRecommendationResponse() {
    }

    public static PriceRecommendationResponse noData(String commodity, String message) {
        PriceRecommendationResponse res = new PriceRecommendationResponse();
        res.setCommodity(commodity);
        res.setRecommendedPricePerKg(null);
        res.setMinPricePerKg(null);
        res.setMaxPricePerKg(null);
        res.setMatchType("NO_DATA");
        res.setMatchTypeLabel("No Reliable Price Available");
        res.setFallback(true);
        res.setConfidence("NONE");
        res.setMessage(message != null ? message : "No official government mandi price found for " + commodity);
        return res;
    }

    public String getCommodity() {
        return commodity;
    }

    public void setCommodity(String commodity) {
        this.commodity = commodity;
    }

    public Double getRecommendedPricePerKg() {
        return recommendedPricePerKg;
    }

    public void setRecommendedPricePerKg(Double recommendedPricePerKg) {
        this.recommendedPricePerKg = recommendedPricePerKg;
    }

    public Double getMinPricePerKg() {
        return minPricePerKg;
    }

    public void setMinPricePerKg(Double minPricePerKg) {
        this.minPricePerKg = minPricePerKg;
    }

    public Double getMaxPricePerKg() {
        return maxPricePerKg;
    }

    public void setMaxPricePerKg(Double maxPricePerKg) {
        this.maxPricePerKg = maxPricePerKg;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public String getSourceMarket() {
        return sourceMarket;
    }

    public void setSourceMarket(String sourceMarket) {
        this.sourceMarket = sourceMarket;
    }

    public String getSourceDistrict() {
        return sourceDistrict;
    }

    public void setSourceDistrict(String sourceDistrict) {
        this.sourceDistrict = sourceDistrict;
    }

    public String getSourceState() {
        return sourceState;
    }

    public void setSourceState(String sourceState) {
        this.sourceState = sourceState;
    }

    public LocalDate getSourceArrivalDate() {
        return sourceArrivalDate;
    }

    public void setSourceArrivalDate(LocalDate sourceArrivalDate) {
        this.sourceArrivalDate = sourceArrivalDate;
    }

    public String getMatchType() {
        return matchType;
    }

    public void setMatchType(String matchType) {
        this.matchType = matchType;
    }

    public String getMatchTypeLabel() {
        return matchTypeLabel;
    }

    public void setMatchTypeLabel(String matchTypeLabel) {
        this.matchTypeLabel = matchTypeLabel;
    }

    public Double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(Double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public boolean isFallback() {
        return fallback;
    }

    public void setFallback(boolean fallback) {
        this.fallback = fallback;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }
}
