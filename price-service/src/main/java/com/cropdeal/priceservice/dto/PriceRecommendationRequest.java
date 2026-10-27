package com.cropdeal.priceservice.dto;

import jakarta.validation.constraints.NotBlank;

public class PriceRecommendationRequest {

    @NotBlank(message = "Crop or commodity name is required")
    private String commodity;

    private String state;
    private String district;
    private String market;
    private String location;
    private Double latitude;
    private Double longitude;
    private String variety;
    private String grade;

    public PriceRecommendationRequest() {
    }

    public PriceRecommendationRequest(String commodity, String state, String district, String market,
                                      String location, Double latitude, Double longitude,
                                      String variety, String grade) {
        this.commodity = commodity;
        this.state = state;
        this.district = district;
        this.market = market;
        this.location = location;
        this.latitude = latitude;
        this.longitude = longitude;
        this.variety = variety;
        this.grade = grade;
    }

    public String getCommodity() {
        return commodity;
    }

    public void setCommodity(String commodity) {
        this.commodity = commodity;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getMarket() {
        return market;
    }

    public void setMarket(String market) {
        this.market = market;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getVariety() {
        return variety;
    }

    public void setVariety(String variety) {
        this.variety = variety;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }
}
