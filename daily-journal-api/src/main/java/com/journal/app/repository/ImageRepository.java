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

    // Initial page - All
    List<Image> findByUserIdAndStatusAndDeletedAtIsNullOrderByTakenAtDescIdDesc(
            String userId, Pageable pageable);

    // Initial page - Favorites only
    List<Image> findByUserIdAndStatusAndIsFavoriteTrueAndDeletedAtIsNullOrderByTakenAtDescIdDesc(
            String userId, Pageable pageable);

    // Keyset pagination - All
    @Query("""
        SELECT i FROM Image i
        WHERE i.userId = :userId
          AND i.status = 'ready'
          AND i.deletedAt IS NULL
          AND (i.takenAt < :cursorTakenAt OR (i.takenAt = :cursorTakenAt AND i.id < :cursorId))
        ORDER BY i.takenAt DESC, i.id DESC
    """)
    List<Image> findNextPage(
            @Param("userId") String userId,
            @Param("cursorTakenAt") Instant cursorTakenAt,
            @Param("cursorId") UUID cursorId,
            Pageable pageable
    );

    // Keyset pagination - Favorites only
    @Query("""
        SELECT i FROM Image i
        WHERE i.userId = :userId
          AND i.status = 'ready'
          AND i.isFavorite = true
          AND i.deletedAt IS NULL
          AND (i.takenAt < :cursorTakenAt OR (i.takenAt = :cursorTakenAt AND i.id < :cursorId))
        ORDER BY i.takenAt DESC, i.id DESC
    """)
    List<Image> findNextPageFavorites(
            @Param("userId") String userId,
            @Param("cursorTakenAt") Instant cursorTakenAt,
            @Param("cursorId") UUID cursorId,
            Pageable pageable
    );

    // Find stale pending images
    List<Image> findByStatusAndCreatedAtBefore(String status, Instant cutoff);
}
