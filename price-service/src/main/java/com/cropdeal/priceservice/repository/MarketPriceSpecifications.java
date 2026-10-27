package com.cropdeal.priceservice.repository;

import com.cropdeal.priceservice.entity.MarketPrice;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class MarketPriceSpecifications {

    public static Specification<MarketPrice> withFilters(
            String state,
            String district,
            String market,
            String commodity,
            LocalDate arrivalDate,
            String search) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (state != null && !state.isBlank() && !state.equalsIgnoreCase("All States") && !state.equalsIgnoreCase("All")) {
                predicates.add(cb.equal(cb.lower(cb.trim(root.get("state"))), state.trim().toLowerCase()));
            }

            if (district != null && !district.isBlank() && !district.equalsIgnoreCase("All Districts") && !district.equalsIgnoreCase("All")) {
                predicates.add(cb.equal(cb.lower(cb.trim(root.get("district"))), district.trim().toLowerCase()));
            }

            if (market != null && !market.isBlank() && !market.equalsIgnoreCase("All Markets") && !market.equalsIgnoreCase("All")) {
                predicates.add(cb.equal(cb.lower(cb.trim(root.get("market"))), market.trim().toLowerCase()));
            }

            if (commodity != null && !commodity.isBlank() && !commodity.equalsIgnoreCase("All Commodities") && !commodity.equalsIgnoreCase("All")) {
                predicates.add(cb.equal(cb.lower(cb.trim(root.get("commodity"))), commodity.trim().toLowerCase()));
            }

            if (arrivalDate != null) {
                predicates.add(cb.equal(root.get("arrivalDate"), arrivalDate));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate searchPred = cb.or(
                        cb.like(cb.lower(root.get("commodity")), pattern),
                        cb.like(cb.lower(root.get("market")), pattern),
                        cb.like(cb.lower(root.get("district")), pattern),
                        cb.like(cb.lower(root.get("state")), pattern),
                        cb.like(cb.lower(root.get("variety")), pattern)
                );
                predicates.add(searchPred);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
