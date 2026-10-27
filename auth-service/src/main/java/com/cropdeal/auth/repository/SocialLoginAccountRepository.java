package com.cropdeal.auth.repository;

import com.cropdeal.auth.entity.SocialLoginAccount;
import com.cropdeal.auth.enums.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SocialLoginAccountRepository extends JpaRepository<SocialLoginAccount, Long> {

    Optional<SocialLoginAccount> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);

    Optional<SocialLoginAccount> findByCropDealUserIdAndProvider(Long cropDealUserId, AuthProvider provider);

    List<SocialLoginAccount> findAllByCropDealUserId(Long cropDealUserId);

    boolean existsByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
