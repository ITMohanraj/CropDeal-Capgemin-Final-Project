package com.cropdeal.wallet.service;

import com.cropdeal.wallet.dto.*;
import com.cropdeal.wallet.entity.*;
import com.cropdeal.wallet.exception.InsufficientWalletBalanceException;
import com.cropdeal.wallet.exception.ResourceNotFoundException;
import com.cropdeal.wallet.repository.WalletRepository;
import com.cropdeal.wallet.repository.WalletReservationRepository;
import com.cropdeal.wallet.repository.WalletTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@Transactional
public class WalletServiceImpl implements WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;
    private final WalletReservationRepository reservationRepository;

    public WalletServiceImpl(WalletRepository walletRepository,
                             WalletTransactionRepository transactionRepository,
                             WalletReservationRepository reservationRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.reservationRepository = reservationRepository;
    }

    @Override
    public WalletResponse getWallet(Long userId) {
        Wallet wallet = getOrCreateWallet(userId);
        reconcileReservedBalance(wallet);
        return toResponse(wallet);
    }

    private void reconcileReservedBalance(Wallet wallet) {
        List<WalletReservation> active = reservationRepository.findAllByUserIdAndStatus(wallet.getUserId(), ReservationStatus.ACTIVE);
        java.util.Set<String> seenRefs = new java.util.HashSet<>();
        BigDecimal actualReserved = BigDecimal.ZERO;
        boolean modified = false;

        for (WalletReservation r : active) {
            if (r.getReferenceId() != null && seenRefs.contains(r.getReferenceId())) {
                r.setStatus(ReservationStatus.RELEASED);
                reservationRepository.save(r);
                modified = true;
            } else {
                if (r.getReferenceId() != null) {
                    seenRefs.add(r.getReferenceId());
                }
                actualReserved = actualReserved.add(r.getAmount());
            }
        }

        if (wallet.getReservedBalance().compareTo(actualReserved) != 0 || modified) {
            wallet.setReservedBalance(actualReserved);
            walletRepository.save(wallet);
        }
    }

    @Override
    public WalletResponse creditWallet(CreditWalletRequest request) {
        Wallet wallet = getOrCreateWallet(request.userId());
        wallet.setBalance(wallet.getBalance().add(request.amount()));
        Wallet saved = walletRepository.save(wallet);

        recordTransaction(wallet.getId(), request.userId(), request.amount(), TransactionType.CREDIT,
                "CREDIT-" + System.currentTimeMillis(), request.description() != null ? request.description() : "Wallet Top-up");

        return toResponse(saved);
    }

    @Override
    public WalletResponse debitWallet(Long userId, BigDecimal amount, String description) {
        Wallet wallet = getOrCreateWallet(userId);
        if (wallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new InsufficientWalletBalanceException("Insufficient available funds for debit: available ₹" + wallet.getAvailableBalance());
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        Wallet saved = walletRepository.save(wallet);

        recordTransaction(wallet.getId(), userId, amount, TransactionType.DEBIT,
                "DEBIT-" + System.currentTimeMillis(), description != null ? description : "Wallet Debit");

        return toResponse(saved);
    }

    @Override
    public WalletResponse reserveFunds(ReserveFundsRequest request) {
        Wallet wallet = getOrCreateWallet(request.userId());

        List<WalletReservation> existingActive = reservationRepository
                .findAllByUserIdAndReferenceIdAndStatus(request.userId(), request.referenceId(), ReservationStatus.ACTIVE);

        if (!existingActive.isEmpty()) {
            WalletReservation primary = existingActive.get(0);
            for (int i = 1; i < existingActive.size(); i++) {
                WalletReservation duplicate = existingActive.get(i);
                duplicate.setStatus(ReservationStatus.RELEASED);
                reservationRepository.save(duplicate);
            }

            if (primary.getAmount().compareTo(request.amount()) == 0) {
                // Idempotent: already reserved exact amount
                return toResponse(wallet);
            }

            BigDecimal diff = request.amount().subtract(primary.getAmount());
            if (diff.compareTo(BigDecimal.ZERO) > 0) {
                if (wallet.getAvailableBalance().compareTo(diff) < 0) {
                    throw new InsufficientWalletBalanceException("Insufficient available balance to increase bid. Available: ₹"
                            + wallet.getAvailableBalance() + ", Required additional: ₹" + diff);
                }
                wallet.setReservedBalance(wallet.getReservedBalance().add(diff));
            } else if (diff.compareTo(BigDecimal.ZERO) < 0) {
                wallet.setReservedBalance(wallet.getReservedBalance().subtract(diff.abs()));
            }

            primary.setAmount(request.amount());
            reservationRepository.save(primary);
            Wallet saved = walletRepository.save(wallet);

            if (diff.compareTo(BigDecimal.ZERO) > 0) {
                recordTransaction(wallet.getId(), request.userId(), diff, TransactionType.RESERVATION,
                        request.referenceId(), "Additional reserve for bid " + request.referenceId());
            }
            return toResponse(saved);
        }

        if (wallet.getAvailableBalance().compareTo(request.amount()) < 0) {
            throw new InsufficientWalletBalanceException("Insufficient available balance to place bid. Available: ₹"
                    + wallet.getAvailableBalance() + ", Required: ₹" + request.amount());
        }

        wallet.setReservedBalance(wallet.getReservedBalance().add(request.amount()));
        Wallet saved = walletRepository.save(wallet);

        WalletReservation reservation = new WalletReservation();
        reservation.setWalletId(wallet.getId());
        reservation.setUserId(request.userId());
        reservation.setReferenceId(request.referenceId());
        reservation.setAmount(request.amount());
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservationRepository.save(reservation);

        recordTransaction(wallet.getId(), request.userId(), request.amount(), TransactionType.RESERVATION,
                request.referenceId(), "Reserved for bid " + request.referenceId());

        return toResponse(saved);
    }

    @Override
    public WalletResponse releaseFunds(ReleaseFundsRequest request) {
        Wallet wallet = getOrCreateWallet(request.userId());
        List<WalletReservation> reservations = reservationRepository
                .findAllByUserIdAndReferenceIdAndStatus(request.userId(), request.referenceId(), ReservationStatus.ACTIVE);

        if (!reservations.isEmpty()) {
            BigDecimal totalReleased = BigDecimal.ZERO;
            for (WalletReservation r : reservations) {
                r.setStatus(ReservationStatus.RELEASED);
                reservationRepository.save(r);
                totalReleased = totalReleased.add(r.getAmount());
            }

            wallet.setReservedBalance(wallet.getReservedBalance().subtract(totalReleased));
            if (wallet.getReservedBalance().compareTo(BigDecimal.ZERO) < 0) {
                wallet.setReservedBalance(BigDecimal.ZERO);
            }
            Wallet saved = walletRepository.save(wallet);

            recordTransaction(wallet.getId(), request.userId(), totalReleased, TransactionType.RELEASE,
                    request.referenceId(), "Released outbid funds for " + request.referenceId());
            return toResponse(saved);
        }
        return toResponse(wallet);
    }

    @Override
    public WalletResponse consumeFunds(ConsumeFundsRequest request) {
        Wallet wallet = getOrCreateWallet(request.userId());
        List<WalletReservation> reservations = reservationRepository
                .findAllByUserIdAndReferenceIdAndStatus(request.userId(), request.referenceId(), ReservationStatus.ACTIVE);

        if (reservations.isEmpty()) {
            throw new ResourceNotFoundException("Active reservation not found for " + request.referenceId());
        }

        WalletReservation primary = reservations.get(0);
        primary.setStatus(ReservationStatus.CONSUMED);
        reservationRepository.save(primary);

        BigDecimal duplicateAmounts = BigDecimal.ZERO;
        for (int i = 1; i < reservations.size(); i++) {
            WalletReservation dup = reservations.get(i);
            dup.setStatus(ReservationStatus.RELEASED);
            reservationRepository.save(dup);
            duplicateAmounts = duplicateAmounts.add(dup.getAmount());
        }

        BigDecimal totalToUnreserve = primary.getAmount().add(duplicateAmounts);
        wallet.setReservedBalance(wallet.getReservedBalance().subtract(totalToUnreserve));
        if (wallet.getReservedBalance().compareTo(BigDecimal.ZERO) < 0) {
            wallet.setReservedBalance(BigDecimal.ZERO);
        }
        wallet.setBalance(wallet.getBalance().subtract(primary.getAmount()));
        Wallet saved = walletRepository.save(wallet);

        recordTransaction(wallet.getId(), request.userId(), primary.getAmount(), TransactionType.PAYMENT,
                request.referenceId(), "Payment consumed for won bid " + request.referenceId());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> getTransactions(Long userId) {
        return transactionRepository.findByUserIdOrderByTransactionTimeDesc(userId).stream()
                .map(t -> new WalletTransactionResponse(
                        t.getId(), t.getUserId(), t.getAmount(), t.getType(),
                        t.getReferenceId(), t.getDescription(), t.getTransactionTime()
                ))
                .toList();
    }

    private Wallet getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            Wallet newWallet = new Wallet();
            newWallet.setUserId(userId);
            newWallet.setUserRole("DEALER");
            newWallet.setBalance(BigDecimal.ZERO);
            newWallet.setReservedBalance(BigDecimal.ZERO);
            return walletRepository.save(newWallet);
        });
    }

    private void recordTransaction(Long walletId, Long userId, BigDecimal amount,
                                   TransactionType type, String refId, String desc) {
        WalletTransaction txn = new WalletTransaction();
        txn.setWalletId(walletId);
        txn.setUserId(userId);
        txn.setAmount(amount);
        txn.setType(type);
        txn.setReferenceId(refId);
        txn.setDescription(desc);
        transactionRepository.save(txn);
    }

    private WalletResponse toResponse(Wallet w) {
        return new WalletResponse(
                w.getId(),
                w.getUserId(),
                w.getUserRole(),
                w.getBalance(),
                w.getReservedBalance(),
                w.getAvailableBalance()
        );
    }
}