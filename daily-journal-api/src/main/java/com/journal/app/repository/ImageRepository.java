package com.journal.app.repository;

import com.journal.app.entity.Image;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ImageRepository extends JpaRepository<Image, UUID> {

    // Duplicate check
    Optional<Image> findFirstByUserIdAndChecksumSha256AndDeletedAtIsNull(String userId, String checksumSha256);

    // Find active by id
    Optional<Image> findByIdAndUserIdAndDeletedAtIsNull(UUID id, String userId);

    // Initial page query (no cursor)
    @Query("""
        SELECT i FROM Image i
        WHERE i.userId = :userId
          AND i.status = 'ready'
          AND i.deletedAt IS NULL
          AND (:favorite IS NULL OR i.isFavorite = :favorite)
          AND (:fromDate IS NULL OR i.takenAt >= :fromDate)
          AND (:toDate IS NULL OR i.takenAt <= :toDate)
        ORDER BY i.takenAt DESC, i.id DESC
    """)
    List<Image> findInitialPage(
            @Param("userId") String userId,
            @Param("favorite") Boolean favorite,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable
    );

    // Keyset pagination query using cursor (cursorTakenAt and cursorId)
    @Query("""
        SELECT i FROM Image i
        WHERE i.userId = :userId
          AND i.status = 'ready'
          AND i.deletedAt IS NULL
          AND (:favorite IS NULL OR i.isFavorite = :favorite)
          AND (:fromDate IS NULL OR i.takenAt >= :fromDate)
          AND (:toDate IS NULL OR i.takenAt <= :toDate)
          AND (i.takenAt < :cursorTakenAt OR (i.takenAt = :cursorTakenAt AND i.id < :cursorId))
        ORDER BY i.takenAt DESC, i.id DESC
    """)
    List<Image> findNextPage(
            @Param("userId") String userId,
            @Param("cursorTakenAt") Instant cursorTakenAt,
            @Param("cursorId") UUID cursorId,
            @Param("favorite") Boolean favorite,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable
    );

    // Find stale pending images (e.g. > 1 hour old)
    List<Image> findByStatusAndCreatedAtBefore(String status, Instant cutoff);
}
