package com.cropdeal.priceservice.service;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class CropAliasRegistry {

    private static final Map<String, List<String>> ALIASES = new HashMap<>();

    static {
        register(List.of("wheat", "gehun", "kanak", "sharbati wheat"), List.of("Wheat", "Sharbati Wheat"));
        register(List.of("rice", "paddy", "chawal", "dhan", "basmati", "basmati rice"),
                List.of("Paddy (Rice)", "Paddy(Common)", "Paddy(Basmati)", "Basmati Rice", "Rice", "Broken Rice"));
        register(List.of("tomato", "tomatoes", "tamatar"), List.of("Tomato"));
        register(List.of("onion", "onions", "pyaz", "kanda"), List.of("Onion"));
        register(List.of("potato", "potatoes", "aloo", "alu"), List.of("Potato"));
        register(List.of("maize", "corn", "makka", "bhutta", "baby corn"), List.of("Maize", "Baby Corn"));
        register(List.of("cotton", "kapas"), List.of("Cotton"));
        register(List.of("groundnut", "peanut", "peanuts", "moongphali"), List.of("Groundnut"));
        register(List.of("mustard", "sarson", "rai"), List.of("Mustard"));
        register(List.of("soybean", "soya", "soyabean"), List.of("Soybean"));
        register(List.of("banana", "bananas", "kela"), List.of("Banana", "Banana - Green"));
        register(List.of("apple", "apples", "seb"), List.of("Apple"));
        register(List.of("turmeric", "haldi"), List.of("Turmeric"));
        register(List.of("green chilli", "hari mirch", "chilli green"), List.of("Green Chilli", "Chilli Green", "Red Chilli"));
        register(List.of("red chilli", "dry chilli", "lal mirch", "chilli red"), List.of("Red Chilli", "Chilli Red"));
        register(List.of("chilli", "chili", "chillies", "chilies", "mirch"), List.of("Green Chilli", "Red Chilli", "Chilli Green", "Chilli Red"));
        register(List.of("chana", "bengal gram", "gram", "chickpea", "kala chana"),
                List.of("Bengal Gram (Chana)", "Bengal Gram(Gram)(Whole)", "Bengal Gram Dal(Chana Dal)", "Gram Raw(Chhana)"));
        register(List.of("moong", "green gram", "mung"), List.of("Moong (Green Gram)", "Moong(Green)", "Moong Dal(Green Gram Dal)"));
        register(List.of("urad", "black gram"), List.of("Urad (Black Gram)", "Black Gram(Urd Beans)(Whole)", "Black Gram Dal(Urd Dal)"));
        register(List.of("toor", "arhar", "red gram", "pigeon pea", "tuver"), List.of("Toor / Arhar (Red Gram)", "Arhar (Tur-Red Gram)", "Arhar Dal(Tur Dal)"));
        register(List.of("sugarcane", "ganna"), List.of("Sugarcane"));
        register(List.of("coconut", "nariyal", "copra"), List.of("Coconut"));
        register(List.of("ginger", "adrak"), List.of("Ginger(Green)", "Ginger"));
        register(List.of("garlic", "lahsun"), List.of("Garlic"));
        register(List.of("watermelon", "water melon", "tarbuj"), List.of("Water Melon", "Watermelon"));
        register(List.of("pomegranate", "anar"), List.of("Pomegranate"));
        register(List.of("papaya", "papita"), List.of("Papaya"));
        register(List.of("guava", "amrood"), List.of("Guava"));
        register(List.of("cabbage", "patta gobhi"), List.of("Cabbage"));
        register(List.of("cauliflower", "phool gobhi"), List.of("Cauliflower"));
        register(List.of("carrot", "carrots", "gajar"), List.of("Carrot"));
        register(List.of("brinjal", "eggplant", "baingan", "aubergine"), List.of("Brinjal"));
        register(List.of("cucumber", "kheera"), List.of("Cucumbar(Kheera)"));
        register(List.of("bottle gourd", "lauki", "doodhi"), List.of("Bottle gourd", "Bottle Gourd"));
        register(List.of("pumpkin", "kaddu"), List.of("Pumpkin"));
        register(List.of("ridge gourd", "tori", "turai"), List.of("Ridgeguard(Tori)"));
        register(List.of("sweet lime", "mosambi", "mousambi"), List.of("Mousambi(Sweet Lime)"));
        register(List.of("lemon", "nimbu"), List.of("Lemon"));
        register(List.of("beetroot", "chukandar"), List.of("Beetroot"));
        register(List.of("spinach", "palak"), List.of("Spinach"));
        register(List.of("barley", "jau"), List.of("Barley", "Barley(Jau)"));
        register(List.of("bajra", "pearl millet"), List.of("Bajra (Pearl Millet)", "Bajra(Pearl Millet/Cumbu)"));
        register(List.of("jowar", "sorghum"), List.of("Jowar (Sorghum)", "Jowar(Sorghum)"));
        register(List.of("ragi", "finger millet"), List.of("Ragi (Finger Millet)"));
        register(List.of("coriander", "dhania"), List.of("Coriander (Dhania)", "Coriander(Leaves)"));
        register(List.of("cumin", "jeera"), List.of("Cumin (Jeera)", "Cummin Seed(Jeera)"));
        register(List.of("black pepper", "kali mirch"), List.of("Black Pepper"));
        register(List.of("cardamom", "elaichi"), List.of("Cardamom"));
        register(List.of("mango", "aam"), List.of("Mango"));
        register(List.of("orange", "santre", "kinnow"), List.of("Orange", "Kinnow"));
        register(List.of("grapes", "angoor"), List.of("Grapes"));
        register(List.of("pea", "peas", "matar"), List.of("Green Peas", "Field Pea", "Peas cod"));
    }

    private static void register(List<String> keys, List<String> targets) {
        for (String key : keys) {
            ALIASES.put(key.toLowerCase(), targets);
        }
    }

    public List<String> getCandidates(String input) {
        if (input == null || input.isBlank()) {
            return Collections.emptyList();
        }
        String clean = input.trim().toLowerCase();

        // Direct alias check
        if (ALIASES.containsKey(clean)) {
            return ALIASES.get(clean);
        }

        // Substring / partial alias check
        for (Map.Entry<String, List<String>> entry : ALIASES.entrySet()) {
            if (clean.contains(entry.getKey()) || entry.getKey().contains(clean)) {
                return entry.getValue();
            }
        }

        // Title case default
        String capitalized = Character.toUpperCase(clean.charAt(0)) + (clean.length() > 1 ? clean.substring(1) : "");
        List<String> result = new ArrayList<>();
        result.add(capitalized);
        if (!capitalized.equalsIgnoreCase(input.trim())) {
            result.add(input.trim());
        }
        return result;
    }
}
