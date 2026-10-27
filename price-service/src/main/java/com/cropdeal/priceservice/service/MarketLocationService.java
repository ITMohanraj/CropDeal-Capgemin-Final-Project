package com.cropdeal.priceservice.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MarketLocationService {

    public record GeoCoordinates(double latitude, double longitude) {}

    public record ParsedLocation(String state, String district, String marketHint) {}

    private static final List<String> KNOWN_STATES = List.of(
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Chattisgarh",
            "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Keralam",
            "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
            "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
            "Uttarakhand", "West Bengal", "Andaman and Nicobar", "Chandigarh", "Dadra and Nagar Haveli",
            "Daman and Diu", "Delhi", "NCT of Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Pondicherry", "Puducherry"
    );

    private static final Map<String, GeoCoordinates> GEO_MAP = new HashMap<>();

    static {
        // Haryana
        addGeo("Haryana", "Karnal", 29.6857, 76.9905);
        addGeo("Haryana", "Indri APMC", 29.8800, 77.0600);
        addGeo("Haryana", "Tarori APMC", 29.8000, 76.9700);
        addGeo("Haryana", "Panipat", 29.3909, 76.9635);
        addGeo("Haryana", "Kurukshetra", 29.9695, 76.8783);
        addGeo("Haryana", "Ambala", 30.3782, 76.7767);
        addGeo("Haryana", "Yamuna Nagar", 30.1290, 77.2674);
        addGeo("Haryana", "Jind", 29.3140, 76.3140);
        addGeo("Haryana", "Kaithal", 29.8015, 76.3996);
        addGeo("Haryana", "Hisar", 29.1492, 75.7217);
        addGeo("Haryana", "Hissar", 29.1492, 75.7217);
        addGeo("Haryana", "Rohtak", 28.8955, 76.6066);
        addGeo("Haryana", "Sonipat", 28.9931, 77.0151);
        addGeo("Haryana", "Sirsa", 29.5349, 75.0296);
        addGeo("Haryana", "Fatehabad", 29.5152, 75.4510);
        addGeo("Haryana", "Bhiwani", 28.7831, 76.1397);
        addGeo("Haryana", "Gurgaon", 28.4595, 77.0266);
        addGeo("Haryana", "Rewari", 28.1833, 76.6167);
        addGeo("Haryana", null, 29.0588, 76.0856);

        // Punjab
        addGeo("Punjab", "Ludhiana", 30.9010, 75.8573);
        addGeo("Punjab", "Khanna Mandi", 30.7071, 76.2168);
        addGeo("Punjab", "Khanna", 30.7071, 76.2168);
        addGeo("Punjab", "Amritsar", 31.6340, 74.8723);
        addGeo("Punjab", "Jalandhar", 31.3260, 75.5762);
        addGeo("Punjab", "Patiala", 30.3398, 76.3869);
        addGeo("Punjab", "Bathinda", 30.2110, 74.9455);
        addGeo("Punjab", "Moga", 30.8230, 75.1734);
        addGeo("Punjab", "Sangrur", 30.2458, 75.8421);
        addGeo("Punjab", "Hoshiarpur", 31.5273, 75.9149);
        addGeo("Punjab", "Gurdaspur", 32.0419, 75.4053);
        addGeo("Punjab", "Firozepur", 30.9237, 74.6138);
        addGeo("Punjab", "Kapurthala", 31.3800, 75.3800);
        addGeo("Punjab", null, 31.1471, 75.3412);

        // Uttarakhand
        addGeo("Uttarakhand", "Haridwar", 29.9457, 78.1642);
        addGeo("Uttarakhand", "Lakshar APMC", 29.7500, 78.0300);
        addGeo("Uttarakhand", "Dehradun", 30.3165, 78.0322);
        addGeo("Uttarakhand", "Udham Singh Nagar", 28.9700, 79.4000);
        addGeo("Uttarakhand", "Kashipur", 29.2100, 78.9600);
        addGeo("Uttarakhand", "Nainital", 29.3919, 79.4542);
        addGeo("Uttarakhand", null, 30.0668, 79.0193);

        // Tamil Nadu
        addGeo("Tamil Nadu", "Erode", 11.3410, 77.7172);
        addGeo("Tamil Nadu", "Erode Mandi", 11.3410, 77.7172);
        addGeo("Tamil Nadu", "Coimbatore", 11.0168, 76.9558);
        addGeo("Tamil Nadu", "Salem", 11.6643, 78.1460);
        addGeo("Tamil Nadu", "Chennai", 13.0827, 80.2707);
        addGeo("Tamil Nadu", "Koyambedu", 13.0694, 80.1948);
        addGeo("Tamil Nadu", "Madurai", 9.9252, 78.1198);
        addGeo("Tamil Nadu", "Tiruchirappalli", 10.7905, 78.7047);
        addGeo("Tamil Nadu", "Trichy Yard", 10.7905, 78.7047);
        addGeo("Tamil Nadu", "Namakkal", 11.2189, 78.1674);
        addGeo("Tamil Nadu", "Dindigul", 10.3673, 77.9803);
        addGeo("Tamil Nadu", "Tirupur", 11.1085, 77.3411);
        addGeo("Tamil Nadu", "Thanjavur", 10.7870, 79.1378);
        addGeo("Tamil Nadu", "Tirunelveli", 8.7139, 77.7567);
        addGeo("Tamil Nadu", "Vellore", 12.9165, 79.1325);
        addGeo("Tamil Nadu", "Villupuram", 11.9401, 79.4861);
        addGeo("Tamil Nadu", "Cuddalore", 11.7480, 79.7714);
        addGeo("Tamil Nadu", "Dharmapuri", 12.1211, 78.1582);
        addGeo("Tamil Nadu", "Krishnagiri", 12.5186, 78.2137);
        addGeo("Tamil Nadu", "Pollachi", 10.6609, 77.0048);
        addGeo("Tamil Nadu", null, 11.1271, 78.6569);

        // Rajasthan
        addGeo("Rajasthan", "Jaipur", 26.9124, 75.7873);
        addGeo("Rajasthan", "Jodhpur", 26.2389, 73.0243);
        addGeo("Rajasthan", "Bikaner", 28.0229, 73.3119);
        addGeo("Rajasthan", "Tonk", 26.1664, 75.7885);
        addGeo("Rajasthan", "Pali", 25.7711, 73.3234);
        addGeo("Rajasthan", "Bharatpur", 27.2152, 77.5030);
        addGeo("Rajasthan", "Kota", 25.2138, 75.8648);
        addGeo("Rajasthan", "Alwar", 27.5530, 76.6346);
        addGeo("Rajasthan", "Ajmer", 26.4499, 74.6399);
        addGeo("Rajasthan", "Udaipur", 24.5854, 73.7125);
        addGeo("Rajasthan", "Ganganagar", 29.9038, 73.8772);
        addGeo("Rajasthan", "Hanumangarh", 29.5815, 74.3294);
        addGeo("Rajasthan", "Chittorgarh", 24.8887, 74.6269);
        addGeo("Rajasthan", null, 27.0238, 74.2179);

        // Madhya Pradesh
        addGeo("Madhya Pradesh", "Indore", 22.7196, 75.8577);
        addGeo("Madhya Pradesh", "Bhopal", 23.2599, 77.4126);
        addGeo("Madhya Pradesh", "Sehore", 23.2031, 77.0844);
        addGeo("Madhya Pradesh", "Dhar", 22.5978, 75.2974);
        addGeo("Madhya Pradesh", "Mandsaur", 24.0722, 75.0688);
        addGeo("Madhya Pradesh", "Neemuch", 24.4764, 74.8724);
        addGeo("Madhya Pradesh", "Balaghat", 21.8129, 80.1838);
        addGeo("Madhya Pradesh", "Rewa", 24.5362, 81.3037);
        addGeo("Madhya Pradesh", "Sagar", 23.8388, 78.7378);
        addGeo("Madhya Pradesh", "Ujjain", 23.1765, 75.7885);
        addGeo("Madhya Pradesh", "Jabalpur", 23.1815, 79.9864);
        addGeo("Madhya Pradesh", "Gwalior", 26.2183, 78.1828);
        addGeo("Madhya Pradesh", "Dewas", 22.9676, 76.0534);
        addGeo("Madhya Pradesh", "Hoshangabad", 22.7500, 77.7200);
        addGeo("Madhya Pradesh", "Narmadapuram", 22.7500, 77.7200);
        addGeo("Madhya Pradesh", "Shehdol", 23.2900, 81.3500);
        addGeo("Madhya Pradesh", "Alirajpur", 22.3000, 74.3500);
        addGeo("Madhya Pradesh", "Umariya", 23.5200, 80.8300);
        addGeo("Madhya Pradesh", null, 22.9734, 78.6569);

        // Maharashtra
        addGeo("Maharashtra", "Pune", 18.5204, 73.8567);
        addGeo("Maharashtra", "Nashik", 19.9975, 73.7898);
        addGeo("Maharashtra", "Mumbai", 19.0760, 72.8777);
        addGeo("Maharashtra", "Nagpur", 21.1458, 79.0882);
        addGeo("Maharashtra", "Solapur", 17.6599, 75.9064);
        addGeo("Maharashtra", "Latur", 18.4088, 76.5604);
        addGeo("Maharashtra", "Ahmednagar", 19.0952, 74.7496);
        addGeo("Maharashtra", "Kolhapur", 16.7050, 74.2433);
        addGeo("Maharashtra", "Satara", 17.6805, 73.9997);
        addGeo("Maharashtra", "Sangli", 16.8524, 74.5815);
        addGeo("Maharashtra", "Jalgaon", 21.0077, 75.5626);
        addGeo("Maharashtra", "Dhule", 20.9042, 74.7749);
        addGeo("Maharashtra", "Akola", 20.7002, 77.0082);
        addGeo("Maharashtra", "Amravati", 20.9374, 77.7796);
        addGeo("Maharashtra", "Aurangabad", 19.8762, 75.3433);
        addGeo("Maharashtra", "Chhatrapati Sambhajinagar", 19.8762, 75.3433);
        addGeo("Maharashtra", "Buldhana", 20.5300, 76.1800);
        addGeo("Maharashtra", "Hingoli", 19.7200, 77.1500);
        addGeo("Maharashtra", "Dharashiv", 18.1800, 76.0400);
        addGeo("Maharashtra", null, 19.7515, 75.7139);

        // Gujarat
        addGeo("Gujarat", "Ahmedabad", 23.0225, 72.5714);
        addGeo("Gujarat", "Surat", 21.1702, 72.8311);
        addGeo("Gujarat", "Rajkot", 22.3039, 70.8022);
        addGeo("Gujarat", "Gondal", 21.9619, 70.7989);
        addGeo("Gujarat", "Vadodara", 22.3072, 73.1812);
        addGeo("Gujarat", "Gandhinagar", 23.2156, 72.6369);
        addGeo("Gujarat", "Bhavnagar", 21.7645, 72.1519);
        addGeo("Gujarat", "Junagadh", 21.5222, 70.4579);
        addGeo("Gujarat", "Amreli", 21.6032, 71.2221);
        addGeo("Gujarat", "Mehsana", 23.5880, 72.3693);
        addGeo("Gujarat", "Patan", 23.8493, 72.1266);
        addGeo("Gujarat", "Sabarkantha", 23.6000, 72.9700);
        addGeo("Gujarat", "Banaskantha", 24.1724, 72.4346);
        addGeo("Gujarat", null, 22.2587, 71.1924);

        // Karnataka
        addGeo("Karnataka", "Bangalore", 12.9716, 77.5946);
        addGeo("Karnataka", "Bengaluru", 12.9716, 77.5946);
        addGeo("Karnataka", "Kolar", 13.1367, 78.1291);
        addGeo("Karnataka", "Belgaum", 15.8497, 74.4977);
        addGeo("Karnataka", "Belagavi", 15.8497, 74.4977);
        addGeo("Karnataka", "Mysore", 12.2958, 76.6394);
        addGeo("Karnataka", "Mysuru", 12.2958, 76.6394);
        addGeo("Karnataka", "Tumkur", 13.3409, 77.1010);
        addGeo("Karnataka", "Shimoga", 13.9299, 75.5681);
        addGeo("Karnataka", "Shivamogga", 13.9299, 75.5681);
        addGeo("Karnataka", "Hubli", 15.3647, 75.1240);
        addGeo("Karnataka", "Dharwad", 15.4589, 75.0078);
        addGeo("Karnataka", "Gulbarga", 17.3297, 76.8343);
        addGeo("Karnataka", "Kalaburagi", 17.3297, 76.8343);
        addGeo("Karnataka", "Koppal", 15.3500, 76.1500);
        addGeo("Karnataka", "Chikmagalur", 13.3161, 75.7720);
        addGeo("Karnataka", "Hassan", 13.0072, 76.1029);
        addGeo("Karnataka", "Davangere", 14.4644, 75.9218);
        addGeo("Karnataka", null, 15.3173, 75.7139);

        // Uttar Pradesh
        addGeo("Uttar Pradesh", "Lucknow", 26.8467, 80.9462);
        addGeo("Uttar Pradesh", "Agra", 27.1767, 78.0081);
        addGeo("Uttar Pradesh", "Kanpur", 26.4499, 80.3319);
        addGeo("Uttar Pradesh", "Meerut", 28.9845, 77.7064);
        addGeo("Uttar Pradesh", "Varanasi", 25.3176, 82.9739);
        addGeo("Uttar Pradesh", "Prayagraj", 25.4358, 81.8463);
        addGeo("Uttar Pradesh", "Allahabad", 25.4358, 81.8463);
        addGeo("Uttar Pradesh", "Bareilly", 28.3670, 79.4304);
        addGeo("Uttar Pradesh", "Aligarh", 27.8974, 78.0880);
        addGeo("Uttar Pradesh", "Moradabad", 28.8386, 78.7733);
        addGeo("Uttar Pradesh", "Saharanpur", 29.9640, 77.5460);
        addGeo("Uttar Pradesh", "Gorakhpur", 26.7606, 83.3732);
        addGeo("Uttar Pradesh", "Mathura", 27.4924, 77.6737);
        addGeo("Uttar Pradesh", null, 26.8467, 80.9462);

        // Andhra Pradesh & Telangana
        addGeo("Andhra Pradesh", "Guntur", 16.3067, 80.4365);
        addGeo("Andhra Pradesh", "Kurnool", 15.8281, 78.0373);
        addGeo("Andhra Pradesh", "Vijayawada", 16.5062, 80.6480);
        addGeo("Andhra Pradesh", "Visakhapatnam", 17.6868, 83.2185);
        addGeo("Andhra Pradesh", "Anantapur", 14.6819, 77.6006);
        addGeo("Andhra Pradesh", "Tirupati", 13.6288, 79.4192);
        addGeo("Andhra Pradesh", null, 15.9129, 79.7400);

        addGeo("Telangana", "Hyderabad", 17.3850, 78.4867);
        addGeo("Telangana", "Warangal", 17.9689, 79.5941);
        addGeo("Telangana", "Nizamabad", 18.6725, 78.0941);
        addGeo("Telangana", "Karimnagar", 18.4386, 79.1288);
        addGeo("Telangana", "Khammam", 17.2473, 80.1514);
        addGeo("Telangana", null, 18.1124, 79.0193);

        // Kerala
        addGeo("Kerala", "Kochi", 9.9312, 76.2673);
        addGeo("Kerala", "Ernakulam", 9.9816, 76.2999);
        addGeo("Kerala", "Kottayam", 9.5916, 76.5222);
        addGeo("Kerala", "Wayanad", 11.6854, 76.1320);
        addGeo("Kerala", "Idukki", 9.8494, 76.9720);
        addGeo("Kerala", "Palakkad", 10.7867, 76.6548);
        addGeo("Kerala", "Thrissur", 10.5276, 76.2144);
        addGeo("Kerala", "Kozhikode", 11.2588, 75.7804);
        addGeo("Kerala", "Thiruvananthapuram", 8.5241, 76.9366);
        addGeo("Kerala", null, 10.8505, 76.2711);

        // Bihar & West Bengal
        addGeo("Bihar", "Patna", 25.5941, 85.1376);
        addGeo("Bihar", "Muzaffarpur", 26.1209, 85.3647);
        addGeo("Bihar", "Gaya", 24.7914, 85.0002);
        addGeo("Bihar", "Bhagalpur", 25.2425, 86.9842);
        addGeo("Bihar", null, 25.0961, 85.3131);

        addGeo("West Bengal", "Kolkata", 22.5726, 88.3639);
        addGeo("West Bengal", "Siliguri", 26.7271, 88.3953);
        addGeo("West Bengal", "Burdwan", 23.2324, 87.8615);
        addGeo("West Bengal", "Murshidabad", 24.1759, 88.2802);
        addGeo("West Bengal", null, 22.9868, 87.8550);

        // Delhi
        addGeo("Delhi", "Delhi", 28.7041, 77.1025);
        addGeo("NCT of Delhi", "Delhi", 28.7041, 77.1025);
        addGeo("NCT of Delhi", null, 28.7041, 77.1025);
    }

    private static void addGeo(String state, String districtOrMarket, double lat, double lon) {
        String key = buildGeoKey(state, districtOrMarket);
        GEO_MAP.put(key, new GeoCoordinates(lat, lon));
    }

    private static String buildGeoKey(String state, String sub) {
        String cleanState = state != null ? state.trim().toLowerCase().replaceAll("[^a-z0-9]", "") : "";
        String cleanSub = sub != null ? sub.trim().toLowerCase().replaceAll("[^a-z0-9]", "") : "";
        return cleanState + "::" + cleanSub;
    }

    /**
     * Parses free-text or composite location into state, district, and market hints.
     */
    public ParsedLocation parseLocation(String inputState, String inputDistrict, String rawLocation) {
        String cleanState = inputState != null && !inputState.isBlank() ? inputState.trim() : null;
        String cleanDistrict = inputDistrict != null && !inputDistrict.isBlank() ? inputDistrict.trim() : null;
        String marketHint = null;

        if (rawLocation != null && !rawLocation.isBlank()) {
            String trimmed = rawLocation.trim();
            // Split by comma
            String[] parts = trimmed.split("[,\\-;/]+");
            for (int i = 0; i < parts.length; i++) {
                parts[i] = parts[i].trim();
            }

            // Check if state is in rawLocation
            if (cleanState == null) {
                for (String p : parts) {
                    for (String ks : KNOWN_STATES) {
                        if (p.equalsIgnoreCase(ks) || p.toLowerCase().contains(ks.toLowerCase())) {
                            cleanState = ks;
                            break;
                        }
                    }
                    if (cleanState != null) break;
                }
            }

            // Identify district and market from parts
            if (parts.length >= 2) {
                if (cleanDistrict == null) {
                    // Try second-to-last or first part
                    for (int i = parts.length - 1; i >= 0; i--) {
                        String cand = parts[i];
                        if (cleanState != null && cand.equalsIgnoreCase(cleanState)) {
                            continue;
                        }
                        if (cand.toLowerCase().contains("mandi") || cand.toLowerCase().contains("apmc") || cand.toLowerCase().contains("yard")) {
                            if (marketHint == null) marketHint = cand;
                        } else if (cleanDistrict == null) {
                            cleanDistrict = cand;
                        }
                    }
                }
                if (marketHint == null && parts.length > 0) {
                    marketHint = parts[0];
                }
            } else if (parts.length == 1) {
                if (cleanDistrict == null && (cleanState == null || !parts[0].equalsIgnoreCase(cleanState))) {
                    cleanDistrict = parts[0].replaceAll("(?i)\\b(mandi|apmc|yard|market)\\b", "").trim();
                    marketHint = parts[0];
                }
            }
        }

        // Clean up any remaining words in district like "Mandi"
        if (cleanDistrict != null && cleanDistrict.matches("(?i).*\\b(mandi|apmc|market|yard)\\b.*")) {
            if (marketHint == null) {
                marketHint = cleanDistrict;
            }
            cleanDistrict = cleanDistrict.replaceAll("(?i)\\b(mandi|apmc|market|yard)\\b", "").trim();
        }

        return new ParsedLocation(cleanState, cleanDistrict, marketHint);
    }

    /**
     * Resolves coordinates for a given state, district, or market.
     */
    public Optional<GeoCoordinates> getCoordinates(String state, String district, String market) {
        // 1. Try market specific key
        if (state != null && market != null) {
            GeoCoordinates coord = GEO_MAP.get(buildGeoKey(state, market));
            if (coord != null) return Optional.of(coord);
        }

        // 2. Try district specific key
        if (state != null && district != null) {
            GeoCoordinates coord = GEO_MAP.get(buildGeoKey(state, district));
            if (coord != null) return Optional.of(coord);
        }

        // 3. Try district only (across any state)
        if (district != null) {
            String cleanDist = district.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
            for (Map.Entry<String, GeoCoordinates> entry : GEO_MAP.entrySet()) {
                if (entry.getKey().endsWith("::" + cleanDist)) {
                    return Optional.of(entry.getValue());
                }
            }
        }

        // 4. Try state centroid
        if (state != null) {
            GeoCoordinates coord = GEO_MAP.get(buildGeoKey(state, ""));
            if (coord != null) return Optional.of(coord);
        }

        return Optional.empty();
    }

    /**
     * Computes great-circle distance between two GPS coordinates in kilometers.
     */
    public double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth's mean radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        return Math.round(distance * 10.0) / 10.0;
    }
}
